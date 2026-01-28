/**
 * Game Orchestrator API Route
 * Manages the poker game flow - starts hands, gets AI decisions, processes actions
 * 
 * Created: Jan 6, 2026
 * Updated: Jan 7, 2026 - Fixed winner determination + all-in showdown bugs
 * Updated: Jan 7, 2026 - Added comprehensive showdown logging for ALL player hands
 * Updated: Jan 9, 2026 - Fixed TypeScript error in all-in showdown excess return logic
 * Updated: Jan 14, 2026 - CRITICAL: Added on-chain game resolution when game completes
 *                        - Previously only updated Supabase, leaving on-chain game "Open"
 *                        - Now calls resolveOnChainGame() after marking game resolved
 * Updated: Jan 23, 2026 - CRITICAL FIX: Must call closeBetting() before resolveGame()
 *                        - V2 contract requires status transition: Open → Closed → Resolved
 *                        - Added closeOnChainBetting() call before resolveOnChainGame()
 * Updated: Jan 16, 2026 - Added x402 agent payments after hand resolution
 *                        - When ENABLE_X402_PAYMENTS=true, losers pay winner in USDC
 *                        - Uses Thirdweb Backend Wallets for each agent
 * Updated: Jan 26, 2026 - BUGFIX: Check on-chain status before calling closeBetting
 *                        - Session route closes betting after hand 2, orchestrator
 *                        - was trying to close again at game end, causing double-close error
 *                        - Now checks status and skips closeBetting if already Closed
 * Updated: Jan 26, 2026 - CRITICAL FIX: Added betting close check to startNewHand()
 *                        - Previously only session route closed betting, but orchestrator
 *                        - could start hands directly without going through session route
 *                        - Now checks and closes betting in both places
 * Purpose: Server-side game loop orchestration
 * 
 * FIX #1 (Jan 7): Added total_contributed tracking to fix side pot calculation.
 * Previously current_bet was reset each round, causing calculateSidePots to return
 * empty and winner to default to activePlayers[0]. Now we:
 * 1. Track total_contributed (cumulative) separately from current_bet (per-round)
 * 2. Use simple showdown logic when no side pots are needed
 * 
 * FIX #2 (Jan 7): Fixed all-in showdown detection
 * When only 1 active player remains vs all-in opponent(s):
 * - On preflop: if active bet >= max all-in, return excess and run out board
 * - On flop/turn/river: no point betting (no one can respond), skip to showdown
 * This prevents the bug where AI kept betting/folding against all-in opponents.
 * 
 * Endpoints:
 * - POST /api/game/orchestrator - Run one step of the game
 *   - action: 'start_hand' | 'next_action' | 'advance_round'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAgentDecision } from '@/lib/ai/agent-decision'
import { 
  createShuffledDeck, 
  dealHoleCards,
  dealFlop,
  dealTurn,
  dealRiver 
} from '@/lib/poker/deck'
import { getDeckForHand, createActionLogEntry, type ActionLogEntry } from '@/lib/poker/verifiable'
import { determineWinners, evaluateHand } from '@/lib/poker/hand-evaluator'
import type { DecisionContext, OpponentState, RecentAction } from '@/types/agents'
import type { Hand, HandAgent, Agent, AgentAction } from '@/types/database'
import type { CardNotation, Round } from '@/types/poker'
import { closeOnChainBetting, resolveOnChainGame, agentIdToContractIndex, isServerWalletConfigured, getOnChainGameStatus, OnChainGameStatus } from '@/lib/contracts/admin'
import '@/lib/agents'

const SMALL_BLIND = 10
const BIG_BLIND = 20
const STARTING_CHIPS = 1000
const BETTING_WINDOW_SECONDS = 20
const BETTING_CLOSES_AFTER_HAND = 2 // Must match session route - betting closes after hand 2

interface OrchestratorRequest {
  action: 'start_hand' | 'next_action' | 'advance_round' | 'auto_play'
  lobbyId?: string
  handId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OrchestratorRequest = await request.json()
    const supabase = createServiceClient()

    switch (body.action) {
      case 'start_hand':
        return await startNewHand(supabase, body.lobbyId)
      
      case 'next_action':
        return await processNextAction(supabase, body.handId)
      
      case 'advance_round':
        return await advanceRound(supabase, body.handId)
      
      case 'auto_play':
        return await autoPlayHand(supabase, body.lobbyId)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Orchestrator error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Start a new poker hand
 */
