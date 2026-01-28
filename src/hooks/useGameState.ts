/**
 * useGameState Hook
 * Real-time subscription to poker game state via Supabase
 * 
 * Created: Jan 6, 2026
 * Updated: Jan 7, 2026 - Fixed decimal type conversion for pot_amount, chip_count, current_bet
 *                       (PostgreSQL decimal fields come as strings from Supabase)
 * Updated: Jan 7, 2026 - Fixed chip count display after hand resolution
 *                       - Subscribe to agents table for real-time chip updates
 *                       - Use agent chip_count (not hand_agents) when hand is resolved
 * Updated: Jan 9, 2026 - Fixed bet chips reappearing after winner animation
 *                       - Set currentBet to 0 when hand is resolved (pot already awarded)
 * Updated: Jan 9, 2026 - Added lastActionRound to PlayerState for action badge reset per round
 * Updated: Jan 9, 2026 - Fixed TypeScript error: removed non-existent updated_at property reference
 * Updated: Jan 10, 2026 - Added gameId option for per-game hand tracking (1-25 per game)
 *                        - When gameId provided, queries hands by game_id instead of lobby_id
 * Updated: Jan 10, 2026 - EGRESS OPTIMIZATION: Major refactor to reduce Supabase egress
 *                        - Filter subscriptions by game_id/hand_id (not table-wide)
 *                        - Select specific columns instead of SELECT *
 *                        - Add debouncing to batch rapid updates
 *                        - Use payload data for simple updates where safe
 * Updated: Jan 12, 2026 - ELIMINATED PLAYER FIX: Always show all 4 agents on table
 *                        - Eliminated players (not in hand_agents) still appear with isEliminated flag
 *                        - They show BUST badge but remain visible at their seat
 * Updated: Jan 12, 2026 - END OF HAND FIX: Force fresh agent data fetch when hand resolves
 *                        - Added isEliminated flag to PlayerState for UI display
 *                        - When hand status changes to 'resolved', always re-fetch agents
 *                        - This ensures chip counts and eliminations update immediately
 * Purpose: Subscribe to hands, hand_agents, and agent_actions for live updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Hand, HandAgent, AgentAction, Agent, Lobby } from '@/types/database'
import type { Round, BettingOdds, CardNotation } from '@/types/poker'
import { probabilityToOdds } from '@/lib/poker/game-engine'

// =============================================================================
// EGRESS OPTIMIZATION: Column selections to avoid fetching unnecessary data
// =============================================================================

// Only fetch agent fields needed for UI (excludes system_prompt which can be large)
const AGENT_COLUMNS = 'id, name, slug, avatar_url, chip_count, seat_position, created_at'

// Hand columns - all needed for game state
const HAND_COLUMNS = 'id, lobby_id, game_id, hand_number, status, community_cards, pot_amount, winner_agent_id, winning_hand, betting_closes_at, resolved_at, created_at, current_round, dealer_position, active_agent_id'

// Hand agent columns - all needed
const HAND_AGENT_COLUMNS = 'id, hand_id, agent_id, seat_position, hole_cards, chip_count, current_bet, is_folded, is_all_in'

// Agent action columns - truncate reasoning if too long in transform
const ACTION_COLUMNS = 'id, hand_id, agent_id, action_type, amount, reasoning, round, created_at'

// Spectator bet columns for odds
const BET_COLUMNS = 'agent_id, amount'

// Debounce delay in ms - batches rapid updates
const DEBOUNCE_MS = 100

// =============================================================================
// Types
// =============================================================================

// Transformed game state for UI consumption
export interface SidePot {
  amount: number
  eligiblePlayerIds: string[]
}

export interface GameState {
  // Current hand info
  handId: string | null
  handNumber: number
  status: Hand['status']
  round: Round
  communityCards: CardNotation[]
  pot: number
  sidePots: SidePot[]  // For split pot display
  
  // Players
  players: PlayerState[]
  activePlayerId: string | null
  dealerPlayerId: string | null
  smallBlindPlayerId: string | null
  bigBlindPlayerId: string | null
  
  // Betting
  bettingClosesAt: string | null
  isBettingOpen: boolean
  odds: BettingOdds[]
  totalPool: number
  
  // Result
  winnerId: string | null
  winningHand: string | null
}

export interface PlayerState {
  id: string
  agentId: string
  name: string
  slug: string
  avatarUrl: string | null
  chipCount: number
  currentBet: number
  holeCards: CardNotation[]
  isFolded: boolean
  isAllIn: boolean
  isEliminated: boolean  // True if player has 0 chips (bust)
  seatPosition: number
  lastAction?: string
  lastActionType?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
  lastActionRound?: Round  // Track which round the action was from (for resetting badges)
}

export interface GameAction {
  id: string
  agentName: string
  agentSlug: string
  actionType: AgentAction['action_type'] | 'win'
  amount: number | null
  reasoning: string | null | undefined
  round: Round
  timestamp: string
  // Winner-specific fields (for 'win' action type)
  winningHand?: string
  holeCards?: CardNotation[]
  potAmount?: number
}

interface UseGameStateOptions {
  lobbyId?: string
  gameId?: string  // When provided, queries hands by game_id for per-game hand tracking
}

interface UseGameStateReturn {
  gameState: GameState | null
  actions: GameAction[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const initialGameState: GameState = {
  handId: null,
  handNumber: 0,
  status: 'betting_open',
  round: 'preflop',
  communityCards: [],
  pot: 0,
  sidePots: [],
  players: [],
  activePlayerId: null,
  dealerPlayerId: null,
  smallBlindPlayerId: null,
  bigBlindPlayerId: null,
  bettingClosesAt: null,
  isBettingOpen: false,
  odds: [],
  totalPool: 0,
  winnerId: null,
  winningHand: null,
}

// Type for agent without system_prompt (optimized fetch)
type AgentLite = Omit<Agent, 'system_prompt' | 'wallet_address'> & { wallet_address?: string }

export function useGameState(options: UseGameStateOptions = {}): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actions, setActions] = useState<GameAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [currentHandId, setCurrentHandId] = useState<string | null>(null)
  
  // Refs for debouncing and stable references
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRefreshRef = useRef(false)
  const agentsRef = useRef<AgentLite[]>([])
  
  const supabase = getSupabaseClient()
  
  // Keep ref in sync with state
  agentsRef.current = agents

  // =============================================================================
  // OPTIMIZATION: Debounced refresh to batch rapid updates
  // =============================================================================
  const debouncedRefresh = useCallback((fetchFn: () => Promise<void>) => {
    pendingRefreshRef.current = true
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false
        await fetchFn()
      }
    }, DEBOUNCE_MS)
  }, [])

  // =============================================================================
  // OPTIMIZATION: Fetch agents with specific columns only
  // =============================================================================
  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select(AGENT_COLUMNS)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching agents:', error)
      return []
    }
    
    setAgents((data || []) as AgentLite[])
    return (data || []) as AgentLite[]
  }, [supabase])

  // =============================================================================
  // OPTIMIZATION: Fetch current hand with specific columns
  // =============================================================================
  const fetchCurrentHand = useCallback(async (agentList: AgentLite[]) => {
    // Get active lobby
    const lobbyResult = await supabase
      .from('lobbies')
      .select('id, name, status')  // Only needed columns
      .eq('status', 'active')
      .limit(1)
    
    if (lobbyResult.error) {
      console.error('Error fetching lobbies:', lobbyResult.error)
      setGameState(initialGameState)
      setIsLoading(false)
      return
    }

    const lobbies = lobbyResult.data as Lobby[]
    
    if (!lobbies || lobbies.length === 0) {
      console.log('No active lobby found')
      setGameState(initialGameState)
      setIsLoading(false)
      return
    }
    
    const lobbyId = options.lobbyId || lobbies[0].id

    // Get latest hand with specific columns
    let handResult
    if (options.gameId) {
      handResult = await supabase
        .from('hands')
        .select(HAND_COLUMNS)
        .eq('game_id', options.gameId)
        .order('created_at', { ascending: false })
        .limit(1)
    } else {
      handResult = await supabase
        .from('hands')
        .select(HAND_COLUMNS)
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: false })
        .limit(1)
    }
    
    if (handResult.error) {
      setError(new Error(handResult.error.message))
      setIsLoading(false)
      return
    }

    const hands = handResult.data as Hand[]

    if (!hands || hands.length === 0) {
      setGameState(initialGameState)
      setIsLoading(false)
      return
    }

    const currentHand = hands[0]
    
    // Track current hand ID for filtered subscriptions
    setCurrentHandId(currentHand.id)

    // Get hand agents with specific columns
    const handAgentsResult = await supabase
      .from('hand_agents')
      .select(HAND_AGENT_COLUMNS)
      .eq('hand_id', currentHand.id)
      .order('seat_position', { ascending: true })

    if (handAgentsResult.error) {
      setError(new Error(handAgentsResult.error.message))
      setIsLoading(false)
      return
    }

    const handAgents = handAgentsResult.data as HandAgent[]

    // Get actions for this hand with specific columns
    const actionsResult = await supabase
      .from('agent_actions')
      .select(ACTION_COLUMNS)
      .eq('hand_id', currentHand.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (actionsResult.error) {
      console.error('Error fetching actions:', actionsResult.error)
    }

    const handActions = (actionsResult.data || []) as AgentAction[]

    // Get spectator bets for odds calculation - only needed columns
    const betsResult = await supabase
      .from('spectator_bets')
      .select(BET_COLUMNS)
      .eq('hand_id', currentHand.id)
      .eq('status', 'pending')

    const spectatorBets = (betsResult.data || []) as { agent_id: string; amount: number }[]

    // Build player states
    // IMPORTANT: Include ALL agents, not just those in handAgents
    // Eliminated players (chip_count = 0) won't be in handAgents but should still show at table
    const isHandResolved = currentHand.status === 'resolved'
    
    // CRITICAL: When hand is resolved, we need fresh agent data for accurate chip counts
    // The agentList parameter might have stale data if the hand just resolved
    // So we re-fetch agents here to ensure chip counts are current
    let freshAgentList = agentList
    if (isHandResolved) {
      const freshAgentsResult = await supabase
        .from('agents')
        .select(AGENT_COLUMNS)
        .order('created_at', { ascending: true })
      
      if (!freshAgentsResult.error && freshAgentsResult.data) {
        freshAgentList = freshAgentsResult.data as AgentLite[]
        // Update the agents state with fresh data
        setAgents(freshAgentList)
      }
    }
    
    const players: PlayerState[] = freshAgentList.map((agent) => {
      // Check if this agent is participating in the current hand
      const ha = handAgents.find(h => h.agent_id === agent.id)
      const isInHand = !!ha
      
      const voluntaryAction = handActions.find(a => a.agent_id === agent.id && a.action_type !== 'blind')
      const blindAction = handActions.find(a => a.agent_id === agent.id && a.action_type === 'blind')
      const lastAction = voluntaryAction || blindAction

      // Use agent's chip_count (from agents table) as source of truth
      // For players in hand, use hand_agents chip count during active play
      // IMPORTANT: Use ?? (nullish coalescing) not || to properly handle 0 chips
      const chipCount = isHandResolved || !isInHand
        ? Number(agent.chip_count) ?? 0 
        : Number(ha!.chip_count) ?? 0

      const currentBet = isHandResolved || !isInHand ? 0 : Number(ha!.current_bet) || 0
      
      // Player is eliminated if they have 0 chips
      const isEliminated = chipCount <= 0

      // Truncate reasoning if too long to reduce payload size in UI
      const reasoning = lastAction?.reasoning 
        ? (lastAction.reasoning.length > 200 ? lastAction.reasoning.slice(0, 200) + '...' : lastAction.reasoning)
        : undefined

      return {
        id: ha?.id || `agent-${agent.id}`,
        agentId: agent.id,
        name: agent.name || 'Unknown',
        slug: agent.slug || 'unknown',
        avatarUrl: agent.avatar_url || null,
        chipCount,
        currentBet,
        holeCards: isInHand ? ((ha!.hole_cards || []) as CardNotation[]) : [],
        isFolded: isInHand ? ha!.is_folded : false,
        isAllIn: isInHand ? ha!.is_all_in : false,
        isEliminated,
        seatPosition: ha?.seat_position ?? agent.seat_position ?? 0,
        lastAction: reasoning,
        lastActionType: lastAction?.action_type,
        lastActionRound: lastAction?.round as Round | undefined,
      }
    })

    // Calculate odds based on current bets
    const betsByAgent = new Map<string, { total: number; count: number }>()
    spectatorBets.forEach(bet => {
      const current = betsByAgent.get(bet.agent_id) || { total: 0, count: 0 }
      betsByAgent.set(bet.agent_id, {
        total: current.total + bet.amount,
        count: current.count + 1
      })
    })

    const totalPool = Array.from(betsByAgent.values()).reduce((sum, b) => sum + b.total, 0)

    const odds: BettingOdds[] = players.map(p => {
      const bets = betsByAgent.get(p.agentId) || { total: 0, count: 0 }
      const winProbability = totalPool > 0 ? bets.total / totalPool : 1 / players.length
      return {
        agentId: p.agentId,
        agentName: p.name,
        odds: probabilityToOdds(winProbability),
        totalBets: bets.total,
        betCount: bets.count,
      }
    })

    const communityCards = (currentHand.community_cards || []) as CardNotation[]
    const round: Round = (currentHand.current_round as Round) || 'preflop'
    
    const visibleCardCount = 
      round === 'preflop' ? 0 :
      round === 'flop' ? 3 :
      round === 'turn' ? 4 :
      round === 'river' ? 5 : 0
    const visibleCommunityCards = communityCards.slice(0, visibleCardCount)

    const activePlayerId = currentHand.active_agent_id || null
    
    const dealerPosition = currentHand.dealer_position ?? 0
    const numPlayers = players.length
    const dealerPlayer = players.find(p => p.seatPosition === dealerPosition)
    const dealerPlayerId = dealerPlayer?.agentId || null
    
    const sbPosition = (dealerPosition + 1) % numPlayers
    const bbPosition = (dealerPosition + 2) % numPlayers
    const sbPlayer = players.find(p => p.seatPosition === sbPosition)
    const bbPlayer = players.find(p => p.seatPosition === bbPosition)
    const smallBlindPlayerId = sbPlayer?.agentId || null
    const bigBlindPlayerId = bbPlayer?.agentId || null

    // Transform actions for UI
    const transformedActions: GameAction[] = (handActions || []).map((a: AgentAction) => {
      const agent = agentList.find(ag => ag.id === a.agent_id)
      return {
        id: a.id,
        agentName: agent?.name || 'Unknown',
        agentSlug: agent?.slug || 'unknown',
        actionType: a.action_type,
        amount: a.amount,
        reasoning: a.reasoning,
        round: a.round,
        timestamp: a.created_at,
      }
    })
    
    // Add winner action to feed when hand is resolved
    if (isHandResolved && currentHand.winner_agent_id) {
      const winnerAgent = agentList.find(a => a.id === currentHand.winner_agent_id)
      const winnerHandAgent = handAgents.find(ha => ha.agent_id === currentHand.winner_agent_id)
      const winnerHoleCards = (winnerHandAgent?.hole_cards || []) as CardNotation[]
      
      transformedActions.unshift({
        id: `win-${currentHand.id}`,
        agentName: winnerAgent?.name || 'Unknown',
        agentSlug: winnerAgent?.slug || 'unknown',
        actionType: 'win',
        amount: Number(currentHand.pot_amount) || 0,
        reasoning: undefined,
        round: round as Round,
        timestamp: currentHand.resolved_at || new Date().toISOString(),
        winningHand: currentHand.winning_hand || undefined,
        holeCards: winnerHoleCards,
        potAmount: Number(currentHand.pot_amount) || 0,
      })
    }

    // Calculate side pots
    const calculateSidePots = (): SidePot[] => {
      if (players.length === 0) return []
      
      const activePlayers = players.filter(p => !p.isFolded)
      if (activePlayers.length === 0) return []
      
      const allInPlayers = activePlayers.filter(p => p.isAllIn)
      if (allInPlayers.length === 0) return []
      
      const allInAmounts = allInPlayers.map(p => p.currentBet)
      const maxBet = Math.max(...activePlayers.map(p => p.currentBet))
      const minAllIn = Math.min(...allInAmounts)
      
      if (maxBet === minAllIn) return []
      
      const pots: SidePot[] = []
      const sortedBets = [...new Set(activePlayers.map(p => p.currentBet))].sort((a, b) => a - b)
      let previousLevel = 0
      
      for (const betLevel of sortedBets) {
        const eligiblePlayers = activePlayers.filter(p => p.currentBet >= betLevel)
        const increment = betLevel - previousLevel
        
        if (increment > 0 && eligiblePlayers.length > 0) {
          pots.push({
            amount: increment * eligiblePlayers.length,
            eligiblePlayerIds: eligiblePlayers.map(p => p.agentId)
          })
        }
        previousLevel = betLevel
      }
      
      return pots.length > 1 ? pots : []
    }
    
    const sidePots = calculateSidePots()

    setGameState({
      handId: currentHand.id,
      handNumber: currentHand.hand_number,
      status: currentHand.status,
      round,
      communityCards: visibleCommunityCards,
      pot: Number(currentHand.pot_amount) || 0,
      sidePots,
      players,
      activePlayerId,
      dealerPlayerId,
      smallBlindPlayerId,
      bigBlindPlayerId,
      bettingClosesAt: currentHand.betting_closes_at,
      isBettingOpen: currentHand.status === 'betting_open',
      odds,
      totalPool,
      winnerId: currentHand.winner_agent_id,
      winningHand: currentHand.winning_hand,
    })

    setActions(transformedActions)
    setIsLoading(false)
  }, [supabase, options.lobbyId, options.gameId])

  // Initial data fetch
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const agentList = agents.length ? agents : await fetchAgents()
    await fetchCurrentHand(agentList)
  }, [fetchAgents, fetchCurrentHand, agents])

  // =============================================================================
  // OPTIMIZATION: Filtered realtime subscriptions
  // Only subscribe to changes relevant to the current game/hand
  // =============================================================================
  useEffect(() => {
    let isMounted = true
    const channels: ReturnType<typeof supabase.channel>[] = []

    const initialize = async () => {
      const agentList = await fetchAgents()
      if (isMounted) {
        await fetchCurrentHand(agentList)
      }
    }

    initialize()

    // Helper to trigger debounced refresh
    // Uses ref to avoid stale closure and infinite loops
    const triggerRefresh = () => {
      if (isMounted) {
        debouncedRefresh(() => fetchCurrentHand(agentsRef.current))
      }
    }

    // =============================================================================
    // FILTERED SUBSCRIPTION: hands table
    // Filter by game_id if provided, otherwise listen to all (fallback)
    // IMPORTANT: When hand status changes to 'resolved', we need to ensure
    // fresh agent data is fetched to show correct chip counts and eliminations
    // =============================================================================
    const handsFilter = options.gameId 
      ? `game_id=eq.${options.gameId}`
      : undefined

    const handsChannel = supabase
      .channel('hands-changes-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hands',
          filter: handsFilter,
        },
        (payload) => {
          const newHand = payload.new as Hand | null
          const oldHand = payload.old as Hand | null
          
          // Check if hand just resolved
          const justResolved = newHand?.status === 'resolved' && oldHand?.status !== 'resolved'
          
          if (justResolved) {
            console.log(`[End of Hand] Hand #${newHand?.hand_number} resolved! Winner: ${newHand?.winner_agent_id}`)
            console.log(`[End of Hand] Winning hand: ${newHand?.winning_hand}`)
          } else {
            console.log('Hand changed (filtered):', payload.eventType)
          }
          
          triggerRefresh()
        }
      )
      .subscribe()
    channels.push(handsChannel)

    // =============================================================================
    // FILTERED SUBSCRIPTION: hand_agents table
    // We need to dynamically filter by hand_id once we know the current hand
    // For now, use a broader subscription but with debouncing
    // =============================================================================
    const handAgentsChannel = supabase
      .channel('hand-agents-changes-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hand_agents',
          // Filter will be applied once we have currentHandId
          // For initial load, we accept broader subscription
        },
        (payload) => {
          // Only refresh if it's for the current hand
          const record = payload.new as HandAgent | null
          const oldRecord = payload.old as HandAgent | null
          const handId = record?.hand_id || oldRecord?.hand_id
          
          if (!currentHandId || handId === currentHandId) {
            console.log('Hand agent changed (filtered):', payload.eventType)
            triggerRefresh()
          }
        }
      )
      .subscribe()
    channels.push(handAgentsChannel)

    // =============================================================================
    // FILTERED SUBSCRIPTION: agent_actions table
    // =============================================================================
    const actionsChannel = supabase
      .channel('agent-actions-changes-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_actions',
        },
        (payload) => {
          // Only refresh if it's for the current hand
          const record = payload.new as AgentAction | null
          
          if (!currentHandId || record?.hand_id === currentHandId) {
            console.log('New action (filtered):', payload.eventType)
            triggerRefresh()
          }
        }
      )
      .subscribe()
    channels.push(actionsChannel)

    // =============================================================================
    // FILTERED SUBSCRIPTION: spectator_bets for live odds updates
    // =============================================================================
    const betsChannel = supabase
      .channel('spectator-bets-changes-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spectator_bets',
        },
        (payload) => {
          const record = payload.new as { hand_id?: string; game_id?: string } | null
          
          // Filter by game_id or hand_id
          if (options.gameId && record?.game_id === options.gameId) {
            console.log('New bet (filtered):', payload.eventType)
            triggerRefresh()
          } else if (currentHandId && record?.hand_id === currentHandId) {
            console.log('New bet (filtered):', payload.eventType)
            triggerRefresh()
          }
        }
      )
      .subscribe()
    channels.push(betsChannel)

    // =============================================================================
    // SUBSCRIPTION: agents table (chip count updates)
    // This is small (4 rows) so filtering is less critical
    // IMPORTANT: When agent chip counts update (end of hand), we need to ensure
    // the ref is updated IMMEDIATELY before triggering refresh
    // =============================================================================
    const agentsChannel = supabase
      .channel('agents-changes-optimized')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
        },
        async (payload) => {
          if (isMounted) {
            // Use payload data to update agents in place (optimization)
            const updatedAgent = payload.new as AgentLite
            const newChipCount = updatedAgent.chip_count
            const isEliminated = newChipCount <= 0
            
            console.log(`Agent updated: ${updatedAgent.name} - chips: $${newChipCount}${isEliminated ? ' (ELIMINATED)' : ''}`)
            
            // Update state and ref IMMEDIATELY for consistency
            // This ensures fetchCurrentHand gets fresh data
            const updatedAgents = agentsRef.current.map(a => 
              a.id === updatedAgent.id ? { ...a, chip_count: newChipCount } : a
            )
            agentsRef.current = updatedAgents
            setAgents(updatedAgents)
            
            triggerRefresh()
          }
        }
      )
      .subscribe()
    channels.push(agentsChannel)

    return () => {
      isMounted = false
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // Remove all channels
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  // NOTE: agents intentionally NOT in deps - we use agentsRef to avoid infinite loops
  }, [supabase, fetchAgents, fetchCurrentHand, debouncedRefresh, options.gameId, currentHandId])

  return {
    gameState,
    actions,
    isLoading,
    error,
    refresh,
  }
}
