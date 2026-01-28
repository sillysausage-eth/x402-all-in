/**
 * Live Game Page - /game/[id]
 * Full poker table view with 3 states: Countdown, Live, Finished
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 10, 2026 - Pass gameId to useGameState for per-game hand tracking
 * Updated: Jan 10, 2026 - Pass isEliminated to agents for bust player display
 *                       - Eliminated players (chipCount <= 0) show at table but marked as BUST
 * Updated: Jan 12, 2026 - Removed isOpen/closesAt props from BettingPanel (no timer)
 *                       - Betting is now hand-based (open during hands 1-5)
 * Updated: Jan 12, 2026 - Removed FloatingBackButton, added subtle inline back arrow
 *                       - Header already provides home navigation via logo + HOME tab
 * Updated: Jan 13, 2026 - Added GameFinished component for resolved games
 *                       - Improved game end detection and winner modal triggering
 *                       - Better session refresh after game resolution
 * Updated: Jan 13, 2026 - COUNTDOWN FIX: Use gameSession.countdown instead of local state
 *                       - Previously, entering the game page reset countdown to 60s
 *                       - Now uses scheduled_start_at from database via useGameSession
 *                       - Countdown is consistent across Home and Game pages
 * Updated: Jan 13, 2026 - Pass gameNumber prop to BettingPanel for dynamic title
 * Updated: Jan 14, 2026 - Fixed winner modal not showing on game end
 *                       - Added polling for winner data if not immediately available
 *                       - Improved logging for debugging game end flow
 *                       - Fixed runFullGame getting stuck at end of hand 5
 *                       - Now checks for status='resolved' response from next_hand API
 *                       - Backend MAX_HANDS is 5, frontend properly detects game end
 * Updated: Jan 23, 2026 - All bets (including x402) now go on-chain
 *                       - BettingPanel uses on-chain data as source of truth
 * Updated: Jan 26, 2026 - FIX: Claim UI not showing after game ends
 *                       - Added polling for on-chain data when game finishes
 *                       - useBettingData only auto-refreshes when Open, not Resolved
 *                       - Now polls every 2s until on-chain status is Resolved
 * Purpose: Dedicated page for watching a live poker game
 * 
 * States:
 * 1. Pre-Game Countdown (uses database scheduled_start_at)
 * 2. Live Game (up to 25 hands)
 * 3. Game Finished (winner announcement + CTAs with GameFinished component)
 * 
 * Features:
 * - Inline back arrow for contextual navigation
 * - Real-time game state via Supabase subscriptions
 * - Betting panel and action feed
 * - Winner celebration modal
 * - Eliminated players shown with BUST indicator
 * - GameFinished view when game ends with standings and bet results
 */

'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PokerTable } from '@/components/poker/PokerTable'
import { BettingPanel } from '@/components/poker/BettingPanel'
import { ActionFeed } from '@/components/poker/ActionFeed'
import { GameCountdown } from '@/components/poker/GameCountdown'
import { ClaimWinnings } from '@/components/poker/ClaimWinnings'
import { useFormattedBettingData } from '@/lib/contracts/hooks'
import { GameStatus as ContractGameStatus } from '@/lib/contracts'
import { GameFinished } from '@/components/poker/GameFinished'
import { GameStatus } from '@/components/poker/GameStatus'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { useGameState, useGameSession } from '@/hooks'
import type { Round, BettingOdds, ActionType, AgentStanding } from '@/types/poker'

// Mock data for when no game is active
const MOCK_AGENTS = [
  { id: '1', name: 'Chamath', slug: 'chamath', avatarUrl: '/avatars/Chamath.png', chipCount: 1000, currentBet: 0, holeCards: [] as string[], isFolded: false, isAllIn: false, lastAction: 'Waiting...', seatPosition: 0 },
  { id: '2', name: 'Sacks', slug: 'sacks', avatarUrl: '/avatars/Sacks.png', chipCount: 1000, currentBet: 0, holeCards: [] as string[], isFolded: false, isAllIn: false, lastAction: 'Waiting...', seatPosition: 1 },
  { id: '3', name: 'Jason', slug: 'jason', avatarUrl: '/avatars/Jason.png', chipCount: 1000, currentBet: 0, holeCards: [] as string[], isFolded: false, isAllIn: false, lastAction: 'Waiting...', seatPosition: 2 },
  { id: '4', name: 'Friedberg', slug: 'friedberg', avatarUrl: '/avatars/Freidberg.png', chipCount: 1000, currentBet: 0, holeCards: [] as string[], isFolded: false, isAllIn: false, lastAction: 'Waiting...', seatPosition: 3 },
]