async function startNewHand(supabase: ReturnType<typeof createServiceClient>, lobbyId?: string) {
  // Get or create lobby
  type LobbyData = { id: string; name: string; status: string }
  let lobbyData: LobbyData | null = null
  
  if (lobbyId) {
    const result = await supabase.from('lobbies').select('*').eq('id', lobbyId).single()
    lobbyData = result.data as LobbyData | null
  } else {
    const result = await supabase.from('lobbies').select('*').eq('status', 'active').limit(1).single()
    lobbyData = result.data as LobbyData | null
  }

  if (!lobbyData) {
    return NextResponse.json({ error: 'No active lobby found' }, { status: 404 })
  }

  // Capture the lobby ID for use in queries
  const currentLobbyId = lobbyData.id

  // Get the current active game for this lobby (including salt for verifiable deck)
  const activeGameResult = await supabase
    .from('games')
    .select('id, game_number, status, current_hand_number, max_hands, salt_reveal, on_chain_game_id')
    .eq('lobby_id', currentLobbyId)
    .in('status', ['waiting', 'betting_open', 'betting_closed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  const activeGame = activeGameResult.data as { 
    id: string; 
    game_number: number; 
    status: string; 
    current_hand_number: number;
    max_hands: number;
    salt_reveal: string | null;
    on_chain_game_id: number | null;
  } | null
  
  // If no active game, return error - games must be created via /api/game/session
  if (!activeGame) {
    return NextResponse.json({ 
      error: 'No active game session. Create a new game first.',
      action: 'create_game'
    }, { status: 400 })
  }
  
  // Check if game has reached max hands
  const maxHands = activeGame.max_hands || 25
  if (activeGame.current_hand_number >= maxHands) {
    return NextResponse.json({ 
      error: `Game #${activeGame.game_number} has reached max hands (${maxHands})`,
      gameId: activeGame.id,
      action: 'game_complete'
    }, { status: 400 })
  }

  // Get all agents ordered by their FIXED seat_position
  // This ensures consistent ordering regardless of query execution
  const agentsResult = await supabase.from('agents').select('*').order('seat_position')
  const allAgents = agentsResult.data as (Agent & { seat_position: number })[] | null
  if (!allAgents || allAgents.length < 2) {
    return NextResponse.json({ error: 'Not enough agents' }, { status: 400 })
  }
  
  // Filter out bust agents (chip_count <= 0) - they can't participate
  const agents = allAgents.filter(a => (a.chip_count ?? STARTING_CHIPS) > 0)
  if (agents.length < 2) {
    return NextResponse.json({ 
      error: 'Not enough active agents (need at least 2 with chips)',
      eliminated: allAgents.filter(a => (a.chip_count ?? 0) <= 0).map(a => a.name)
    }, { status: 400 })
  }

  // Get previous hand info FOR THIS GAME (hand number and dealer position)
  // Hand numbers are PER-GAME (1-25), not global
  const lastHandResult = await supabase
    .from('hands')
    .select('hand_number, dealer_position')
    .eq('game_id', activeGame.id)
    .order('hand_number', { ascending: false })
    .limit(1)
    .single()
  
  const lastHand = lastHandResult.data as { hand_number: number; dealer_position: number } | null

  // Hand number within THIS game (1-25)
  const handNumber = (lastHand?.hand_number || 0) + 1
  
  // Double-check we haven't exceeded max hands
  if (handNumber > maxHands) {
    return NextResponse.json({ 
      error: `Game #${activeGame.game_number} complete - reached ${maxHands} hands`,
      gameId: activeGame.id,
      action: 'game_complete'
    }, { status: 400 })
  }
  
  console.log(`[Game #${activeGame.game_number}] Starting hand ${handNumber}/${maxHands}`)
  
  // Get active seat positions (seats with non-bust agents)
  const activeSeatPositions = agents.map(a => (a as Agent & { seat_position: number }).seat_position ?? 0).sort((a, b) => a - b)
  
  // Find next dealer position (rotating among ACTIVE seats only)
  // dealer_position stores the SEAT number (0-3), not array index
  let dealerSeatPosition: number
  if (lastHand) {
    const lastDealerSeat = lastHand.dealer_position
    // Find the next active seat after the last dealer
    const nextSeats = activeSeatPositions.filter(s => s > lastDealerSeat)
    const wrapSeats = activeSeatPositions.filter(s => s <= lastDealerSeat)
    // Prefer next higher seat, wrap around if needed
    dealerSeatPosition = nextSeats.length > 0 ? nextSeats[0] : wrapSeats[0]
  } else {
    // First hand - dealer is the first active seat
    dealerSeatPosition = activeSeatPositions[0]
  }
  
  // Find the index within the filtered agents array for this dealer seat
  const dealerIndex = agents.findIndex(a => (a as Agent & { seat_position: number }).seat_position === dealerSeatPosition)

  // Create deck - use seeded shuffle if game has salt_reveal (verifiable game)
  // Otherwise fall back to random shuffle (for backwards compatibility)
  const deck = activeGame?.salt_reveal 
    ? getDeckForHand(activeGame.salt_reveal, handNumber)
    : createShuffledDeck()
  
  if (activeGame?.salt_reveal) {
    console.log(`[Hand #${handNumber}] Using verifiable seeded deck (commitment: ${activeGame.salt_reveal.slice(0, 8)}...)`)
  }
  
  const [holeCards, afterHoleCards] = dealHoleCards(deck, agents.length)
  const [flopCards, afterFlop] = dealFlop(afterHoleCards)
  const [turnCard, afterTurn] = dealTurn(afterFlop)
  const [riverCard] = dealRiver(afterTurn)
  
  // Pre-generate all community cards (will be revealed progressively)
  const allCommunityCards = [...flopCards, turnCard, riverCard]

  // Create the hand
  const bettingClosesAt = new Date(Date.now() + BETTING_WINDOW_SECONDS * 1000).toISOString()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  const handResult = await db
    .from('hands')
    .insert({
      lobby_id: currentLobbyId,
      game_id: activeGame?.id || null, // Link to current game session if active
      hand_number: handNumber,
      status: 'betting_open',
      pot_amount: SMALL_BLIND + BIG_BLIND,
      betting_closes_at: bettingClosesAt,
      // Store ALL community cards upfront (will be revealed based on round)
      community_cards: allCommunityCards,
      // Start at preflop - no community cards revealed yet
      current_round: 'preflop',
      // Track dealer position (SEAT number, not array index) for proper action order
      dealer_position: dealerSeatPosition,
    })
    .select()
    .single()

  const hand = handResult.data as Hand | null
  if (handResult.error || !hand) {
    console.error('Failed to create hand:', handResult.error)
    return NextResponse.json({ error: 'Failed to create hand' }, { status: 500 })
  }

  // Update game's current_hand_number if linked to a game session
  if (activeGame?.id) {
    await db.from('games').update({ 
      current_hand_number: handNumber 
    }).eq('id', activeGame.id)
    
    // CRITICAL: Check if betting should close after this hand starts
    // Betting closes after BETTING_CLOSES_AFTER_HAND (e.g., after hand 2 completes, close before hand 3)
    if (handNumber > BETTING_CLOSES_AFTER_HAND && activeGame.status === 'betting_open') {
      // Update database status
      await db.from('games').update({
        status: 'betting_closed',
        betting_closed_at: new Date().toISOString(),
      }).eq('id', activeGame.id)
      
      console.log(`[Game #${activeGame.game_number}] Betting closed after hand ${BETTING_CLOSES_AFTER_HAND}`)
      
      // Close betting on-chain
      if (activeGame.on_chain_game_id !== null && isServerWalletConfigured()) {
        try {
          const onChainGameId = BigInt(activeGame.on_chain_game_id)
          const currentStatus = await getOnChainGameStatus(onChainGameId)
          
          if (currentStatus === OnChainGameStatus.BettingOpen) {
            await closeOnChainBetting(onChainGameId)
            console.log(`[Game #${activeGame.game_number}] On-chain betting closed`)
          } else {
            console.log(`[Game #${activeGame.game_number}] On-chain betting already closed (status: ${currentStatus})`)
          }
        } catch (err) {
          console.error('[Game] Failed to close on-chain betting:', err)
          // Non-fatal - continue with game
        }
      }
    }
  }

  // Create hand_agents with dealt cards
  // Blinds are relative to dealer's INDEX in the active agents array
  // - Small Blind = (dealerIndex + 1) % numPlayers
  // - Big Blind = (dealerIndex + 2) % numPlayers
  const numPlayers = agents.length
  const smallBlindIndex = (dealerIndex + 1) % numPlayers
  const bigBlindIndex = (dealerIndex + 2) % numPlayers
  
  // Update hand with SB/BB agent IDs for UI display
  await db.from('hands').update({
    small_blind_agent_id: agents[smallBlindIndex].id,
    big_blind_agent_id: agents[bigBlindIndex].id,
  }).eq('id', hand.id)
  
  const handAgentsData = agents.map((agent, index) => {
    const isSmallBlind = index === smallBlindIndex
    const isBigBlind = index === bigBlindIndex
    
    // Use persistent chip count from agents table
    // IMPORTANT: Use ?? (nullish coalescing) NOT || to avoid resetting 0 chips to STARTING_CHIPS
    const agentChipCount = (agent as Agent & { chip_count: number }).chip_count ?? STARTING_CHIPS
    const blindAmount = isSmallBlind ? SMALL_BLIND : isBigBlind ? BIG_BLIND : 0
    
    // Use the agent's FIXED seat_position from the database, not the array index
    // This ensures agents always appear in the same corner of the table
    const agentSeatPosition = (agent as Agent & { seat_position: number }).seat_position ?? index
    
    return {
      hand_id: hand.id,
      agent_id: agent.id,
      seat_position: agentSeatPosition,
      hole_cards: holeCards[index],
      chip_count: agentChipCount - blindAmount,
      current_bet: blindAmount,
      total_contributed: blindAmount, // Track cumulative contributions for side pot calculation
      is_folded: false,
      is_all_in: false,
    }
  })

  const insertResult = await db.from('hand_agents').insert(handAgentsData)

  if (insertResult.error) {
    console.error('Failed to create hand agents:', insertResult.error)
    return NextResponse.json({ error: 'Failed to create hand agents' }, { status: 500 })
  }

  // Record blind posts as actions so turn order logic works correctly
  // SB and BB are "forced bets" - they're recorded so we know BB option should apply
  const sbAgent = agents[smallBlindIndex]
  const bbAgent = agents[bigBlindIndex]
  const sbAgentId = sbAgent.id
  const bbAgentId = bbAgent.id
  
  await db.from('agent_actions').insert([
    {
      hand_id: hand.id,
      agent_id: sbAgentId,
      action_type: 'blind',
      amount: SMALL_BLIND,
      reasoning: 'Small blind posted',
      round: 'preflop',
    },
    {
      hand_id: hand.id,
      agent_id: bbAgentId,
      action_type: 'blind',
      amount: BIG_BLIND,
      reasoning: 'Big blind posted',
      round: 'preflop',
    },
  ])
  
  // Also log blinds to game's action_log for verifiable games
  if (activeGame?.id) {
    await appendToActionLog(supabase, activeGame.id, createActionLogEntry(
      handNumber, sbAgent.slug, 'blind', 'preflop', SMALL_BLIND
    ))
    await appendToActionLog(supabase, activeGame.id, createActionLogEntry(
      handNumber, bbAgent.slug, 'blind', 'preflop', BIG_BLIND
    ))
  }
  
  // Set UTG as the first active player (3 seats after dealer in clockwise order)
  const utgIndex = (dealerIndex + 3) % numPlayers
  const utgAgentId = agents[utgIndex].id
  await db.from('hands').update({ active_agent_id: utgAgentId }).eq('id', hand.id)
  
  // Get seat positions for logging
  const getSeat = (idx: number) => (agents[idx] as Agent & { seat_position: number }).seat_position
  console.log(`Hand #${handNumber} started. Dealer: seat ${dealerSeatPosition}, SB: seat ${getSeat(smallBlindIndex)}, BB: seat ${getSeat(bigBlindIndex)}, UTG: seat ${getSeat(utgIndex)}`)
  
  return NextResponse.json({
    success: true,
    handId: hand.id,
    handNumber,
    status: 'betting_open',
    bettingClosesAt,
    dealerPosition: dealerSeatPosition,
    message: `Hand #${handNumber} started. Betting window open for ${BETTING_WINDOW_SECONDS} seconds.`
  })
}

/**
 * Process the next AI agent action
 */
async function processNextAction(supabase: ReturnType<typeof createServiceClient>, handId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  if (!handId) {
    return NextResponse.json({ error: 'Hand ID required' }, { status: 400 })
  }

  // Get hand state
  const handResult = await supabase
    .from('hands')
    .select('*')
    .eq('id', handId)
    .single()

  const hand = handResult.data as Hand | null
  if (!hand) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 })
  }

  if (hand.status === 'resolved') {
    return NextResponse.json({ error: 'Hand already resolved' }, { status: 400 })
  }

  // Get hand agents
  const handAgentsResult = await supabase
    .from('hand_agents')
    .select('*, agents(*)')
    .eq('hand_id', handId)
    .order('seat_position')

  const handAgents = handAgentsResult.data as (HandAgent & { agents: Agent })[] | null
  if (!handAgents || handAgents.length === 0) {
    return NextResponse.json({ error: 'No agents in hand' }, { status: 400 })
  }

  // Get recent actions
  const recentActionsResult = await supabase
    .from('agent_actions')
    .select('*, agents(name)')
    .eq('hand_id', handId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  const recentActions = recentActionsResult.data as (AgentAction & { agents: { name: string } })[] | null

  // Get current round from database (tracks actual game progression)
  const communityCards = (hand.community_cards || []) as string[]
  const round: Round = (hand.current_round as Round) || 'preflop'

  // Check if hand should resolve
  const nonFoldedAgents = handAgents.filter(ha => !ha.is_folded)
  const allInAgents = handAgents.filter(ha => !ha.is_folded && ha.is_all_in)
  const activeAgents = handAgents.filter(ha => !ha.is_folded && !ha.is_all_in)
  
  // Hand resolves when:
  // 1. Only one non-folded player remains (everyone else folded)
  // 2. All remaining players are all-in (no one can bet)
  // 3. Only 1 active player vs all-in opponent(s) and active has matched/exceeded max all-in
  if (nonFoldedAgents.length <= 1) {
    // Only one player left - they win by default
    return await resolveHand(supabase, hand, handAgents as (HandAgent & { agents: Agent })[])
  }
  
  if (activeAgents.length === 0 && allInAgents.length >= 2) {
    // All remaining players are all-in - run out the board
    const currentRound = (hand.current_round as Round) || 'preflop'
    if (currentRound !== 'river') {
      return await runOutBoard(supabase, hand.id, handAgents as (HandAgent & { agents: Agent })[])
    }
    return await resolveHand(supabase, hand, handAgents as (HandAgent & { agents: Agent })[])
  }
  
  // NEW: Check for heads-up (or multi-way) all-in scenario
  // When only 1 active player remains and all opponents are all-in
  if (activeAgents.length === 1 && allInAgents.length >= 1) {
    const activePlayer = activeAgents[0]
    const round = (hand.current_round as Round) || 'preflop'
    const maxAllInBet = Math.max(...allInAgents.map(a => a.current_bet))
    
    // If active player has already bet >= max all-in, no more action needed
    // This happens when:
    // 1. Someone raised and opponent(s) went all-in for less
    // 2. Active player called an all-in and is now matched
    // 3. New round started and bets reset, but both are matched at 0
    if (activePlayer.current_bet >= maxAllInBet) {
      console.log(`[All-In Showdown] ${(activePlayer.agents as Agent)?.name} bet $${activePlayer.current_bet} vs all-in max $${maxAllInBet} - no action needed`)
      
      // Return excess chips to active player if they bet more than anyone can match
      const excess = activePlayer.current_bet - maxAllInBet
      if (excess > 0) {
        console.log(`[All-In Showdown] Returning $${excess} excess to ${(activePlayer.agents as Agent)?.name}`)
        
        // Update player's chips and current bet
        // Note: total_contributed may not exist on the type, so we use optional chaining with fallback
        const currentContributed = (activePlayer as unknown as { total_contributed?: number }).total_contributed ?? activePlayer.current_bet
        await db.from('hand_agents').update({
          chip_count: activePlayer.chip_count + excess,
          current_bet: maxAllInBet,
          total_contributed: currentContributed - excess
        }).eq('id', activePlayer.id)
        
        // Reduce pot by the excess
        await db.from('hands').update({
          pot_amount: hand.pot_amount - excess
        }).eq('id', hand.id)
        
        // Update local state for resolution
        activePlayer.chip_count += excess
        activePlayer.current_bet = maxAllInBet
        hand.pot_amount -= excess
      }
      
      // Run out board to showdown (or resolve if at river)
      if (round !== 'river') {
        return await runOutBoard(supabase, hand.id, handAgents as (HandAgent & { agents: Agent })[])
      }
      return await resolveHand(supabase, hand, handAgents as (HandAgent & { agents: Agent })[])
    }
    
    // Active player needs to call or fold (their bet < max all-in)
    // They get ONE action, then it's showdown
    // After they act, the next processNextAction call will hit the check above
    console.log(`[All-In Showdown] ${(activePlayer.agents as Agent)?.name} needs to call $${maxAllInBet - activePlayer.current_bet} or fold on ${round}`)
  }

  // Find the agent who needs to act based on position order
  // Only consider non-folded players for current bet calculation
  const activeBets = handAgents.filter(ha => !ha.is_folded).map(ha => ha.current_bet)
  const currentBet = activeBets.length > 0 ? Math.max(...activeBets) : 0
  const dealerPosition = hand.dealer_position ?? 0
  const agentToAct = findNextToAct(handAgents as (HandAgent & { agents: Agent })[], recentActions || [], round, currentBet, dealerPosition)

  if (!agentToAct) {
    // Everyone has acted and bets are matched - advance to next round
    // Clear active agent first
    await db.from('hands').update({ active_agent_id: null }).eq('id', handId)
    return await advanceRound(supabase, handId)
  }

  const agent = agentToAct.agents as Agent
  
  // Set this agent as the active player in the database for UI updates
  await db.from('hands').update({ active_agent_id: agent.id }).eq('id', handId)
  
  console.log(`[Hand ${hand.hand_number}] ${round}: ${agent.name} (seat ${agentToAct.seat_position}) to act. Current bet: $${currentBet}, their bet: $${agentToAct.current_bet}, to call: $${currentBet - agentToAct.current_bet}`)

  // Filter community cards based on round (cards are pre-dealt but revealed progressively)
  const visibleCardCount = 
    round === 'preflop' ? 0 :
    round === 'flop' ? 3 :
    round === 'turn' ? 4 :
    round === 'river' ? 5 : 0
  
  const visibleCommunityCards = communityCards.slice(0, visibleCardCount)

  // Build decision context
  const context: DecisionContext = {
    agentId: agent.id,
    holeCards: (agentToAct.hole_cards || []) as CardNotation[],
    chipCount: agentToAct.chip_count,
    currentBet: agentToAct.current_bet,
    communityCards: visibleCommunityCards as CardNotation[],
    pot: hand.pot_amount,
    betToCall: currentBet - agentToAct.current_bet,
    minRaise: currentBet + BIG_BLIND,
    round,
    position: getPosition(agentToAct.seat_position, handAgents.length),
    opponents: handAgents
      .filter(ha => ha.agent_id !== agent.id)
      .map(ha => ({
        name: (ha.agents as Agent)?.name || 'Unknown',
        chipCount: ha.chip_count,
        currentBet: ha.current_bet,
        isFolded: ha.is_folded,
        isAllIn: ha.is_all_in,
      })) as OpponentState[],
    recentActions: (recentActions || []).map(a => ({
      agentName: (a.agents as { name: string })?.name || 'Unknown',
      action: { type: a.action_type, amount: a.amount || undefined },
      timestamp: a.created_at,
    })) as RecentAction[],
  }

  // Get AI decision
  const decision = await getAgentDecision(context, agent.slug)
  
  console.log(`[Hand ${hand.hand_number}] ${agent.name} decides: ${decision.action.type}${decision.action.amount ? ` $${decision.action.amount}` : ''}`)

  // Apply the action
  const result = await applyAction(
    supabase,
    hand,
    agentToAct,
    decision.action,
    decision.internalThoughts,
    round,
    agent.slug // For action logging
  )
  
  console.log(`[Hand ${hand.hand_number}] After action - pot: $${result.newPot}, ${agent.name} chips: $${result.newChipCount}, bet: $${result.newCurrentBet}`)

  return NextResponse.json({
    success: true,
    agent: agent.name,
    action: decision.action.type,
    amount: decision.action.amount,
    reasoning: decision.internalThoughts,
    confidence: decision.confidence,
    ...result,
  })
}

