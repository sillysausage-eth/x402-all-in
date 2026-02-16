/**
 * Game Session API Route
 * Manages game sessions with betting windows
 * 
 * Created: Jan 10, 2026
 * Purpose: Game lifecycle management - create, start, advance, resolve games
 * 
 * Updated: Jan 12, 2026 - Added reset_game action for testing
 *                        - Cancels active games, resets agent chips
 *                        - Optionally creates new game immediately
 * Updated: Jan 12, 2026 - Integrated with PokerBetting smart contract
 *                        - Creates on-chain game when Supabase game created
 *                        - Closes betting on-chain when hand 6 starts
 *                        - Resolves on-chain game when game resolves
 *                        - Cancels on-chain game when game cancelled
 * Updated: Jan 13, 2026 - Reduced MAX_HANDS to 5 and BETTING_CLOSES_AFTER_HAND to 2
 *                        for faster contract integration testing
 * Updated: Jan 13, 2026 - Added agent pool seeding on game creation
 *                        - Seeds each agent with 25¢ USDC ($1 total per game)
 *                        - Ensures all agents start at 25% chance (no 0% display)
 * Updated: Jan 14, 2026 - Server wallet integration for owner operations
 * Updated: Jan 22, 2026 - Migrated to Thirdweb Server Wallet API (no private keys)
 *                        - Uses x402-deployer wallet for owner operations
 *                        - Requires THIRDWEB_SECRET_KEY in env
 * Updated: Jan 16, 2026 - Added x402 wallet redistribution on game reset
 *                        - When ENABLE_X402_PAYMENTS=true, redistributes USDC balances
 *                        - Ensures all agents have $1 USDC for next game
 * Updated: Jan 23, 2026 - BUGFIX: resolveGame now calls closeOnChainBetting() first
 *                        - V2 contract requires Open → Closed → Resolved transition
 *                        - Previously was trying to resolve directly from Open state
 * Updated: Jan 26, 2026 - BUGFIX: Check on-chain status before state transitions
 *                        - Betting closes after hand 2, but resolution happens at hand 5
 *                        - Now checks if already Closed before calling closeBetting
 *                        - Prevents "double close" error that blocked resolution
 * Updated: Jan 26, 2026 - Removed spectator_bets DB tracking in resolveGame
 *                        - On-chain contract is source of truth for all bet data
 *                        - Users claim winnings directly from contract
 * Updated: Feb 16, 2026 - BUGFIX: Added chain_id to games table
 *                        - Stores current chain (8453 mainnet / 84532 testnet) on each game
 *                        - All game queries now filter by chain_id to prevent cross-chain contamination
 *                        - Added duplicate game creation guard (409 if active game exists)
 *                        - Game numbering is now per-chain (mainnet starts fresh at 1)
 * Updated: Feb 16, 2026 - Added auto-claim of server wallet seed winnings after game resolution
 *                        - Added claim_server_winnings, cancel_on_chain, refund_server admin actions
 *                        - Server wallet automatically reclaims seed USDC after each resolved game
 * 
 * Endpoints:
 * - POST /api/game/session
 *   - action: 'create_game' | 'start_game' | 'next_hand' | 'check_game_end' | 'resolve_game' | 'reset_game' | 'claim_server_winnings' | 'cancel_on_chain' | 'refund_server'
 * 
 * Game Flow:
 * 1. create_game → Sets up game with countdown + creates & seeds on-chain game
 * 2. start_game → Begins game after countdown (called by client or cron)
 * 3. next_hand → Plays one hand (closes on-chain betting after BETTING_CLOSES_AFTER_HAND)
 * 4. check_game_end → Checks if game should end (MAX_HANDS or 1 player left)
 * 5. resolve_game → Determines winner and resolves on-chain game
 * 6. reset_game → (Dev) Cancels current game + on-chain game, resets chips
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Game, Agent } from '@/types/database'
import { 
  createAndSeedGame, 
  closeOnChainBetting, 
  resolveOnChainGame, 
  cancelOnChainGame,
  claimServerWinnings,
  claimServerRefund,
  agentIdToContractIndex,
  isServerWalletConfigured,
  getOnChainGameStatus,
  OnChainGameStatus,
} from '@/lib/contracts/admin'
import { getCurrentConfig } from '@/lib/contracts/config'
import { generateGameCommitment, type GameCommitment } from '@/lib/poker/verifiable'

// Constants
const STARTING_CHIPS = 1000
const COUNTDOWN_MINUTES = 0 // TESTING: Set to 0 for instant start (was 1 minute, production should be 5)
const HAND_DELAY_SECONDS = 5
const MAX_HANDS = 5 // Reduced from 25 for faster contract integration testing
const BETTING_CLOSES_AFTER_HAND = 2 // Reduced from 5 for faster contract integration testing

interface SessionRequest {
  action: 'create_game' | 'start_game' | 'next_hand' | 'check_game_end' | 'resolve_game' | 'auto_play_game' | 'reset_game' | 'claim_server_winnings' | 'cancel_on_chain' | 'refund_server'
  lobbyId?: string
  gameId?: string
  onChainGameId?: number // For claim_server_winnings action
  createNewGame?: boolean // For reset_game action - whether to auto-create a new game
  force?: boolean // For start_game action - bypass countdown check (testing only)
}

export async function POST(request: NextRequest) {
  try {
    const body: SessionRequest = await request.json()
    const supabase = createServiceClient()

    switch (body.action) {
      case 'create_game':
        return await createGame(supabase, body.lobbyId)
      
      case 'start_game':
        return await startGame(supabase, body.gameId, body.force)
      
      case 'next_hand':
        return await playNextHand(supabase, body.gameId)
      
      case 'check_game_end':
        return await checkGameEnd(supabase, body.gameId)
      
      case 'resolve_game':
        return await resolveGame(supabase, body.gameId)
      
      case 'auto_play_game':
        return await autoPlayGame(supabase, body.gameId)
      
      case 'reset_game':
        return await resetGame(supabase, body.lobbyId, body.createNewGame)
      
      case 'claim_server_winnings': {
        if (body.onChainGameId === undefined) {
          return NextResponse.json({ error: 'onChainGameId required' }, { status: 400 })
        }
        try {
          const txHash = await claimServerWinnings(BigInt(body.onChainGameId))
          return NextResponse.json({ success: true, txHash })
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : 'Claim failed' }, { status: 500 })
        }
      }

      case 'cancel_on_chain': {
        if (body.onChainGameId === undefined) {
          return NextResponse.json({ error: 'onChainGameId required' }, { status: 400 })
        }
        try {
          const txHash = await cancelOnChainGame(BigInt(body.onChainGameId))
          return NextResponse.json({ success: true, txHash })
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : 'Cancel failed' }, { status: 500 })
        }
      }

      case 'refund_server': {
        if (body.onChainGameId === undefined) {
          return NextResponse.json({ error: 'onChainGameId required' }, { status: 400 })
        }
        try {
          const txHash = await claimServerRefund(BigInt(body.onChainGameId))
          return NextResponse.json({ success: true, txHash })
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : 'Refund failed' }, { status: 500 })
        }
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Session orchestrator error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Create a new game with countdown
 */
