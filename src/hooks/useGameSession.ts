/**
 * useGameSession Hook
 * Real-time subscription to 25-hand game sessions via Supabase
 * 
 * Created: Jan 10, 2026
 * Purpose: Subscribe to games table, track game lifecycle, countdown, standings, and user bets
 * 
 * Updated: Jan 10, 2026 - EGRESS OPTIMIZATION: Major refactor to reduce Supabase egress
 *                        - Filter subscriptions by game_id (not table-wide)
 *                        - Select specific columns instead of SELECT *
 *                        - Add debouncing to batch rapid updates
 *                        - Removed duplicate subscriptions (agents already in useGameState)
 * Updated: Jan 12, 2026 - CRITICAL FIX: Eliminated player display
 *                        - Changed chip_count || 1000 → chip_count ?? 1000 (nullish coalescing)
 *                        - Fixed isEliminated to properly detect 0 chip counts
 *                        - Sort eliminated players to END of standings list
 * Updated: Jan 14, 2026 - Added debug logging for game resolution flow
 *                        - Helps diagnose why winner modal might not show
 *                        - Fixed countdown getting stuck at "0:01" - now shows "Starting..."
 * Updated: Jan 23, 2026 - Fixed realtime subscription for spectator_bets not triggering
 *                        - Added unique channel names per game to avoid channel reuse issues
 *                        - Better logging for bet changes
 * Updated: Jan 26, 2026 - CRITICAL FIX: Resolved games now use final chip counts from hand_agents
 *                        - Previously, standings for resolved games showed reset agent chips (1000)
 *                        - Now fetches chip counts from the last hand's hand_agents table
 *                        - This ensures correct final standings display
 * 
 * Features:
 * - Game countdown timer (5 minutes between games)
 * - Auto-refresh standings and eliminations
 * - Track user's bets on current game
 * - Unclaimed winnings detection
 * - Eliminated players properly displayed (sorted last, visual indicators)
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database, Game, Agent, SpectatorBet } from '@/types/database'
import type { GameSession, AgentStanding, GameBettingPool, UserGameBet, GameSessionStatus } from '@/types/poker'

// =============================================================================
// EGRESS OPTIMIZATION: Column selections
// =============================================================================

// Only fetch agent fields needed for standings (excludes system_prompt)
const AGENT_COLUMNS = 'id, name, slug, avatar_url, chip_count'

// Game columns - all needed for session state (including deck_commitment for verification)
const GAME_COLUMNS = 'id, lobby_id, game_number, status, current_hand_number, max_hands, betting_closes_after_hand, winner_agent_id, scheduled_start_at, started_at, betting_closed_at, resolved_at, created_at, on_chain_game_id, deck_commitment'

// Spectator bet columns for pool calculation
const BET_POOL_COLUMNS = 'agent_id, amount'

// User bet columns (full data for their own bets)
const USER_BET_COLUMNS = 'id, game_id, agent_id, amount, odds_at_bet, status, payout_amount, claimed, claimed_at'

// Unclaimed bet columns
const UNCLAIMED_BET_COLUMNS = 'id, game_id, agent_id, amount, odds_at_bet, status, payout_amount'

// Debounce delay in ms
const DEBOUNCE_MS = 150

// Constants
const COUNTDOWN_INTERVAL_MS = 1000 // Update countdown every second

// =============================================================================
// Types
// =============================================================================

export interface GameSessionState {
  // Current game info
  game: GameSession | null
  status: GameSessionStatus
  
  // Countdown (for waiting state)
  countdown: {
    secondsRemaining: number
    formattedTime: string // "4:32"
  } | null
  
  // Standings (chip counts and positions)
  standings: AgentStanding[]
  
  // Betting pool
  bettingPool: GameBettingPool | null
  
  // User's bets on this game
  userBets: UserGameBet[]
  
  // Unclaimed winnings from past games
  unclaimedWinnings: {
    totalAmount: number
    gameCount: number
    bets: UserGameBet[]
  }
  
  // Game progress
  progress: {
    currentHand: number
    maxHands: number
    bettingClosesAfterHand: number
    isBettingOpen: boolean
  }
  
  // Winner (for resolved games)
  winner: {
    agentId: string
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
}

interface UseGameSessionOptions {
  lobbyId?: string
  gameId?: string  // When provided, fetches this specific game instead of latest
  walletAddress?: string // To fetch user's bets
}

interface UseGameSessionReturn {
  session: GameSessionState | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const DEFAULT_STARTING_CHIPS = 1000

// Type for agent without system_prompt (optimized fetch)
type AgentLite = Pick<Agent, 'id' | 'name' | 'slug' | 'avatar_url' | 'chip_count'>

export function useGameSession(options: UseGameSessionOptions = {}): UseGameSessionReturn {
  const [session, setSession] = useState<GameSessionState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRefreshRef = useRef(false)
  const agentsRef = useRef<AgentLite[]>([])
  const gameStartingRef = useRef<string | null>(null) // Prevent multiple start_game calls
  
  const supabase = getSupabaseClient()
  
  // Keep ref in sync with state
  agentsRef.current = agents
  const { lobbyId, gameId: specificGameId, walletAddress } = options

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate seconds remaining until scheduled start
  const calculateSecondsRemaining = (scheduledStartAt: string | null): number => {
    if (!scheduledStartAt) return 0
    const targetTime = new Date(scheduledStartAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((targetTime - now) / 1000))
  }

  // =============================================================================
  // OPTIMIZATION: Debounced refresh
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
  // OPTIMIZATION: Fetch agents with specific columns
  // =============================================================================
  const fetchAgents = useCallback(async (): Promise<AgentLite[]> => {
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
  // OPTIMIZATION: Fetch current game with specific columns
  // =============================================================================
  const fetchCurrentGame = useCallback(async (agentList: AgentLite[]) => {
    try {
      // Get active lobby - minimal columns
      const { data: lobbies, error: lobbyError } = await supabase
        .from('lobbies')
        .select('id, status')
        .eq('status', 'active')
        .limit(1)
      
      if (lobbyError) throw new Error(lobbyError.message)
      
      const typedLobbies = lobbies as { id: string; status: string }[] | null
      
      if (!typedLobbies || typedLobbies.length === 0) {
        setSession(null)
        setIsLoading(false)
        return
      }

      const currentLobbyId = lobbyId || typedLobbies[0].id

      // Get game with specific columns
      // If specificGameId is provided, fetch that exact game; otherwise get the latest
      let gameQuery = supabase
        .from('games')
        .select(GAME_COLUMNS)
      
      if (specificGameId) {
        // Fetch the specific game by ID
        gameQuery = gameQuery.eq('id', specificGameId)
      } else {
        // Fetch the latest game in the lobby
        gameQuery = gameQuery
          .eq('lobby_id', currentLobbyId)
          .order('game_number', { ascending: false })
          .limit(1)
      }
      
      const { data: games, error: gameError } = await gameQuery
      
      if (gameError) throw new Error(gameError.message)

      const typedGames = games as Game[] | null
      
      let currentGame: Game | null = typedGames && typedGames.length > 0 ? typedGames[0] : null
      const gameStatus: GameSessionStatus = currentGame?.status as GameSessionStatus || 'waiting'

      // Track current game ID for filtered subscriptions
      if (currentGame) {
        setCurrentGameId(currentGame.id)
      }

      // Build standings from agents
      // CRITICAL: For resolved games, use chip counts from the last hand's hand_agents table
      // because the agents table may have been reset to 1000 for the next game
      let gameChipCounts: Map<string, number> | null = null
      
      if (currentGame && (gameStatus === 'resolved' || gameStatus === 'betting_closed' || gameStatus === 'betting_open')) {
        // Fetch the latest hand for this game to get final chip counts
        const { data: latestHand } = await supabase
          .from('hands')
          .select('id')
          .eq('game_id', currentGame.id)
          .order('hand_number', { ascending: false })
          .limit(1)
          .single()
        
        if (latestHand) {
          const { data: handAgents } = await supabase
            .from('hand_agents')
            .select('agent_id, chip_count')
            .eq('hand_id', latestHand.id)
          
          if (handAgents && handAgents.length > 0) {
            gameChipCounts = new Map(
              (handAgents as { agent_id: string; chip_count: number }[]).map(ha => [ha.agent_id, ha.chip_count])
            )
          }
        }
      }
      
      // Build standings - use game-specific chip counts if available, else fall back to agents table
      // CRITICAL: Use ?? (nullish coalescing) not || to properly handle 0 chip counts
      // 0 || 1000 = 1000 (wrong!) vs 0 ?? 1000 = 0 (correct!)
      const standings: AgentStanding[] = agentList.map((agent, index) => {
        // Prefer game-specific chip count (from hand_agents) over global agent chip count
        const chipCount = gameChipCounts?.get(agent.id) ?? agent.chip_count ?? DEFAULT_STARTING_CHIPS
        return {
          agentId: agent.id,
          name: agent.name,
          avatarUrl: agent.avatar_url,
          chipCount,
          isEliminated: chipCount <= 0,
          eliminatedAtHand: null,
          position: index + 1,
        }
      })
      
      // Sort: Active players by chip count (highest first), eliminated players last
      standings.sort((a, b) => {
        // Eliminated players always go to the end
        if (a.isEliminated && !b.isEliminated) return 1
        if (!a.isEliminated && b.isEliminated) return -1
        // Among active players, sort by chip count (highest first)
        return b.chipCount - a.chipCount
      })
      standings.forEach((s, i) => { s.position = i + 1 })

      // Fetch betting pool with minimal columns
      let bettingPool: GameBettingPool | null = null
      if (currentGame) {
        const { data: bets } = await supabase
          .from('spectator_bets')
          .select(BET_POOL_COLUMNS)
          .eq('game_id', currentGame.id)
          .eq('status', 'pending')

        const typedBets = bets as { agent_id: string; amount: number }[] | null

        if (typedBets && typedBets.length > 0) {
          const agentPools = new Map<string, { pool: number; betCount: number }>()
          let totalPool = 0

          typedBets.forEach((bet) => {
            const current = agentPools.get(bet.agent_id) || { pool: 0, betCount: 0 }
            agentPools.set(bet.agent_id, {
              pool: current.pool + Number(bet.amount),
              betCount: current.betCount + 1,
            })
            totalPool += Number(bet.amount)
          })

          bettingPool = {
            gameId: currentGame.id,
            totalPool,
            agentPools: agentList.map(agent => {
              const poolData = agentPools.get(agent.id) || { pool: 0, betCount: 0 }
              return {
                agentId: agent.id,
                agentName: agent.name,
                pool: poolData.pool,
                odds: totalPool > 0 && poolData.pool > 0 
                  ? totalPool / poolData.pool 
                  : agentList.length,
                betCount: poolData.betCount,
              }
            }),
            isOpen: gameStatus === 'waiting' || gameStatus === 'betting_open',
          }
        }
      }

      // Fetch user's bets on current game
      let userBets: UserGameBet[] = []
      if (currentGame && walletAddress) {
        const { data: userBetData } = await supabase
          .from('spectator_bets')
          .select(USER_BET_COLUMNS)
          .eq('game_id', currentGame.id)
          .eq('wallet_address', walletAddress)

        const typedUserBetData = userBetData as SpectatorBet[] | null

        if (typedUserBetData) {
          userBets = typedUserBetData.map((bet) => {
            const agent = agentList.find(a => a.id === bet.agent_id)
            return {
              id: bet.id,
              gameId: currentGame!.id,
              agentId: bet.agent_id,
              agentName: agent?.name || 'Unknown',
              amount: Number(bet.amount),
              oddsAtBet: Number(bet.odds_at_bet) || 1,
              status: bet.status as 'pending' | 'won' | 'lost',
              potentialPayout: Number(bet.amount) * (Number(bet.odds_at_bet) || 1),
              claimed: bet.claimed || false,
              claimedAt: bet.claimed_at,
              placedAt: bet.created_at,
              betTxHash: bet.tx_hash || null,
              claimTxHash: bet.payout_tx_hash || null,
            }
          })
        }
      }

      // Fetch unclaimed winnings from past games
      let unclaimedWinnings = { totalAmount: 0, gameCount: 0, bets: [] as UserGameBet[] }
      if (walletAddress) {
        const { data: unclaimedBets } = await supabase
          .from('spectator_bets')
          .select(UNCLAIMED_BET_COLUMNS)
          .eq('wallet_address', walletAddress)
          .eq('status', 'won')
          .eq('claimed', false)

        const typedUnclaimedBets = unclaimedBets as SpectatorBet[] | null

        if (typedUnclaimedBets && typedUnclaimedBets.length > 0) {
          const gameIds = new Set(typedUnclaimedBets.map(b => b.game_id))
          unclaimedWinnings = {
            totalAmount: typedUnclaimedBets.reduce((sum, b) => sum + Number(b.payout_amount || 0), 0),
            gameCount: gameIds.size,
            bets: typedUnclaimedBets.map((bet) => {
              const agent = agentList.find(a => a.id === bet.agent_id)
              return {
                id: bet.id,
                gameId: bet.game_id || '',
                agentId: bet.agent_id,
                agentName: agent?.name || 'Unknown',
                amount: Number(bet.amount),
                oddsAtBet: Number(bet.odds_at_bet) || 1,
                status: 'won' as const,
                potentialPayout: Number(bet.payout_amount || 0),
                claimed: false,
                claimedAt: null,
                placedAt: new Date().toISOString(), // Not available in this query
                betTxHash: null,
                claimTxHash: null,
              }
            }),
          }
        }
      }

      // Calculate countdown
      let countdown: { secondsRemaining: number; formattedTime: string } | null = null
      if (currentGame && gameStatus === 'waiting' && currentGame.scheduled_start_at) {
        const seconds = calculateSecondsRemaining(currentGame.scheduled_start_at)
        countdown = {
          secondsRemaining: seconds,
          formattedTime: formatTime(seconds),
        }
      }

      // Get winner info for resolved games
      let winner: GameSessionState['winner'] = null
      if (currentGame && gameStatus === 'resolved' && currentGame.winner_agent_id) {
        console.log('[useGameSession] Game resolved, looking for winner:', currentGame.winner_agent_id)
        const winnerAgent = agentList.find(a => a.id === currentGame!.winner_agent_id)
        if (winnerAgent) {
          // Use game-specific chip count (from hand_agents) for accurate final chip count
          const finalChipCount = gameChipCounts?.get(winnerAgent.id) ?? winnerAgent.chip_count ?? 0
          winner = {
            agentId: winnerAgent.id,
            name: winnerAgent.name,
            avatarUrl: winnerAgent.avatar_url,
            finalChipCount,
          }
          console.log('[useGameSession] Winner found:', winner.name, 'with', finalChipCount, 'chips')
        } else {
          console.warn('[useGameSession] Winner agent not found in agent list!')
        }
      } else if (currentGame && gameStatus === 'resolved') {
        console.warn('[useGameSession] Game resolved but no winner_agent_id set')
      }

      // Build game session from database row
      const gameSession: GameSession | null = currentGame ? {
        id: currentGame.id,
        lobbyId: currentGame.lobby_id,
        gameNumber: currentGame.game_number,
        status: gameStatus,
        currentHandNumber: currentGame.current_hand_number,
        maxHands: currentGame.max_hands,
        bettingClosesAfterHand: currentGame.betting_closes_after_hand,
        winnerAgentId: currentGame.winner_agent_id,
        scheduledStartAt: currentGame.scheduled_start_at,
        startedAt: currentGame.started_at,
        bettingClosedAt: currentGame.betting_closed_at,
        resolvedAt: currentGame.resolved_at,
        createdAt: currentGame.created_at,
        onChainGameId: currentGame.on_chain_game_id ?? null,
        deckCommitment: (currentGame as { deck_commitment?: string | null }).deck_commitment ?? null,
      } : null

      setSession({
        game: gameSession,
        status: gameStatus,
        countdown,
        standings,
        bettingPool,
        userBets,
        unclaimedWinnings,
        progress: {
          currentHand: currentGame?.current_hand_number || 0,
          maxHands: currentGame?.max_hands || 25,
          bettingClosesAfterHand: currentGame?.betting_closes_after_hand || 5,
          isBettingOpen: gameStatus === 'waiting' || gameStatus === 'betting_open',
        },
        winner,
      })

      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching game session:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch game session'))
      setIsLoading(false)
    }
  }, [supabase, lobbyId, specificGameId, walletAddress])

  // Refresh function
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const agentList = agents.length ? agents : await fetchAgents()
    await fetchCurrentGame(agentList)
  }, [fetchAgents, fetchCurrentGame, agents])

  // Auto-start game when countdown finishes (with dedup guard)
  const startGameWhenReady = useCallback(async (gameId: string) => {
    // Prevent multiple simultaneous start attempts for the same game
    if (gameStartingRef.current === gameId) {
      return // Already starting this game
    }
    gameStartingRef.current = gameId
    
    try {
      console.log('Countdown finished, starting game:', gameId)
      const response = await fetch('/api/game/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game', gameId }),
      })
      const data = await response.json()
      if (data.success) {
        console.log('Game started successfully')
        await refresh()
      } else {
        // Only log if it's not a "already started" type error
        if (!data.error?.includes('not ready') && !data.error?.includes('already')) {
          console.error('Failed to start game:', data.error)
        }
      }
    } catch (err) {
      console.error('Error starting game:', err)
    } finally {
      // Clear the guard after a delay to allow status to update
      setTimeout(() => {
        if (gameStartingRef.current === gameId) {
          gameStartingRef.current = null
        }
      }, 2000)
    }
  }, [refresh])

  // Countdown timer effect
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    if (session?.status === 'waiting' && session?.game?.scheduledStartAt) {
      countdownIntervalRef.current = setInterval(() => {
        setSession(prev => {
          if (!prev || !prev.game?.scheduledStartAt || !prev.game?.id) return prev
          
          const seconds = calculateSecondsRemaining(prev.game.scheduledStartAt)
          
          if (seconds <= 0) {
            startGameWhenReady(prev.game.id)
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            // Update to show "Starting..." state instead of frozen timer
            return {
              ...prev,
              countdown: {
                secondsRemaining: 0,
                formattedTime: 'Starting...',
              },
            }
          }
          
          return {
            ...prev,
            countdown: {
              secondsRemaining: seconds,
              formattedTime: formatTime(seconds),
            },
          }
        })
      }, COUNTDOWN_INTERVAL_MS)
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [session?.status, session?.game?.scheduledStartAt, startGameWhenReady])

  // =============================================================================
  // OPTIMIZATION: Filtered realtime subscriptions
  // =============================================================================
  useEffect(() => {
    let isMounted = true
    const channels: ReturnType<typeof supabase.channel>[] = []

    const initialize = async () => {
      const agentList = await fetchAgents()
      if (isMounted) {
        await fetchCurrentGame(agentList)
      }
    }

    initialize()

    // Helper to trigger debounced refresh
    // Uses ref to avoid stale closure and infinite loops
    const triggerRefresh = () => {
      if (isMounted) {
        debouncedRefresh(() => fetchCurrentGame(agentsRef.current))
      }
    }

    // Generate unique channel suffix to avoid channel reuse issues
    const channelSuffix = specificGameId || currentGameId || Date.now().toString()

    // =============================================================================
    // FILTERED SUBSCRIPTION: games table
    // Filter by lobby_id if available
    // =============================================================================
    const gamesChannel = supabase
      .channel(`games-session-${channelSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          // Filter would be: filter: lobbyId ? `lobby_id=eq.${lobbyId}` : undefined
          // But we only have 1-3 games, so the overhead is minimal
        },
        (payload) => {
          console.log('[useGameSession] Game changed:', payload.eventType)
          triggerRefresh()
        }
      )
      .subscribe()
    channels.push(gamesChannel)

    // =============================================================================
    // FILTERED SUBSCRIPTION: spectator_bets (for live pool updates)
    // Uses game_id filter when available for efficient querying
    // =============================================================================
    const targetGameId = specificGameId || currentGameId
    const betsFilter = targetGameId ? `game_id=eq.${targetGameId}` : undefined
    
    const betsChannel = supabase
      .channel(`spectator-bets-session-${channelSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spectator_bets',
          filter: betsFilter,
        },
        (payload) => {
          console.log('[useGameSession] Bet changed:', payload.eventType, payload.new)
          triggerRefresh()
        }
      )
      .subscribe()
    channels.push(betsChannel)

    // =============================================================================
    // NOTE: We intentionally DON'T subscribe to agents here
    // The useGameState hook already handles agent updates
    // This prevents duplicate subscriptions when both hooks are used
    // =============================================================================

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
  // specificGameId added to deps to recreate channels when game changes
  }, [supabase, fetchAgents, fetchCurrentGame, debouncedRefresh, currentGameId, specificGameId])

  return {
    session,
    isLoading,
    error,
    refresh,
  }
}