/**
 * Find the next agent who needs to act
 * 
 * POKER TURN ORDER:
 * - Preflop: UTG (dealer+3) → Button (dealer) → SB (dealer+1) → BB (dealer+2)
 * - Post-flop: SB (dealer+1) → BB (dealer+2) → UTG (dealer+3) → Button (dealer)
 * 
 * IMPORTANT: After a raise, action continues CLOCKWISE from the raiser.
 * The round ends when we return to the last raiser and everyone has matched or folded.
 */
function findNextToAct(
  handAgents: (HandAgent & { agents: Agent })[],
  recentActions: AgentAction[],
  round: Round,
  currentBet: number,
  dealerPosition: number
): (HandAgent & { agents: Agent }) | null {
  const numPlayers = handAgents.length
  
  // Filter to voluntary actions only (exclude blinds since those are forced)
  const roundActions = recentActions.filter(a => 
    a.round === round && a.action_type !== 'blind'
  )
  
  // Get action history for this round in chronological order
  const chronologicalActions = [...roundActions].reverse() // Most recent first → chronological
  
  // Find the last aggressive action (raise or all-in) - this sets who needs to close the action
  const lastRaiseAction = roundActions.find(a => 
    a.action_type === 'raise' || a.action_type === 'all_in'
  )
  
  // Determine starting position for this round
  let roundStartPosition: number
  if (round === 'preflop') {
    roundStartPosition = (dealerPosition + 3) % numPlayers // UTG
  } else {
    roundStartPosition = (dealerPosition + 1) % numPlayers // SB
  }
  
  // Determine where to start looking for the next actor
  let searchStartPosition: number
  
  if (chronologicalActions.length === 0) {
    // No actions yet this round - start from round start position
    searchStartPosition = roundStartPosition
  } else {
    // Start from the player AFTER the last person who acted
    const lastAction = chronologicalActions[chronologicalActions.length - 1]
    const lastActorAgent = handAgents.find(ha => ha.agent_id === lastAction.agent_id)
    if (lastActorAgent) {
      searchStartPosition = (lastActorAgent.seat_position + 1) % numPlayers
    } else {
      searchStartPosition = roundStartPosition
    }
  }
  
  // Track who has acted since the last raise (or round start if no raise)
  const lastRaiseIndex = lastRaiseAction 
    ? chronologicalActions.findIndex(a => a.id === lastRaiseAction.id)
    : -1
  
  const actorsSinceRaise = new Set(
    lastRaiseIndex >= 0
      ? chronologicalActions.slice(lastRaiseIndex + 1).map(a => a.agent_id)
      : chronologicalActions.map(a => a.agent_id)
  )
  
  // Include the raiser themselves as having acted
  if (lastRaiseAction) {
    actorsSinceRaise.add(lastRaiseAction.agent_id)
  }
  
  // Find active (non-folded, non-all-in) players
  const activePlayers = handAgents.filter(ha => !ha.is_folded && !ha.is_all_in)
  
  if (activePlayers.length === 0) {
    return null // No one can act
  }
  
  // Loop through all positions starting from search position
  for (let i = 0; i < numPlayers; i++) {
    const seatPosition = (searchStartPosition + i) % numPlayers
    const ha = handAgents.find(h => h.seat_position === seatPosition)
    
    if (!ha || ha.is_folded || ha.is_all_in) continue
    
    const hasActedSinceRaise = actorsSinceRaise.has(ha.agent_id)
    const needsToMatch = ha.current_bet < currentBet
    
    // Player needs to act if:
    // 1. There's been a raise and they haven't acted since it, OR
    // 2. They need to match a bet (their current bet < table bet)
    if (needsToMatch || !hasActedSinceRaise) {
      return ha
    }
  }
  
  // Special case: Big blind "option" in preflop when no raise occurred
  // BB gets to check or raise if action came back to them with no raise
  if (round === 'preflop' && !lastRaiseAction && currentBet === BIG_BLIND) {
    const bbSeat = (dealerPosition + 2) % numPlayers
    const bbAgent = handAgents.find(h => h.seat_position === bbSeat)
    
    if (bbAgent && !bbAgent.is_folded && !bbAgent.is_all_in) {
      const bbActed = chronologicalActions.some(a => a.agent_id === bbAgent.agent_id)
      if (!bbActed) {
        return bbAgent // BB gets option
      }
    }
  }

  return null // Round is complete
}