async function createGame(supabase: ReturnType<typeof createServiceClient>, lobbyId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Get or find lobby
  let currentLobbyId = lobbyId
  if (!currentLobbyId) {
    const { data: lobbies } = await db
      .from('lobbies')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    
    if (!lobbies || lobbies.length === 0) {
      return NextResponse.json({ error: 'No active lobby found' }, { status: 404 })
    }
    currentLobbyId = lobbies[0].id
  }

  const chainId = getCurrentConfig().chainId

  // Guard: prevent duplicate game creation - check for existing non-resolved games on this chain
  const { data: existingGames } = await db
    .from('games')
    .select('id, game_number, status')
    .eq('lobby_id', currentLobbyId)
    .eq('chain_id', chainId)
    .in('status', ['waiting', 'betting_open', 'betting_closed'])
    .limit(1)

  if (existingGames && existingGames.length > 0) {
    console.warn(`[Game] Duplicate create_game blocked - active game ${existingGames[0].id} already exists`)
    return NextResponse.json({ 
      error: 'Active game already exists', 
      existingGameId: existingGames[0].id,
      existingGameNumber: existingGames[0].game_number,
    }, { status: 409 })
  }

  // Get latest game number for this chain
  const { data: lastGame } = await db
    .from('games')
    .select('game_number')
    .eq('lobby_id', currentLobbyId)
    .eq('chain_id', chainId)
    .order('game_number', { ascending: false })
    .limit(1)
    .single()

  const gameNumber = (lastGame?.game_number || 0) + 1

  // Schedule start time (5 minutes from now)
  const scheduledStartAt = new Date(Date.now() + COUNTDOWN_MINUTES * 60 * 1000).toISOString()

  // Reset all agent chip counts to starting amount
  await db
    .from('agents')
    .update({ chip_count: STARTING_CHIPS })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all agents

  // Generate verifiable game commitment (deck + salt → hash)
  // The commitment is published now, deck/salt revealed after game ends
  const gameCommitment = generateGameCommitment()
  console.log(`[Game #${gameNumber}] Commitment: ${gameCommitment.commitment}`)

  // Create on-chain game first (if contract owner key is configured)
  let onChainGameId: bigint | null = null
  let onChainTxHash: string | null = null
  
  if (isServerWalletConfigured()) {
    try {
      // Create on-chain game AND seed all agents with 25¢ each ($1 total)
      // This ensures all agents start at 25% chance instead of 0%
      const onChainResult = await createAndSeedGame()
      onChainGameId = onChainResult.gameId
      onChainTxHash = onChainResult.txHashes?.[0] || null
      console.log(`[Game #${gameNumber}] On-chain game created and seeded: ${onChainGameId} (${onChainResult.totalSeeded})`)
    } catch (err) {
      console.error('[Game] Failed to create/seed on-chain game:', err)
      // Continue without on-chain game for now (can be linked later)
    }
  } else {
    console.warn('[Game] THIRDWEB_SECRET_KEY not configured - skipping on-chain game creation')
  }

  // Create the game in Supabase
  // Store commitment hash publicly, salt privately (revealed after game)
  // Note: deck_reveal is null because decks are computed deterministically from salt + hand_number
  const { data: game, error } = await db
    .from('games')
    .insert({
      lobby_id: currentLobbyId,
      game_number: gameNumber,
      chain_id: chainId,
      status: 'waiting',
      current_hand_number: 0,
      max_hands: MAX_HANDS,
      betting_closes_after_hand: BETTING_CLOSES_AFTER_HAND,
      scheduled_start_at: scheduledStartAt,
      on_chain_game_id: onChainGameId !== null ? Number(onChainGameId) : null,
      // Verifiable game data - commitment is hash(salt), deck computed from salt+hand
      deck_commitment: gameCommitment.commitment,
      salt_reveal: gameCommitment.salt, // Kept private until game ends
      action_log: [],
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }

  console.log(`[Game #${gameNumber}] Created. Starts at ${scheduledStartAt} (${COUNTDOWN_MINUTES} min countdown)`)

  return NextResponse.json({
    success: true,
    gameId: game.id,
    gameNumber,
    status: 'waiting',
    scheduledStartAt,
    countdownMinutes: COUNTDOWN_MINUTES,
    onChainGameId: onChainGameId !== null ? Number(onChainGameId) : null,
    onChainTxHash,
    // Verifiable game commitment (deck is shuffled, this hash proves we can't change it)
    deckCommitment: gameCommitment.commitment,
    message: `Game #${gameNumber} created. Starting in ${COUNTDOWN_MINUTES} minutes.`
  })
}

/**
 * Start a game (after countdown ends)
 * @param force - If true, bypass countdown check (for testing)
 */
async function startGame(supabase: ReturnType<typeof createServiceClient>, gameId?: string, force?: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (!gameId) {
    // Find the waiting game on the current chain
    const chainId = getCurrentConfig().chainId
    const { data: games } = await db
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .eq('chain_id', chainId)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!games || games.length === 0) {
      return NextResponse.json({ error: 'No waiting game found' }, { status: 404 })
    }
    gameId = games[0].id
  }

  // Get the game
  const { data: game, error: gameError } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.status !== 'waiting') {
    return NextResponse.json({ error: `Game already ${game.status}` }, { status: 400 })
  }

  // Check if countdown has elapsed (can be bypassed with force=true for testing)
  if (!force) {
    const scheduledTime = new Date(game.scheduled_start_at).getTime()
    const now = Date.now()
    if (scheduledTime > now) {
      const secondsRemaining = Math.ceil((scheduledTime - now) / 1000)
      return NextResponse.json({
        error: 'Game not ready to start',
        secondsRemaining,
        message: `Game starts in ${Math.ceil(secondsRemaining / 60)} minutes. Use force=true to bypass.`
      }, { status: 400 })
    }
  } else {
    console.log(`[Game #${game.game_number}] Force-starting game (bypassing countdown)`)
  }

  // Update game status to betting_open
  await db
    .from('games')
    .update({
      status: 'betting_open',
      started_at: new Date().toISOString(),
    })
    .eq('id', gameId)

  console.log(`[Game #${game.game_number}] Started! Betting open for first ${BETTING_CLOSES_AFTER_HAND} hands.`)

  return NextResponse.json({
    success: true,
    gameId,
    gameNumber: game.game_number,
    status: 'betting_open',
    message: `Game #${game.game_number} started! Betting open for hands 1-${BETTING_CLOSES_AFTER_HAND}.`
  })
}