const MOCK_ODDS: BettingOdds[] = [
  { agentId: '1', agentName: 'Chamath', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '2', agentName: 'Sacks', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '3', agentName: 'Jason', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '4', agentName: 'Friedberg', odds: 4.0, totalBets: 0, betCount: 0 },
]

interface GamePageProps {
  params: Promise<{ id: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const resolvedParams = use(params)
  const gameId = resolvedParams.id
  const router = useRouter()
  
  // Pass gameId to both hooks for per-game tracking
  // IMPORTANT: This ensures we only show data for THIS specific game, not the latest game
  const { gameState, actions, isLoading, error, refresh } = useGameState({ gameId })
  const { session: gameSession, isLoading: sessionLoading, refresh: refreshSession } = useGameSession({ gameId })
  
  // On-chain betting data for ClaimWinnings component
  const onChainGameId = gameSession?.game?.onChainGameId ?? null
  const onChainGameIdBigInt = onChainGameId !== null ? BigInt(onChainGameId) : null
  const onChainData = useFormattedBettingData(onChainGameIdBigInt)
  
  const [isRunningHand, setIsRunningHand] = useState(false)
  const [isRunningGame, setIsRunningGame] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)

  // Determine current game state
  const isGameWaiting = gameSession?.status === 'waiting'
  const isGameLive = gameSession?.status === 'betting_open' || gameSession?.status === 'betting_closed'
  const isGameFinished = gameSession?.status === 'resolved'
  
  // Use countdown from useGameSession - this is calculated from scheduled_start_at in the database
  // This ensures the countdown is consistent across all pages
  const countdownSeconds = gameSession?.countdown?.secondsRemaining ?? 0
  const isInCountdown = isGameWaiting && countdownSeconds > 0

  // Verify this is the correct game
  const isCorrectGame = gameSession?.game?.id === gameId

  // Game progress
  const gameNumber = gameSession?.game?.gameNumber || 0
  const currentHand = gameSession?.progress.currentHand || 0
  const maxHands = gameSession?.progress.maxHands || 25
  const bettingOpen = gameSession?.progress.isBettingOpen || false
  const bettingClosesAfterHand = gameSession?.progress.bettingClosesAfterHand || 5

  // Standings
  const standings: AgentStanding[] = gameSession?.standings || MOCK_AGENTS.map((a, i) => ({
    agentId: a.id,
    name: a.name,
    avatarUrl: a.avatarUrl,
    chipCount: a.chipCount,
    isEliminated: false,
    eliminatedAtHand: null,
    position: i + 1,
  }))