/**
 * Get position description
 */
function getPosition(seatPosition: number, totalPlayers: number): DecisionContext['position'] {
  if (seatPosition === 0) return 'button'
  if (seatPosition === 1) return 'small_blind'
  if (seatPosition === 2) return 'big_blind'
  if (seatPosition <= totalPlayers / 3) return 'early'
  if (seatPosition <= (totalPlayers * 2) / 3) return 'middle'
  return 'late'
}

/**
 * Append an action to the game's action_log for verifiable games
 */
async function appendToActionLog(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string | null,
  entry: ActionLogEntry
) {
  if (!gameId) return // No game to log to
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  // Get current action_log
  const { data: game } = await db
    .from('games')
    .select('action_log')
    .eq('id', gameId)
    .single()
  
  const currentLog = (game?.action_log || []) as ActionLogEntry[]
  
  // Append new entry
  await db
    .from('games')
    .update({ action_log: [...currentLog, entry] })
    .eq('id', gameId)
}

/**
 * Apply an action to the game state
 */
async function applyAction(
  supabase: ReturnType<typeof createServiceClient>,
  hand: Hand,
  handAgent: HandAgent,
  action: { type: string; amount?: number },
  reasoning: string,
  round: Round,
  agentSlug?: string // For action logging
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  // Get the current highest bet in the hand (only from non-folded players)
  const betsResult = await db
    .from('hand_agents')
    .select('current_bet, is_folded')
    .eq('hand_id', hand.id)
  const allBets = (betsResult.data as { current_bet: number; is_folded: boolean }[] | null) || []
  const activeBets = allBets.filter(ha => !ha.is_folded).map(ha => ha.current_bet)
  const currentBetInHand = activeBets.length > 0 ? Math.max(0, ...activeBets) : 0
  const betToCall = currentBetInHand - handAgent.current_bet
  
  let newChipCount = handAgent.chip_count
  let newCurrentBet = handAgent.current_bet
  let newTotalContributed = (handAgent as HandAgent & { total_contributed: number }).total_contributed || 0
  let newPot = hand.pot_amount
  let isFolded = handAgent.is_folded
  let isAllIn = handAgent.is_all_in
  
  // Normalize action type - convert invalid calls to checks
  let normalizedAction = action.type
  if (action.type === 'call' && betToCall <= 0) {
    normalizedAction = 'check' // Can't call when there's nothing to call
  }
  if (action.type === 'check' && betToCall > 0) {
    normalizedAction = 'call' // Must call if there's a bet (or fold)
  }

  switch (normalizedAction) {
    case 'fold':
      isFolded = true
      break
    
    case 'check':
      // No change - only valid when betToCall is 0
      break
    
    case 'call': {
      // Call the exact amount needed to match current bet
      const callAmount = Math.min(betToCall, newChipCount)
      newChipCount -= callAmount
      newCurrentBet += callAmount
      newTotalContributed += callAmount // Track cumulative contribution
      newPot += callAmount
      if (newChipCount === 0) isAllIn = true
      break
    }
    
    case 'raise': {
      // Get all other players' maximum callable amounts
      const otherPlayersForRaise = await db
        .from('hand_agents')
        .select('chip_count, current_bet, is_folded, is_all_in, agent_id')
        .eq('hand_id', hand.id)
        .neq('agent_id', handAgent.agent_id)
      
      const otherPlayersRaise = (otherPlayersForRaise.data || []) as { 
        chip_count: number; current_bet: number; is_folded: boolean; is_all_in: boolean; agent_id: string 
      }[]
      
      // Find the maximum amount any other active player can match
      const activeOthersForRaise = otherPlayersRaise.filter(p => !p.is_folded)
      const maxCallableForRaise = activeOthersForRaise.map(p => 
        p.is_all_in ? p.current_bet : p.current_bet + p.chip_count
      )
      const maxEffectiveRaise = maxCallableForRaise.length > 0 ? Math.max(...maxCallableForRaise) : 0
      
      // Validate and apply raise
      // Minimum raise = current bet + at least the big blind (or previous raise size)
      const minRaiseTotal = currentBetInHand + BIG_BLIND
      let raiseTotal = action.amount || minRaiseTotal
      
      // Ensure raise is at least the minimum
      if (raiseTotal < minRaiseTotal) {
        raiseTotal = minRaiseTotal
      }
      
      // Can't raise more than you have
      const maxRaise = newChipCount + newCurrentBet
      if (raiseTotal > maxRaise) {
        raiseTotal = maxRaise
        isAllIn = true
      }
      
      // Cap at max effective bet (what others can match)
      if (raiseTotal > maxEffectiveRaise && maxEffectiveRaise > currentBetInHand) {
        const excessFromRaise = raiseTotal - maxEffectiveRaise
        raiseTotal = maxEffectiveRaise
        console.log(`[Raise Cap] Capped at $${raiseTotal}, $${excessFromRaise} kept`)
      }
      
      const additionalBet = raiseTotal - newCurrentBet
      newChipCount -= additionalBet
      newCurrentBet = raiseTotal
      newTotalContributed += additionalBet // Track cumulative contribution
      newPot += additionalBet
      if (newChipCount === 0) isAllIn = true
      break
    }
    
    case 'all_in': {
      // Get all other players' maximum callable amounts
      const otherPlayersResult = await db
        .from('hand_agents')
        .select('chip_count, current_bet, is_folded, is_all_in, agent_id')
        .eq('hand_id', hand.id)
        .neq('agent_id', handAgent.agent_id)
      
      const otherPlayers = (otherPlayersResult.data || []) as { 
        chip_count: number; current_bet: number; is_folded: boolean; is_all_in: boolean; agent_id: string 
      }[]
      
      // Find the maximum amount any other active player can match
      // This is either their current bet + remaining chips (if not all-in) or their current bet (if all-in)
      const activeOtherPlayers = otherPlayers.filter(p => !p.is_folded)
      const maxCallableAmounts = activeOtherPlayers.map(p => 
        p.is_all_in ? p.current_bet : p.current_bet + p.chip_count
      )
      const maxEffectiveBet = maxCallableAmounts.length > 0 ? Math.max(...maxCallableAmounts) : 0
      
      // Your all-in can't exceed what others can match
      // The effective bet is capped at the max callable amount
      const myPotentialTotal = newCurrentBet + newChipCount
      const effectiveTotal = Math.min(myPotentialTotal, Math.max(maxEffectiveBet, currentBetInHand))
      
      // Only the effective amount goes into the pot
      const amountToAdd = effectiveTotal - newCurrentBet
      const excessReturned = newChipCount - amountToAdd
      
      newCurrentBet = effectiveTotal
      newTotalContributed += amountToAdd // Track cumulative contribution
      newPot += amountToAdd
      newChipCount = excessReturned // Keep the excess
      isAllIn = true
      
      if (excessReturned > 0) {
        console.log(`[All-In Cap] Agent bet capped at $${effectiveTotal}, $${excessReturned} returned`)
      }
      break
    }
  }

  // Update hand agent
  await db
    .from('hand_agents')
    .update({
      chip_count: newChipCount,
      current_bet: newCurrentBet,
      total_contributed: newTotalContributed, // Track cumulative contribution for side pots
      is_folded: isFolded,
      is_all_in: isAllIn,
    })
    .eq('id', handAgent.id)

  // Update pot
  await db
    .from('hands')
    .update({ pot_amount: newPot })
    .eq('id', hand.id)

  // Calculate actual amount for action recording
  // For calls, record the betToCall amount
  // For raises/all-in, record the final bet amount
  let recordedAmount: number | null = null
  switch (action.type) {
    case 'call':
      recordedAmount = Math.min(betToCall, handAgent.chip_count) // The actual call amount
      break
    case 'raise':
    case 'all_in':
      recordedAmount = newCurrentBet // The final bet total
      break
    case 'blind':
      recordedAmount = action.amount || null
      break
    // fold and check have no amount
  }

  // Record action to agent_actions table
  await db
    .from('agent_actions')
    .insert({
      hand_id: hand.id,
      agent_id: handAgent.agent_id,
      action_type: action.type,
      amount: recordedAmount,
      reasoning,
      round,
    })

  // Also append to game's action_log for verifiable games
  if (agentSlug && (hand as Hand & { game_id: string | null }).game_id) {
    await appendToActionLog(
      db,
      (hand as Hand & { game_id: string | null }).game_id,
      createActionLogEntry(
        hand.hand_number,
        agentSlug,
        action.type,
        round,
        recordedAmount || undefined
      )
    )
  }

  return {
    newChipCount,
    newCurrentBet,
    newPot,
    isFolded,
    isAllIn,
  }
}