/**
 * Play the next hand in the game
 */
async function playNextHand(supabase: ReturnType<typeof createServiceClient>, gameId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
  }

  // Get the game
  const { data: game, error: gameError } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.status === 'resolved' || game.status === 'cancelled') {
    return NextResponse.json({ error: `Game already ${game.status}` }, { status: 400 })
  }

  // Check if game should end
  const endCheck = await checkGameEndInternal(supabase, game)
  if (endCheck.shouldEnd) {
    return await resolveGame(supabase, gameId)
  }

  // Increment hand number
  const newHandNumber = game.current_hand_number + 1

  // Check if betting should close
  let newStatus = game.status
  if (newHandNumber > BETTING_CLOSES_AFTER_HAND && game.status === 'betting_open') {
    newStatus = 'betting_closed'
    await db
      .from('games')
      .update({
        status: 'betting_closed',
        betting_closed_at: new Date().toISOString(),
      })
      .eq('id', gameId)
    
    console.log(`[Game #${game.game_number}] Betting closed after hand ${BETTING_CLOSES_AFTER_HAND}`)
    
    // Close betting on-chain
    if (game.on_chain_game_id !== null && isServerWalletConfigured()) {
      try {
        await closeOnChainBetting(BigInt(game.on_chain_game_id))
        console.log(`[Game #${game.game_number}] On-chain betting closed`)
      } catch (err) {
        console.error('[Game] Failed to close on-chain betting:', err)
        // Non-fatal - continue with game
      }
    }
  }

  // Update current hand number
  await db
    .from('games')
    .update({ current_hand_number: newHandNumber })
    .eq('id', gameId)

  // Call the hand orchestrator to start a new hand
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const handResponse = await fetch(`${baseUrl}/api/game/orchestrator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'start_hand', 
      lobbyId: game.lobby_id 
    }),
  })

  const handData = await handResponse.json()

  if (!handData.success) {
    return NextResponse.json({ 
      error: 'Failed to start hand',
      details: handData.error 
    }, { status: 500 })
  }

  // Link the hand to this game
  await db
    .from('hands')
    .update({ game_id: gameId })
    .eq('id', handData.handId)

  console.log(`[Game #${game.game_number}] Hand ${newHandNumber}/${MAX_HANDS} started. Status: ${newStatus}`)

  return NextResponse.json({
    success: true,
    gameId,
    gameNumber: game.game_number,
    handNumber: newHandNumber,
    maxHands: MAX_HANDS,
    handId: handData.handId,
    gameStatus: newStatus,
    bettingOpen: newStatus === 'betting_open',
    message: `Hand ${newHandNumber}/${MAX_HANDS} started.`
  })
}

/**
 * Internal check if game should end
 */
async function checkGameEndInternal(
  supabase: ReturnType<typeof createServiceClient>, 
  game: Game
): Promise<{ shouldEnd: boolean; reason?: string; winnerId?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Check if we've reached max hands
  if (game.current_hand_number >= game.max_hands) {
    return { shouldEnd: true, reason: 'max_hands_reached' }
  }

  // Check if only one player has chips (others eliminated)
  const { data: agents } = await db
    .from('agents')
    .select('id, name, chip_count')
    .gt('chip_count', 0)

  if (!agents || agents.length === 0) {
    return { shouldEnd: true, reason: 'error_no_players' }
  }

  if (agents.length === 1) {
    return { 
      shouldEnd: true, 
      reason: 'last_player_standing',
      winnerId: agents[0].id 
    }
  }

  return { shouldEnd: false }
}

/**
 * Check if game should end (public endpoint)
 */
async function checkGameEnd(supabase: ReturnType<typeof createServiceClient>, gameId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
  }

  const { data: game } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const result = await checkGameEndInternal(supabase, game)

  return NextResponse.json({
    gameId,
    gameNumber: game.game_number,
    currentHand: game.current_hand_number,
    maxHands: game.max_hands,
    ...result
  })
}