  // Auto-refresh session when game becomes resolved to get winner data
  useEffect(() => {
    if (!isGameFinished) return
    
    // If we have winner data, we're done
    if (gameSession?.winner) {
      console.log('[GamePage] Game finished with winner:', gameSession.winner.name)
      return
    }
    
    // Game is finished but we don't have winner data yet - poll once
    console.log('[GamePage] Game finished but no winner data, refreshing session...')
    const timeoutId = setTimeout(() => {
      refreshSession()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [isGameFinished, gameSession?.winner, refreshSession])

  // Auto-refresh on-chain data when game becomes resolved to show claim UI
  // The useBettingData hook only auto-refreshes when game is Open, not Resolved
  // Poll every 2 seconds until on-chain status is Resolved (max 30 seconds)
  const onChainRefreshRef = useRef(onChainData.refresh)
  onChainRefreshRef.current = onChainData.refresh
  
  useEffect(() => {
    if (!isGameFinished || !onChainGameId) return
    
    // If on-chain data already shows Resolved, no need to poll
    if (onChainData.gameStatus === ContractGameStatus.Resolved) {
      console.log('[GamePage] On-chain data shows Resolved, claim UI should be visible')
      return
    }
    
    // Game finished in DB but on-chain data hasn't updated yet - poll until resolved
    console.log('[GamePage] Game finished but on-chain status not Resolved, starting poll...')
    let pollCount = 0
    const maxPolls = 15 // 30 seconds max (15 * 2s)
    let stopped = false
    
    const poll = () => {
      if (stopped) return
      pollCount++
      console.log(`[GamePage] Polling on-chain data (attempt ${pollCount}/${maxPolls})...`)
      onChainRefreshRef.current()
      
      if (pollCount >= maxPolls) {
        console.warn('[GamePage] Max polls reached, stopping on-chain data refresh')
        stopped = true
      }
    }
    
    // Initial refresh after 1 second, then every 2 seconds
    const initialTimeout = setTimeout(poll, 1000)
    const pollInterval = setInterval(poll, 2000)
    
    return () => {
      stopped = true
      clearInterval(pollInterval)
      clearTimeout(initialTimeout)
    }
  }, [isGameFinished, onChainGameId, onChainData.gameStatus])

  // Auto-start game when countdown reaches zero
  // The countdown is managed by useGameSession which auto-calls startGameWhenReady
  // We just need to refresh the session when the countdown ends
  useEffect(() => {
    if (isGameWaiting && countdownSeconds === 0) {
      // Countdown finished - the useGameSession hook will trigger start_game
      // Just refresh to pick up the new status
      refreshSession()
    }
  }, [isGameWaiting, countdownSeconds, refreshSession])

  // Run a single hand
  const runHand = useCallback(async () => {
    setIsRunningHand(true)
    
    try {
      const startResponse = await fetch('/api/game/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_hand' }),
      })
      const startData = await startResponse.json()
      
      if (!startData.success || !startData.handId) {
        console.error('Failed to start hand:', startData)
        setIsRunningHand(false)
        return
      }
      
      const handId = startData.handId
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      let handResolved = false
      let actionCount = 0
      const MAX_ACTIONS = 50
      
      while (!handResolved && actionCount < MAX_ACTIONS) {
        actionCount++
        
        const actionResponse = await fetch('/api/game/orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next_action', handId }),
        })
        const actionData = await actionResponse.json()
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (actionData.message?.includes('advance')) {
          const advanceResponse = await fetch('/api/game/orchestrator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'advance_round', handId }),
          })
          const advanceData = await advanceResponse.json()
          
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          if (advanceData.resolved) {
            handResolved = true
          }
        }
        
        if (actionData.runningOut) {
          await new Promise(resolve => setTimeout(resolve, 1500))
          continue
        }
        