/**
 * Advance to the next betting round
 */
async function advanceRound(supabase: ReturnType<typeof createServiceClient>, handId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  if (!handId) {
    return NextResponse.json({ error: 'Hand ID required' }, { status: 400 })
  }

  const handResult = await db
    .from('hands')
    .select('*')
    .eq('id', handId)
    .single()

  const hand = handResult.data as Hand | null
  if (!hand) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 })
  }

  // Community cards are pre-dealt, we just need to reveal them based on round
  const communityCards = (hand.community_cards || []) as string[]
  
  // Get current round from database
  const currentRound = (hand.current_round as Round) || 'preflop'
  
  // Determine next round
  let newRound: Round
  let visibleCardCount: number
  
  if (currentRound === 'preflop') {
    newRound = 'flop'
    visibleCardCount = 3
  } else if (currentRound === 'flop') {
    newRound = 'turn'
    visibleCardCount = 4
  } else if (currentRound === 'turn') {
    newRound = 'river'
    visibleCardCount = 5
  } else {
    // Showdown
    const showdownAgentsResult = await db
      .from('hand_agents')
      .select('*, agents(*)')
      .eq('hand_id', handId)
    
    const showdownAgents = showdownAgentsResult.data as (HandAgent & { agents: Agent })[] | null
    return await resolveHand(supabase, hand, showdownAgents || [])
  }

  // Reset current bets for new round
  await db
    .from('hand_agents')
    .update({ current_bet: 0 })
    .eq('hand_id', handId)
    .eq('is_folded', false)

  // Update hand status and current round
  await db
    .from('hands')
    .update({ 
      status: 'playing',
      current_round: newRound 
    })
    .eq('id', handId)

  const newCards = communityCards.slice(
    currentRound === 'preflop' ? 0 : currentRound === 'flop' ? 3 : 4,
    visibleCardCount
  )
  
  console.log(`[Hand] Advanced from ${currentRound} to ${newRound}. Community: ${communityCards.slice(0, visibleCardCount).join(', ')}`)

  return NextResponse.json({
    success: true,
    round: newRound,
    newCards,
    communityCards: communityCards.slice(0, visibleCardCount),
    message: `Advanced to ${newRound}. Revealed: ${newCards.join(', ')}`
  })
}