/**
 * Resolve the game and determine winner
 */
async function resolveGame(supabase: ReturnType<typeof createServiceClient>, gameId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
  }

  const { data: game } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.status === 'resolved') {
    return NextResponse.json({ error: 'Game already resolved' }, { status: 400 })
  }

  // Get all agents with their chip counts
  const { data: agents } = await db
    .from('agents')
    .select('*')
    .order('chip_count', { ascending: false })

  if (!agents || agents.length === 0) {
    return NextResponse.json({ error: 'No agents found' }, { status: 500 })
  }

  // Winner is the agent with most chips
  const winner = agents[0] as Agent
  const standings = agents.map((agent: Agent, index: number) => ({
    position: index + 1,
    agentId: agent.id,
    name: agent.name,
    chipCount: agent.chip_count,
    isEliminated: agent.chip_count <= 0,
  }))

  // Update game as resolved
  await db
    .from('games')
    .update({
      status: 'resolved',
      winner_agent_id: winner.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', gameId)

  // Resolve on-chain game
  // IMPORTANT: Check current status first - betting may already be closed by session route
  let onChainResolveTxHash: string | null = null
  if (game.on_chain_game_id !== null && isServerWalletConfigured()) {
    try {
      const onChainGameId = BigInt(game.on_chain_game_id)
      
      // Check current on-chain status before attempting state transitions
      const currentStatus = await getOnChainGameStatus(onChainGameId)
      console.log(`[Game #${game.game_number}] On-chain status: ${OnChainGameStatus[currentStatus]} (${currentStatus})`)
      
      // Step 1: Close betting if still open (may have been closed by advanceHand)
      if (currentStatus === OnChainGameStatus.BettingOpen) {
        console.log(`[Game #${game.game_number}] Closing betting on-chain...`)
        await closeOnChainBetting(onChainGameId)
        console.log(`[Game #${game.game_number}] Betting closed on-chain`)
      } else if (currentStatus === OnChainGameStatus.BettingClosed) {
        console.log(`[Game #${game.game_number}] Betting already closed, skipping to resolution`)
      } else if (currentStatus === OnChainGameStatus.Resolved) {
        console.log(`[Game #${game.game_number}] Game already resolved on-chain`)
        // Skip resolution, game is already done
      } else {
        console.error(`[Game #${game.game_number}] Unexpected on-chain status: ${currentStatus}`)
      }
      
      // Step 2: Resolve game with winner (Closed → Resolved) if not already resolved
      if (currentStatus !== OnChainGameStatus.Resolved) {
        const winnerContractIndex = agentIdToContractIndex(winner.name)
        console.log(`[Game #${game.game_number}] Resolving on-chain with winner ${winner.name} (index ${winnerContractIndex})...`)
        onChainResolveTxHash = await resolveOnChainGame(onChainGameId, winnerContractIndex)
        console.log(`[Game #${game.game_number}] On-chain game resolved. Tx: ${onChainResolveTxHash}`)
      }
      
      // Step 3: Auto-claim server wallet seed winnings
      // The server wallet seeds all agents, so it always has a bet on the winner.
      // Claiming recovers the seed USDC (plus share of losing bets minus fees).
      try {
        const claimTxHash = await claimServerWinnings(onChainGameId)
        console.log(`[Game #${game.game_number}] Server wallet claimed seed winnings. Tx: ${claimTxHash}`)
      } catch (claimErr) {
        console.error(`[Game #${game.game_number}] Failed to claim server winnings (non-fatal):`, claimErr)
      }
    } catch (err) {
      console.error('[Game] Failed to resolve on-chain game:', err)
      // Non-fatal - users can still claim via contract if it's manually resolved later
    }
  }

  // NOTE: Bet tracking and payouts are handled ON-CHAIN via the PokerBettingV2 contract
  // Users claim winnings directly from the smart contract using claimWinnings()
  // No need to track bets or payouts in the database - contract is source of truth

  // Schedule next game (5 minutes from now)
  const nextGameStart = new Date(Date.now() + COUNTDOWN_MINUTES * 60 * 1000).toISOString()

  console.log(`[Game #${game.game_number}] RESOLVED! Winner: ${winner.name} with $${winner.chip_count}`)

  return NextResponse.json({
    success: true,
    gameId,
    gameNumber: game.game_number,
    status: 'resolved',
    winner: {
      agentId: winner.id,
      name: winner.name,
      avatarUrl: winner.avatar_url,
      finalChipCount: winner.chip_count,
    },
    standings,
    // Pool data is on-chain - fetch from contract via /api/v1/games/:id
    nextGameStart,
    message: `Game #${game.game_number} complete! ${winner.name} wins with $${winner.chip_count}!`
  })
}

/**
 * Reset game state (for testing)
 * Cancels any active game, resets agent chips, optionally creates new game
 */
async function resetGame(
  supabase: ReturnType<typeof createServiceClient>, 
  lobbyId?: string,
  createNewGame: boolean = true
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Get or find lobby
  let currentLobbyId = lobbyId
  if (!currentLobbyId) {
    const { data: lobbies } = await db
      .from('lobbies')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    
    if (!lobbies || lobbies.length === 0) {
      return NextResponse.json({ error: 'No active lobby found' }, { status: 404 })
    }
    currentLobbyId = lobbies[0].id
  }

  const chainId = getCurrentConfig().chainId

  // Get active games first (to cancel on-chain) - filter by chain
  const { data: activeGames } = await db
    .from('games')
    .select('id, game_number, on_chain_game_id')
    .eq('lobby_id', currentLobbyId)
    .eq('chain_id', chainId)
    .in('status', ['waiting', 'betting_open', 'betting_closed'])
  
  // Cancel on-chain games first
  if (activeGames && activeGames.length > 0 && isServerWalletConfigured()) {
    for (const activeGame of activeGames) {
      if (activeGame.on_chain_game_id !== null) {
        try {
          await cancelOnChainGame(BigInt(activeGame.on_chain_game_id))
          console.log(`[Reset] Cancelled on-chain game ${activeGame.on_chain_game_id}`)
        } catch (err) {
          console.error(`[Reset] Failed to cancel on-chain game ${activeGame.on_chain_game_id}:`, err)
          // Continue with other cancellations
        }
      }
    }
  }

  // Cancel all active games in Supabase (on current chain only)
  const { data: cancelledGames, error: cancelError } = await db
    .from('games')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
    })
    .eq('lobby_id', currentLobbyId)
    .eq('chain_id', chainId)
    .in('status', ['waiting', 'betting_open', 'betting_closed'])
    .select('id, game_number')

  if (cancelError) {
    console.error('Failed to cancel games:', cancelError)
    return NextResponse.json({ error: 'Failed to cancel active games' }, { status: 500 })
  }

  const cancelledCount = cancelledGames?.length || 0
  console.log(`[Reset] Cancelled ${cancelledCount} active game(s)`)

  // Reset all agent chip counts to starting amount
  const { error: resetError } = await db
    .from('agents')
    .update({ chip_count: STARTING_CHIPS })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all agents

  if (resetError) {
    console.error('Failed to reset agent chips:', resetError)
    return NextResponse.json({ error: 'Failed to reset agent chips' }, { status: 500 })
  }

  console.log(`[Reset] All agent chip counts reset to $${STARTING_CHIPS}`)
  
  // NOTE: x402 wallet redistribution removed - agents now use virtual chips only

  // Optionally create a new game
  if (createNewGame) {
    const createResult = await createGame(supabase, currentLobbyId)
    const createData = await createResult.json()

    return NextResponse.json({
      success: true,
      action: 'reset_and_create',
      cancelledGames: cancelledCount,
      chipsReset: true,
      newGame: createData.success ? {
        gameId: createData.gameId,
        gameNumber: createData.gameNumber,
        scheduledStartAt: createData.scheduledStartAt,
      } : null,
      message: `Reset complete! ${cancelledCount} game(s) cancelled, chips reset. New game #${createData.gameNumber} created.`
    })
  }

  return NextResponse.json({
    success: true,
    action: 'reset_only',
    cancelledGames: cancelledCount,
    chipsReset: true,
    message: `Reset complete! ${cancelledCount} game(s) cancelled, all agent chips reset to $${STARTING_CHIPS}.`
  })
}