        if (actionData.resolved) {
          handResolved = true
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      await refresh()
      
    } catch (err) {
      console.error('Failed to run hand:', err)
    } finally {
      setIsRunningHand(false)
    }
  }, [refresh])

  // Start game (after countdown)
  const handleStartGame = useCallback(async () => {
    try {
      const response = await fetch('/api/game/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game', gameId }),
      })
      const data = await response.json()
      if (data.success) {
        await refreshSession()
      }
    } catch (err) {
      console.error('Failed to start game:', err)
    }
  }, [gameId, refreshSession])

  // Run full game
  const runFullGame = useCallback(async () => {
    setIsRunningGame(true)
    setShouldStop(false)
    
    try {
      let gameEnded = false
      let handsPlayed = 0
      // Note: Backend MAX_HANDS is 5 for testing, but we use a safety limit here
      // The actual game end is determined by the backend via check_game_end
      const SAFETY_MAX_HANDS = 50
      
      while (!gameEnded && !shouldStop && handsPlayed < SAFETY_MAX_HANDS) {
        handsPlayed++
        
        if (shouldStop) break
        
        const handResponse = await fetch('/api/game/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next_hand', gameId }),
        })
        const handData = await handResponse.json()
        
        // Check if game was resolved during next_hand (happens when MAX_HANDS reached)
        if (handData.status === 'resolved') {
          console.log('[GamePage] Game resolved during next_hand call')
          gameEnded = true
          break
        }
        
        if (!handData.success) {
          if (handData.error?.includes('resolved') || handData.error?.includes('ended')) {
            gameEnded = true
            break
          }
          console.error('Failed to play hand:', handData)
          break
        }
        
        // If no handId, the game might have ended
        if (!handData.handId) {
          console.log('[GamePage] No handId returned, checking if game ended')
          gameEnded = true
          break
        }
        
        const handId = handData.handId
        
        let handResolved = false
        let iterations = 0
        const MAX_ITERATIONS = 50
        
        while (!handResolved && iterations < MAX_ITERATIONS) {
          iterations++
          
          if (shouldStop) break
          
          const actionResponse = await fetch('/api/game/orchestrator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'next_action', handId }),
          })
          const actionData = await actionResponse.json()
          
          await new Promise(r => setTimeout(r, 300))
          
          if (actionData.resolved) {
            handResolved = true
          } else if (actionData.runningOut) {
            continue
          } else if (actionData.error) {
            console.error('Action error:', actionData.error)
            break
          }
        }
        
        await refresh()
        
        const checkResponse = await fetch('/api/game/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_game_end', gameId }),
        })
        const checkData = await checkResponse.json()
        
        if (checkData.shouldEnd) {
          await fetch('/api/game/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resolve_game', gameId }),
          })
          gameEnded = true
        }
        
        await new Promise(r => setTimeout(r, 500))
      }
      
      // Wait a moment for database to update, then refresh
      // The useEffect watching isGameFinished will handle showing the winner modal
      await new Promise(r => setTimeout(r, 1000))
      await refreshSession()
      
      // The useEffect that watches isGameFinished will refresh session to get winner data
      console.log('[GamePage] Game ended, waiting for session refresh to show winner...')
      
    } catch (err) {
      console.error('Failed to run game:', err)
    } finally {
      setIsRunningGame(false)
      setShouldStop(false)
    }
  }, [gameId, shouldStop, refresh, refreshSession])

  // Navigate to next game
  const handleGoToNextGame = useCallback(() => {
    router.push('/')
  }, [router])

  // Create new game after this one finishes
  const handleNewGame = useCallback(async () => {
    
    try {
      const response = await fetch('/api/game/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_game' }),
      })
      const data = await response.json()
      
      if (data.success && data.gameId) {
        router.push(`/game/${data.gameId}`)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Failed to create new game:', err)
      router.push('/')
    }
  }, [router])

  // Transform game state for components
  const agents = gameState?.players.length
    ? gameState.players.map(p => ({
        id: p.agentId,
        name: p.name,
        slug: p.slug,
        avatarUrl: p.avatarUrl || undefined,
        chipCount: p.chipCount,
        currentBet: p.currentBet,
        holeCards: p.holeCards,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isEliminated: p.chipCount <= 0,  // Mark as eliminated if bust
        lastAction: p.lastAction,
        lastActionType: p.lastActionType,
        lastActionRound: p.lastActionRound,
        seatPosition: p.seatPosition,
      }))
    : MOCK_AGENTS

  const odds = gameState?.odds.length ? gameState.odds : MOCK_ODDS
  const communityCards = gameState?.communityCards || []
  const pot = gameState?.pot || 0
  const sidePots = gameState?.sidePots || []
  const round = gameState?.round || 'preflop'
  const handNumber = gameState?.handNumber || 0
  const activeAgentId = gameState?.activePlayerId || undefined
  const dealerAgentId = gameState?.dealerPlayerId || undefined
  const smallBlindAgentId = gameState?.smallBlindPlayerId || undefined
  const bigBlindAgentId = gameState?.bigBlindPlayerId || undefined
  const totalPool = gameState?.totalPool || 0

  const transformedActions = actions.map(a => ({
    id: a.id,
    agentName: a.agentName,
    agentSlug: a.agentSlug,
    actionType: a.actionType as ActionType | 'win',
    amount: a.amount || undefined,
    reasoning: a.reasoning || undefined,
    round: a.round as Round,
    timestamp: a.timestamp,
    winningHand: a.winningHand,
    holeCards: a.holeCards,
    potAmount: a.potAmount,
  }))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <Header />


      {/* Winner announcement now shown in-page via GameFinished component */}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-accent-red/20 border border-accent-red/50 rounded-lg"
          >
            <p className="text-accent-red font-medium">Connection Error</p>
            <p className="text-sm text-foreground-muted mt-1">{error.message}</p>
          </motion.div>
        )}

        {/* State 1: Pre-Game Countdown with Betting */}
        {isInCountdown && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Countdown Display - Main Area */}
            <div className="lg:col-span-8">
              <GameCountdown
                countdown={gameSession?.countdown || {
                  secondsRemaining: 0,
                  formattedTime: '0:00',
                }}
                agents={standings}
                gameNumber={gameNumber}
              />
            </div>
            
            {/* Betting Panel - Sidebar (visible during countdown!) */}
            <div className="lg:col-span-4">
              <BettingPanel
                odds={odds}
                totalPool={gameSession?.bettingPool?.totalPool || totalPool}
                walletConnected={false}
                gameStatus="betting_open"
                currentHand={0}
                bettingClosesAfterHand={bettingClosesAfterHand}
                userBets={gameSession?.userBets}
                onChainGameId={gameSession?.game?.onChainGameId}
                gameNumber={gameNumber}
              />
            </div>
          </div>
        )}

        {/* State 2 & 3: Live Game / Game Finished */}
        {!isInCountdown && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Poker Table - Main Area */}
            <div className="lg:col-span-8">
              <div>
                {/* Table Header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Subtle back arrow */}
                    <Link 
                      href="/" 
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Back to lobbies"
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                        />
                      </svg>
                    </Link>
                    <span className="text-white font-extrabold">
                      {isGameFinished ? 'GAME FINISHED' : 'LIVE GAME'}
                    </span>
                    
                    {gameNumber > 0 && !isGameFinished && (
                      <GameStatus
                        gameId={gameId}
                        gameNumber={gameNumber}
                        currentHand={currentHand}
                        maxHands={maxHands}
                        bettingOpen={bettingOpen}
                        bettingClosesAfterHand={bettingClosesAfterHand}
                        round={handNumber > 0 ? round : undefined}
                        status={gameSession?.game?.status}
                        deckCommitment={gameSession?.game?.deckCommitment}
                      />
                    )}

                  </div>
                  
                  {/* Action Buttons - Only show during live game */}
                  {!isGameFinished && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={runHand}
                        disabled={isRunningHand || isRunningGame}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isRunningHand || isRunningGame
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                        }`}
                      >
                        {isRunningHand ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                            />
                            Running...
                          </span>
                        ) : (
                          '▶ Hand'
                        )}
                      </button>
                      
                      <button
                        onClick={runFullGame}
                        disabled={isRunningHand || isRunningGame}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          isRunningHand || isRunningGame
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-accent-green hover:bg-accent-green/80 text-white shadow-lg hover:shadow-accent-green/25'
                        }`}
                      >
                        {isRunningGame ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                            />
                            Game Running...
                          </span>
                        ) : (
                          '▶▶ Full Game'
                        )}
                      </button>
                      
                      {isRunningGame && (
                        <button
                          onClick={() => setShouldStop(true)}
                          className="px-4 py-2 rounded-lg font-medium transition-all bg-red-600 hover:bg-red-500 text-white"
                        >
                          ⏹ Stop
                        </button>
                      )}
                    </div>
                  )}

                  {/* No additional buttons needed when game is finished - actions in GameFinished component */}
                </div>

                {/* Loading State */}
                {isLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full mx-auto mb-4"
                      />
                      <p className="text-foreground-muted">Connecting to game...</p>
                    </div>
                  </div>
                ) : isGameFinished ? (
                  /* Game Finished View - Merged UI with betting data */
                  <GameFinished
                    gameNumber={gameNumber}
                    winner={gameSession?.winner || null}
                    standings={standings}
                    bettingPools={standings.map((s, i) => {
                      const pool = onChainData.agentPools[i] || 0
                      const total = onChainData.totalPool || 1
                      return {
                        agentId: s.agentId,
                        pool,
                        percentage: total > 0 ? (pool / total) * 100 : 25,
                      }
                    })}
                    totalPool={onChainData.totalPool}
                  />
                ) : (
                  <PokerTable
                    agents={agents}
                    communityCards={communityCards}
                    pot={pot}
                    sidePots={sidePots}
                    round={round}
                    activeAgentId={activeAgentId}
                    dealerAgentId={dealerAgentId}
                    smallBlindAgentId={smallBlindAgentId}
                    bigBlindAgentId={bigBlindAgentId}
                    winnerId={gameState?.winnerId || undefined}
                    winningHand={gameState?.winningHand || undefined}
                    showAgentCards={true}
                    handNumber={handNumber}
                  />
                )}
              </div>

              {/* Mobile Betting Panel - Only show during live game */}
              {!isGameFinished && (
                <div className="lg:hidden mt-6">
                  <BettingPanel
                    odds={odds}
                    totalPool={gameSession?.bettingPool?.totalPool || totalPool}
                    walletConnected={false}
                    gameStatus={gameSession?.status}
                    currentHand={currentHand}
                    bettingClosesAfterHand={bettingClosesAfterHand}
                    userBets={gameSession?.userBets}
                    onChainGameId={gameSession?.game?.onChainGameId}
                    gameNumber={gameNumber}
                  />
                </div>
              )}
              
              {/* Mobile Claim Winnings - Only show when game finished */}
              {isGameFinished && onChainGameId !== null && 
               onChainData.gameStatus === ContractGameStatus.Resolved && 
               onChainData.claimableNet > 0 && (
                <div className="lg:hidden mt-6">
                  <ClaimWinnings
                    onChainGameId={onChainGameId}
                    gameStatus={onChainData.gameStatus}
                    userBetOnWinner={onChainData.userBetOnWinner}
                    claimableGross={onChainData.claimableGross}
                    claimableFee={onChainData.claimableFee}
                    claimableNet={onChainData.claimableNet}
                    hasClaimed={onChainData.hasClaimed}
                    onSuccess={() => onChainData.refresh()}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Desktop Betting Panel - Only show during live game */}
              {!isGameFinished && (
                <div className="hidden lg:block">
                  <BettingPanel
                    odds={odds}
                    totalPool={gameSession?.bettingPool?.totalPool || totalPool}
                    walletConnected={false}
                    gameStatus={gameSession?.status}
                    currentHand={currentHand}
                    bettingClosesAfterHand={bettingClosesAfterHand}
                    userBets={gameSession?.userBets}
                    onChainGameId={gameSession?.game?.onChainGameId}
                    gameNumber={gameNumber}
                  />
                </div>
              )}

              {/* Claim Winnings - Only component in sidebar when game finished */}
              {isGameFinished && onChainGameId !== null && 
               onChainData.gameStatus === ContractGameStatus.Resolved && 
               onChainData.claimableNet > 0 && (
                <ClaimWinnings
                  onChainGameId={onChainGameId}
                  gameStatus={onChainData.gameStatus}
                  userBetOnWinner={onChainData.userBetOnWinner}
                  claimableGross={onChainData.claimableGross}
                  claimableFee={onChainData.claimableFee}
                  claimableNet={onChainData.claimableNet}
                  hasClaimed={onChainData.hasClaimed}
                  onSuccess={() => onChainData.refresh()}
                />
              )}

              {/* Action Feed - Only show during live game */}
              {!isGameFinished && (
                <ActionFeed 
                  actions={transformedActions.length > 0 ? transformedActions : [
                    {
                      id: 'placeholder',
                      agentName: 'System',
                      agentSlug: 'system',
                      actionType: 'check' as ActionType,
                      reasoning: 'Waiting for game to start. Actions will appear here.',
                      round: 'preflop' as Round,
                      timestamp: '',
                    }
                  ]} 
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <a href="https://github.com/sillysausage-eth/x402-all-in" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground-muted transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
              <div className="text-xs text-foreground-muted">
                © 2026 Agent All In
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-foreground-muted">Inspired by</p>
              <a href="https://allin.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src="/All In Logo.png" alt="All-In Podcast" className="h-9" />
              </a>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <span className="font-extrabold text-foreground tracking-wide">LEGAL</span>
              <a href="/terms" className="text-foreground-muted hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="text-foreground-muted hover:text-foreground transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