/**
 * Run out the board when all players are all-in
 * This advances through flop, turn, river before resolving
 */
async function runOutBoard(
  supabase: ReturnType<typeof createServiceClient>,
  handId: string,
  handAgents: (HandAgent & { agents: Agent })[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  // Get hand
  const handResult = await db
    .from('hands')
    .select('*')
    .eq('id', handId)
    .single()
  
  const hand = handResult.data as Hand | null
  if (!hand) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 })
  }
  
  const currentRound = (hand.current_round as Round) || 'preflop'
  const communityCards = (hand.community_cards || []) as string[]
  
  // Determine next round
  let newRound: Round
  let visibleCardCount: number
  
  if (currentRound === 'preflop') {
    newRound = 'flop'
    visibleCardCount = 3
  } else if (currentRound === 'flop') {
    newRound = 'turn'
    visibleCardCount = 4
  } else if (currentRound === 'turn') {
    newRound = 'river'
    visibleCardCount = 5
  } else {
    // Already at river - resolve
    return await resolveHand(supabase, hand, handAgents)
  }
  
  // Update hand to new round
  await db
    .from('hands')
    .update({ 
      current_round: newRound,
      status: 'playing'
    })
    .eq('id', handId)
  
  const newCards = communityCards.slice(
    currentRound === 'preflop' ? 0 : currentRound === 'flop' ? 3 : 4,
    visibleCardCount
  )
  
  console.log(`[All-In] Running out board: ${currentRound} → ${newRound}. Cards: ${communityCards.slice(0, visibleCardCount).join(', ')}`)
  
  // Return response indicating we need to continue running out the board
  // The client will call again to get the next round
  return NextResponse.json({
    success: true,
    runningOut: true,
    round: newRound,
    newCards,
    communityCards: communityCards.slice(0, visibleCardCount),
    message: `All-in showdown: Dealing ${newRound}...`
  })
}

/**
 * Calculate side pots based on all-in amounts
 * Returns array of { amount, eligiblePlayerIds }
 * 
 * Uses total_contributed (cumulative across all rounds) instead of current_bet
 * (which resets each round) for accurate side pot calculation.
 */