/**
 * Auto-play entire game (for testing)
 * Plays all hands automatically with delays
 */
async function autoPlayGame(supabase: ReturnType<typeof createServiceClient>, gameId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // If no gameId, create a new game and start it immediately
  if (!gameId) {
    // Get lobby
    const { data: lobbies } = await db
      .from('lobbies')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    
    if (!lobbies || lobbies.length === 0) {
      return NextResponse.json({ error: 'No active lobby found' }, { status: 404 })
    }

    // Create game with immediate start
    const createResult = await createGame(supabase, lobbies[0].id)
    const createData = await createResult.json()
    
    if (!createData.success) {
      return NextResponse.json(createData, { status: 500 })
    }
    
    gameId = createData.gameId

    // Force start immediately (bypass countdown for testing)
    await db
      .from('games')
      .update({
        status: 'betting_open',
        started_at: new Date().toISOString(),
        scheduled_start_at: new Date().toISOString(), // Set to now to bypass check
      })
      .eq('id', gameId)
  }

  // Get the game
  const { data: game } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results: Array<{ hand: number; winner: string; pot: number }> = []
  let handCount = game.current_hand_number

  console.log(`[Auto-Play] Starting game #${game.game_number} from hand ${handCount + 1}`)

  // Play hands until game ends
  while (handCount < MAX_HANDS) {
    // Check for elimination
    const endCheck = await checkGameEndInternal(supabase, { ...game, current_hand_number: handCount } as Game)
    if (endCheck.shouldEnd) {
      console.log(`[Auto-Play] Game ending: ${endCheck.reason}`)
      break
    }

    // Start next hand
    const handResult = await playNextHand(supabase, gameId)
    const handData = await handResult.json()

    if (!handData.success) {
      console.error(`[Auto-Play] Failed to start hand: ${handData.error}`)
      break
    }

    handCount = handData.handNumber
    const handId = handData.handId

    // Play through the hand using the hand orchestrator
    let handResolved = false
    let iterations = 0
    const maxIterations = 50

    while (!handResolved && iterations < maxIterations) {
      iterations++

      const actionResponse = await fetch(`${baseUrl}/api/game/orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next_action', handId }),
      })

      const actionData = await actionResponse.json()

      if (actionData.resolved) {
        handResolved = true
        results.push({
          hand: handCount,
          winner: actionData.winnerName,
          pot: actionData.pot,
        })
        console.log(`[Auto-Play] Hand ${handCount}: ${actionData.winnerName} wins $${actionData.pot}`)
      } else if (actionData.runningOut) {
        // All-in showdown - continue running out board
        continue
      } else if (actionData.error) {
        console.error(`[Auto-Play] Hand error: ${actionData.error}`)
        break
      }

      // Small delay between actions
      await new Promise(r => setTimeout(r, 50))
    }

    // Delay between hands (reduced for auto-play)
    await new Promise(r => setTimeout(r, HAND_DELAY_SECONDS * 100)) // 500ms instead of 5s
  }

  // Resolve the game
  const resolveResult = await resolveGame(supabase, gameId)
  const resolveData = await resolveResult.json()

  return NextResponse.json({
    success: true,
    gameId,
    gameNumber: game.game_number,
    handsPlayed: handCount,
    results,
    winner: resolveData.winner,
    standings: resolveData.standings,
    message: `Game #${game.game_number} auto-played! ${resolveData.winner?.name} wins!`
  })
}
