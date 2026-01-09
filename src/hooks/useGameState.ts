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
 * Purpose: Subscribe to hands, hand_agents, and agent_actions for live updates
 */

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Hand, HandAgent, AgentAction, Agent, Lobby } from '@/types/database'
import type { Round, BettingOdds, CardNotation } from '@/types/poker'
import { probabilityToOdds } from '@/lib/poker/game-engine'

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

export function useGameState(options: UseGameStateOptions = {}): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actions, setActions] = useState<GameAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  
  const supabase = getSupabaseClient()

  // Fetch agents once on mount
  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching agents:', error)
      return []
    }
    
    setAgents(data || [])
    return data || []
  }, [supabase])

  // Fetch current hand and player states
  const fetchCurrentHand = useCallback(async (agentList: Agent[]) => {
    // Get active lobby
    const lobbyResult = await supabase
      .from('lobbies')
      .select('*')
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

    // Get latest hand
    const handResult = await supabase
      .from('hands')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('hand_number', { ascending: false })
      .limit(1)
    
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

    // Get hand agents
    const handAgentsResult = await supabase
      .from('hand_agents')
      .select('*')
      .eq('hand_id', currentHand.id)
      .order('seat_position', { ascending: true })

    if (handAgentsResult.error) {
      setError(new Error(handAgentsResult.error.message))
      setIsLoading(false)
      return
    }

    const handAgents = handAgentsResult.data as HandAgent[]

    // Get actions for this hand
    const actionsResult = await supabase
      .from('agent_actions')
      .select('*')
      .eq('hand_id', currentHand.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (actionsResult.error) {
      console.error('Error fetching actions:', actionsResult.error)
    }

    const handActions = (actionsResult.data || []) as AgentAction[]

    // Get spectator bets for odds calculation
    const betsResult = await supabase
      .from('spectator_bets')
      .select('agent_id, amount')
      .eq('hand_id', currentHand.id)
      .eq('status', 'pending')

    const spectatorBets = (betsResult.data || []) as { agent_id: string; amount: number }[]

    // Build player states
    // When hand is resolved, use chip counts from agents table (updated with winnings)
    // During active hand, use chip counts from hand_agents (snapshot at hand start minus bets)
    const isHandResolved = currentHand.status === 'resolved'
    
    const players: PlayerState[] = handAgents.map((ha) => {
      const agent = agentList.find(a => a.id === ha.agent_id)
      // Get the most recent action for this player (prioritize voluntary actions over blinds)
      const voluntaryAction = handActions.find(a => a.agent_id === ha.agent_id && a.action_type !== 'blind')
      const blindAction = handActions.find(a => a.agent_id === ha.agent_id && a.action_type === 'blind')
      const lastAction = voluntaryAction || blindAction // Show blind if no voluntary action yet

      // Use agent's current chip count (from agents table) when hand is resolved
      // This shows the updated total after winnings are applied
      const chipCount = isHandResolved 
        ? Number(agent?.chip_count) || 0 
        : Number(ha.chip_count) || 0

      // When hand is resolved, set currentBet to 0 - the pot has already been awarded
      // This prevents bet chips from reappearing after the winner animation ends
      const currentBet = isHandResolved ? 0 : Number(ha.current_bet) || 0

      return {
        id: ha.id,
        agentId: ha.agent_id,
        name: agent?.name || 'Unknown',
        slug: agent?.slug || 'unknown',
        avatarUrl: agent?.avatar_url || null,
        chipCount,
        currentBet,
        holeCards: (ha.hole_cards || []) as CardNotation[],
        isFolded: ha.is_folded,
        isAllIn: ha.is_all_in,
        seatPosition: ha.seat_position,
        lastAction: lastAction?.reasoning || undefined,
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
      // Calculate parimutuel odds
      const winProbability = totalPool > 0 ? bets.total / totalPool : 1 / players.length
      return {
        agentId: p.agentId,
        agentName: p.name,
        odds: probabilityToOdds(winProbability),
        totalBets: bets.total,
        betCount: bets.count,
      }
    })

    // Get round from database (tracks actual game progression)
    const communityCards = (currentHand.community_cards || []) as CardNotation[]
    const round: Round = (currentHand.current_round as Round) || 'preflop'
    
    // Filter community cards based on round (cards are pre-dealt but revealed progressively)
    const visibleCardCount = 
      round === 'preflop' ? 0 :
      round === 'flop' ? 3 :
      round === 'turn' ? 4 :
      round === 'river' ? 5 : 0
    const visibleCommunityCards = communityCards.slice(0, visibleCardCount)

    // Get active player from database (set by orchestrator)
    const activePlayerId = currentHand.active_agent_id || null
    
    // Get dealer from dealer_position in the hand
    const dealerPosition = currentHand.dealer_position ?? 0
    const numPlayers = players.length
    const dealerPlayer = players.find(p => p.seatPosition === dealerPosition)
    const dealerPlayerId = dealerPlayer?.agentId || null
    
    // Calculate SB and BB positions relative to dealer
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
        // Winner-specific fields
        winningHand: currentHand.winning_hand || undefined,
        holeCards: winnerHoleCards,
        potAmount: Number(currentHand.pot_amount) || 0,
      })
    }

    // Calculate side pots - ONLY when there are all-in players with different amounts
    const calculateSidePots = (): SidePot[] => {
      if (players.length === 0) return []
      
      const activePlayers = players.filter(p => !p.isFolded)
      if (activePlayers.length === 0) return []
      
      const allInPlayers = activePlayers.filter(p => p.isAllIn)
      
      // Only show side pots if someone is all-in
      if (allInPlayers.length === 0) return []
      
      // Check if all-in players have different amounts (creating side pots)
      const allInAmounts = allInPlayers.map(p => p.currentBet)
      const maxBet = Math.max(...activePlayers.map(p => p.currentBet))
      const minAllIn = Math.min(...allInAmounts)
      
      // If everyone's all-in for the same amount, or no one bet more than the all-in, no side pots
      if (maxBet === minAllIn) return []
      
      // Build side pots based on all-in levels
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
      
      // Only return pots if there are multiple (indicating actual side pots)
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
  }, [supabase, options.lobbyId])

  // Initial data fetch
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const agentList = agents.length ? agents : await fetchAgents()
    await fetchCurrentHand(agentList)
  }, [fetchAgents, fetchCurrentHand, agents])

  // Set up realtime subscriptions
  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      const agentList = await fetchAgents()
      if (isMounted) {
        await fetchCurrentHand(agentList)
      }
    }

    initialize()

    // Subscribe to hands changes
    const handsChannel = supabase
      .channel('hands-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hands',
        },
        (payload) => {
          console.log('Hand changed:', payload)
          // Refresh on any hand change
          if (isMounted) {
            fetchCurrentHand(agents)
          }
        }
      )
      .subscribe()

    // Subscribe to hand_agents changes
    const handAgentsChannel = supabase
      .channel('hand-agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hand_agents',
        },
        (payload) => {
          console.log('Hand agent changed:', payload)
          if (isMounted) {
            fetchCurrentHand(agents)
          }
        }
      )
      .subscribe()

    // Subscribe to agent_actions changes
    const actionsChannel = supabase
      .channel('agent-actions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_actions',
        },
        (payload) => {
          console.log('New action:', payload)
          if (isMounted) {
            fetchCurrentHand(agents)
          }
        }
      )
      .subscribe()

    // Subscribe to spectator_bets for live odds updates
    const betsChannel = supabase
      .channel('spectator-bets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spectator_bets',
        },
        (payload) => {
          console.log('New bet:', payload)
          if (isMounted) {
            fetchCurrentHand(agents)
          }
        }
      )
      .subscribe()

    // Subscribe to agents changes (chip count updates after hand resolution)
    const agentsChannel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
        },
        async (payload) => {
          console.log('Agent updated:', payload)
          if (isMounted) {
            // Refetch agents to get updated chip counts
            const updatedAgents = await fetchAgents()
            fetchCurrentHand(updatedAgents)
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(handsChannel)
      supabase.removeChannel(handAgentsChannel)
      supabase.removeChannel(actionsChannel)
      supabase.removeChannel(betsChannel)
      supabase.removeChannel(agentsChannel)
    }
  }, [supabase, fetchAgents, fetchCurrentHand, agents])

  return {
    gameState,
    actions,
    isLoading,
    error,
    refresh,
  }
}