function calculateSidePots(handAgents: (HandAgent & { agents: Agent })[]): { amount: number; eligiblePlayerIds: string[] }[] {
  const activePlayers = handAgents.filter(ha => !ha.is_folded)
  
  // Use total_contributed for accurate pot calculation (not current_bet which resets)
  type HandAgentWithContrib = HandAgent & { agents: Agent; total_contributed: number }
  const getContribution = (ha: HandAgent) => (ha as HandAgentWithContrib).total_contributed || 0
  
  // Get all unique contribution amounts (sorted ascending)
  const allContributions = activePlayers.map(getContribution).sort((a, b) => a - b)
  const uniqueContributions = [...new Set(allContributions)]
  
  const pots: { amount: number; eligiblePlayerIds: string[] }[] = []
  let previousLevel = 0
  
  for (const contribLevel of uniqueContributions) {
    const contribIncrement = contribLevel - previousLevel
    
    // Players who contributed at least this much are eligible
    const eligiblePlayers = activePlayers.filter(ha => getContribution(ha) >= contribLevel)
    
    // Each eligible player contributes the increment
    const potAmount = contribIncrement * eligiblePlayers.length
    
    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligiblePlayers.map(p => p.agent_id)
      })
    }
    
    previousLevel = contribLevel
  }
  
  return pots
}

/**
 * Resolve the hand and determine winner
 * Handles both simple cases (no side pots) and complex cases (side pots from all-ins)
 * 
 * FIX: Previously, when current_bet was reset to 0 after each round, calculateSidePots
 * would return empty and winner defaulted to first player. Now we:
 * 1. Use total_contributed for side pot calculation
 * 2. Add simple case fallback that directly compares hands
 */
async function resolveHand(
  supabase: ReturnType<typeof createServiceClient>,
  hand: Hand,
  handAgents: (HandAgent & { agents: Agent })[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  
  const activePlayers = handAgents.filter(ha => !ha.is_folded)
  const communityCards = (hand.community_cards || []) as CardNotation[]
  
  // Track winnings per player
  const winnings = new Map<string, number>()
  handAgents.forEach(ha => winnings.set(ha.agent_id, 0))
  
  let mainWinnerId: string
  let winningHand = 'Last player standing'

  if (activePlayers.length === 1) {
    // Only one player left - they win by default (everyone else folded)
    mainWinnerId = activePlayers[0].agent_id
    winnings.set(mainWinnerId, hand.pot_amount)
    console.log(`[Resolve] Single player remaining - ${(activePlayers[0].agents as Agent)?.name} wins by default`)
  } else {
    // Multiple players at showdown - need to compare hands
    
    // Check if we need side pots (different all-in contribution amounts)
    type HandAgentWithContrib = HandAgent & { agents: Agent; total_contributed: number }
    const getContribution = (ha: HandAgent) => (ha as HandAgentWithContrib).total_contributed || 0
    const uniqueContributions = new Set(activePlayers.map(getContribution))
    const hasAllIn = activePlayers.some(p => p.is_all_in)
    const needsSidePots = hasAllIn && uniqueContributions.size > 1
    
    // Build player hands for evaluation
    const playerHands = activePlayers.map(ha => ({
      playerId: ha.agent_id,
      holeCards: (ha.hole_cards || []) as CardNotation[]
    }))
    
    if (needsSidePots) {
      // COMPLEX CASE: Side pots needed due to different all-in amounts
      console.log(`[Resolve] Side pots needed - ${uniqueContributions.size} different contribution levels`)
      
      const pots = calculateSidePots(handAgents)
      
      // Evaluate each player's hand
      const evaluatedHands = playerHands.map(p => ({
        playerId: p.playerId,
        hand: evaluateHand(p.holeCards, communityCards)
      }))
      
      // Log ALL hands at showdown for debugging
      console.log(`[Showdown] Community: ${communityCards.join(', ')}`)
      console.log(`[Showdown] All hands:`)
      for (const e of evaluatedHands) {
        const agent = handAgents.find(ha => ha.agent_id === e.playerId)
        const name = (agent?.agents as Agent)?.name || 'Unknown'
        const holeCards = playerHands.find(p => p.playerId === e.playerId)?.holeCards || []
        console.log(`  ${name}: [${holeCards.join(', ')}] → ${e.hand.description} (cards: ${e.hand.cards.join(', ')})`)
      }
      
      // Award each pot to the best eligible hand
      for (const pot of pots) {
        const eligibleHands = evaluatedHands.filter(p => 
          pot.eligiblePlayerIds.includes(p.playerId)
        )
        
        if (eligibleHands.length === 0) continue
        
        const eligiblePlayerHands = eligibleHands.map(e => ({
          playerId: e.playerId,
          holeCards: activePlayers.find(a => a.agent_id === e.playerId)?.hole_cards as CardNotation[] || []
        }))
        
        const potWinners = determineWinners(eligiblePlayerHands, communityCards)
        
        if (potWinners.length === 0) continue
        
        const shareAmount = Math.floor(pot.amount / potWinners.length)
        const remainder = pot.amount % potWinners.length
        
        potWinners.forEach((winner, index) => {
          const currentWinnings = winnings.get(winner.playerId) || 0
          const extra = index === 0 ? remainder : 0
          winnings.set(winner.playerId, currentWinnings + shareAmount + extra)
        })
        
        console.log(`[Pot] $${pot.amount} → ${potWinners.map(w => {
          const agent = handAgents.find(ha => ha.agent_id === w.playerId)
          return (agent?.agents as Agent)?.name || 'Unknown'
        }).join(', ')} (${potWinners[0].hand.description})`)
      }
      
      // Main winner is whoever won the most
      let maxWinnings = 0
      mainWinnerId = activePlayers[0].agent_id
      winnings.forEach((amount, playerId) => {
        if (amount > maxWinnings) {
          maxWinnings = amount
          mainWinnerId = playerId
        }
      })
      
      const mainWinnerEval = evaluatedHands.find(p => p.playerId === mainWinnerId)
      winningHand = mainWinnerEval?.hand.description || 'Best hand'
      
    } else {
      // SIMPLE CASE: No side pots - just compare hands and award entire pot to winner(s)
      console.log(`[Resolve] Simple showdown - comparing ${activePlayers.length} hands directly`)
      
      // Log ALL hands at showdown for debugging
      console.log(`[Showdown] Community: ${communityCards.join(', ')}`)
      console.log(`[Showdown] All hands:`)
      for (const ph of playerHands) {
        const agent = handAgents.find(ha => ha.agent_id === ph.playerId)
        const name = (agent?.agents as Agent)?.name || 'Unknown'
        const evalHand = evaluateHand(ph.holeCards, communityCards)
        console.log(`  ${name}: [${ph.holeCards.join(', ')}] → ${evalHand.description} (cards: ${evalHand.cards.join(', ')})`)
      }
      
      const winners = determineWinners(playerHands, communityCards)
      
      if (winners.length === 0) {
        // Fallback - should never happen
        console.error('[Resolve] No winners determined - defaulting to first player')
        mainWinnerId = activePlayers[0].agent_id
        winnings.set(mainWinnerId, hand.pot_amount)
        winningHand = 'Error - no winner determined'
      } else {
        // Award pot to winner(s)
        const shareAmount = Math.floor(hand.pot_amount / winners.length)
        const remainder = hand.pot_amount % winners.length
        
        winners.forEach((winner, index) => {
          const extra = index === 0 ? remainder : 0
          winnings.set(winner.playerId, shareAmount + extra)
        })
        
        mainWinnerId = winners[0].playerId
        winningHand = winners[0].hand.description
        
        const winnerNames = winners.map(w => {
          const agent = handAgents.find(ha => ha.agent_id === w.playerId)
          return (agent?.agents as Agent)?.name || 'Unknown'
        }).join(', ')
        
        console.log(`[Resolve] Winner: ${winnerNames} with ${winningHand} - wins $${hand.pot_amount}`)
      }
    }
  }

  const winner = handAgents.find(ha => ha.agent_id === mainWinnerId)

  // Update hand as resolved
  await db
    .from('hands')
    .update({
      status: 'resolved',
      winner_agent_id: mainWinnerId,
      winning_hand: winningHand,
      resolved_at: new Date().toISOString(),
      active_agent_id: null,
    })
    .eq('id', hand.id)

  // PERSIST CHIP COUNTS TO AGENTS TABLE
  // Each player gets their remaining chips plus any winnings
  for (const ha of handAgents) {
    const playerWinnings = winnings.get(ha.agent_id) || 0
    const finalChips = ha.chip_count + playerWinnings
    
    // Update the agent's persistent chip count
    await db
      .from('agents')
      .update({ chip_count: finalChips })
      .eq('id', ha.agent_id)
    
    const name = (ha.agents as Agent)?.name || 'Unknown'
    if (playerWinnings > 0) {
      console.log(`[Chips] ${name}: ${ha.chip_count} → ${finalChips} (+$${playerWinnings})`)
    } else {
      console.log(`[Chips] ${name}: ${ha.chip_count} → ${finalChips}`)
    }
  }

  // Calculate total distributed
  let totalDistributed = 0
  winnings.forEach(amount => totalDistributed += amount)

  // NOTE: x402 agent payments removed - agents now use virtual chips only
  // Real money transactions happen via external betting API (Phase 3)

  // CHECK FOR GAME COMPLETION
  // A game ends when: max hands reached OR only 1 player has chips
  let gameCompleted = false
  let gameWinnerId: string | null = null
  let gameWinnerName: string | null = null
  
  if (hand.game_id) {
    // Get game info
    const gameResult = await db.from('games').select('*').eq('id', hand.game_id).single()
    const game = gameResult.data
    
    if (game && game.status !== 'resolved') {
      const maxHands = game.max_hands || 25
      
      // Get updated agent chip counts
      const agentsResult = await db.from('agents').select('id, name, chip_count').order('chip_count', { ascending: false })
      const agents = agentsResult.data || []
      const playersWithChips = agents.filter((a: { chip_count: number }) => a.chip_count > 0)
      
      // Check if game should end
      const isLastHand = hand.hand_number >= maxHands
      const onlyOnePlayerLeft = playersWithChips.length <= 1
      
      if (isLastHand || onlyOnePlayerLeft) {
        gameCompleted = true
        
        // Winner is player with most chips
        const gameWinner = agents[0] // Already sorted by chip_count desc
        gameWinnerId = gameWinner?.id || null
        gameWinnerName = gameWinner?.name || null
        
        // Update game as resolved
        await db.from('games').update({
          status: 'resolved',
          winner_agent_id: gameWinnerId,
          resolved_at: new Date().toISOString()
        }).eq('id', hand.game_id)
        
        const reason = isLastHand ? `reached ${maxHands} hands` : 'only one player remaining'
        console.log(`[Game #${game.game_number}] COMPLETE - ${gameWinnerName} wins! (${reason})`)
        console.log(`[Game #${game.game_number}] Final chips: ${agents.map((a: { name: string; chip_count: number }) => `${a.name}: $${a.chip_count}`).join(', ')}`)
        
        // Resolve on-chain game with winner
        // IMPORTANT: Check current status first - betting may already be closed
        if (game.on_chain_game_id !== null && gameWinnerName && isServerWalletConfigured()) {
          try {
            const onChainGameId = BigInt(game.on_chain_game_id)
            
            // Check current on-chain status
            const currentStatus = await getOnChainGameStatus(onChainGameId)
            console.log(`[Contract] On-chain game ${game.on_chain_game_id} current status: ${OnChainGameStatus[currentStatus]} (${currentStatus})`)
            
            // Step 1: Close betting if still open (session route may have already closed it)
            if (currentStatus === OnChainGameStatus.BettingOpen) {
              console.log(`[Contract] Closing betting for on-chain game ${game.on_chain_game_id}...`)
              await closeOnChainBetting(onChainGameId)
              console.log(`[Contract] Betting closed on-chain`)
            } else if (currentStatus === OnChainGameStatus.BettingClosed) {
              console.log(`[Contract] Betting already closed on-chain, skipping closeBetting call`)
            } else if (currentStatus === OnChainGameStatus.Resolved) {
              console.log(`[Contract] Game already resolved on-chain, skipping resolution`)
              return // Don't try to resolve again
            } else {
              console.error(`[Contract] Unexpected on-chain status: ${currentStatus}, aborting resolution`)
              return
            }
            
            // Step 2: Resolve game with winner (Closed → Resolved)
            const winnerAgentIndex = agentIdToContractIndex(gameWinnerName)
            console.log(`[Contract] Resolving on-chain game ${game.on_chain_game_id} with winner ${gameWinnerName} (index ${winnerAgentIndex})...`)
            const txHash = await resolveOnChainGame(onChainGameId, winnerAgentIndex)
            console.log(`[Contract] On-chain game resolved! Tx: ${txHash}`)
          } catch (err) {
            console.error(`[Contract] Failed to resolve on-chain game:`, err)
            // Don't fail the whole response - Supabase update succeeded
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    resolved: true,
    winnerId: mainWinnerId,
    winnerName: (winner?.agents as Agent)?.name || 'Unknown',
    winningHand,
    pot: hand.pot_amount,
    distributed: totalDistributed,
    message: `Hand resolved! ${(winner?.agents as Agent)?.name} wins with ${winningHand}`,
    // Game completion info
    gameCompleted,
    gameWinnerId,
    gameWinnerName,
  })
}

/**
 * Auto-play an entire hand from start to finish
 */
async function autoPlayHand(supabase: ReturnType<typeof createServiceClient>, lobbyId?: string) {
  // Start hand
  const startResult = await startNewHand(supabase, lobbyId)
  const startData = await startResult.json()
  
  if (!startData.success) {
    return NextResponse.json(startData, { status: 500 })
  }

  const handId = startData.handId
  const actions: Array<{ agent: string; action: string; reasoning: string }> = []

  // Play through the hand
  let resolved = false
  let iterations = 0
  const maxIterations = 50 // Safety limit

  while (!resolved && iterations < maxIterations) {
    iterations++

    // Get next action
    const actionResult = await processNextAction(supabase, handId)
    if (!actionResult) break
    const actionData = await actionResult.json()

    if (actionData.error) {
      // Check if we need to advance round
      if (actionData.error.includes('advance')) {
        const roundResult = await advanceRound(supabase, handId)
        if (!roundResult) continue
        const roundData = await roundResult.json()
        
        if (roundData.resolved) {
          resolved = true
        }
        continue
      }
      break
    }

    if (actionData.resolved) {
      resolved = true
      actions.push({
        agent: actionData.winnerName,
        action: 'WINS',
        reasoning: `Wins $${actionData.pot}`,
      })
    } else {
      actions.push({
        agent: actionData.agent,
        action: actionData.action,
        reasoning: actionData.reasoning,
      })
    }

    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 100))
  }

  return NextResponse.json({
    success: true,
    handId,
    handNumber: startData.handNumber,
    actions,
    iterations,
    resolved,
  })
}

