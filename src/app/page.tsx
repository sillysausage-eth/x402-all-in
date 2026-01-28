/**
 * Agent All In - Home Page
 * 
 * Layout: Hero (current game) + 2x3 grid (previous games)
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 14, 2026 - Redesigned with HeroLobby + CompletedGameCard components
 * Updated: Jan 14, 2026 - Expanded content width to match About page
 * Updated: Jan 16, 2026 - Updated section titles to match Bets page style
 * Updated: Jan 23, 2026 - Fixed hero states: added 'resolved' state for ended games
 *                       - Previous games now include cancelled games
 * Updated: Jan 26, 2026 - Fixed: fetch 7 games instead of 6 to ensure 6 display after
 *                         filtering out current resolved game
 * Updated: Jan 26, 2026 - Hero now shows countdown to next game when current game ends
 *                       - Added dev tools: "Finish Game" and "Start Early" buttons
 *                       - Fixed: order previous games by game_number instead of resolved_at
 *                         (resolved_at can be NULL, causing games to not appear)
 *                       - Fixed: removed filter that hid current resolved game from previous list
 *                         (was causing game 24 to not appear since hero now shows idle state)
 *                       - Fixed: handle Supabase join returning array or single object for agents
 *                       - Removed "Create Game" and "Reset Game" dev buttons
 *                       - "Start Early" now creates game + starts it when no game exists
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout'
import { HeroLobby } from '@/components/home/HeroLobby'
import { CompletedGameCard } from '@/components/home/CompletedGameCard'
import { UnclaimedWinningsBanner } from '@/components/poker/UnclaimedWinningsBanner'
import { BettingHistory } from '@/components/poker/BettingHistory'
import { useGameSession } from '@/hooks'
import { getSupabaseClient } from '@/lib/supabase/client'

interface PreviousGame {
  id: string
  gameNumber: number
  status: 'resolved' | 'cancelled'
  winner: {
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
}

export default function Home() {
  const { session: gameSession, isLoading, refresh: refreshSession } = useGameSession()
  const [showBettingHistory, setShowBettingHistory] = useState(false)
  const [previousGames, setPreviousGames] = useState<PreviousGame[]>([])
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(true)

  // Fetch previous 6 completed games (resolved OR cancelled) with final chip counts
  useEffect(() => {
    const fetchPreviousGames = async () => {
      const supabase = getSupabaseClient()
      
      const { data: basicGames, error } = await supabase
        .from('games')
        .select(`
          id,
          game_number,
          status,
          winner_agent_id,
          agents!games_winner_agent_id_fkey (id, name, avatar_url)
        `)
        .in('status', ['resolved', 'cancelled'])
        .order('game_number', { ascending: false })  // Order by game number, not resolved_at (handles NULL timestamps)
        .limit(7)  // Fetch 7 to account for filtering out current resolved game
      
      if (error) {
        console.error('Error fetching previous games:', error)
        setIsLoadingPrevious(false)
        return
      }

      // Fetch final chip count from hand_agents for each winner
      type AgentData = { id: string; name: string; avatar_url: string | null }
      type GameRow = {
        id: string
        game_number: number
        status: string
        winner_agent_id: string | null
        agents: AgentData | AgentData[] | null  // Can be single object OR array from join
      }
      const formattedGames: PreviousGame[] = await Promise.all(
        (basicGames || []).map(async (game: GameRow) => {
          let finalChipCount = 0
          
          if (game.winner_agent_id) {
            const { data: finalHand } = await supabase
              .from('hands')
              .select('id')
              .eq('game_id', game.id)
              .order('hand_number', { ascending: false })
              .limit(1)
              .single() as { data: { id: string } | null }
            
            if (finalHand) {
              const { data: handAgent } = await supabase
                .from('hand_agents')
                .select('chip_count')
                .eq('hand_id', finalHand.id)
                .eq('agent_id', game.winner_agent_id)
                .single() as { data: { chip_count: number } | null }
              
              finalChipCount = handAgent?.chip_count || 0
            }
          }

          // Handle agents being array or single object from Supabase join
          const agentData = game.agents
          let winnerAgent: AgentData | null = null
          if (agentData) {
            if (Array.isArray(agentData)) {
              winnerAgent = agentData[0] || null
            } else {
              winnerAgent = agentData
            }
          }

          return {
            id: game.id,
            gameNumber: game.game_number,
            status: game.status as 'resolved' | 'cancelled',
            winner: winnerAgent ? {
              name: winnerAgent.name,
              avatarUrl: winnerAgent.avatar_url,
              finalChipCount,
            } : null,
          }
        })
      )

      setPreviousGames(formattedGames)
      setIsLoadingPrevious(false)
    }

    fetchPreviousGames()
  }, [gameSession?.status])

  // Derive hero state from game session
  // A game is "live" if betting is open/closed (in progress)
  // A game is "countdown" if waiting with a countdown timer
  // When game ends (resolved/cancelled), show "idle" with countdown to next hourly game
  const isLive = gameSession?.status === 'betting_open' || gameSession?.status === 'betting_closed'
  const isCountdown = gameSession?.status === 'waiting' && !!gameSession?.countdown
  
  // Show live game or countdown - otherwise show idle (next game countdown)
  // Resolved/cancelled games appear in the Previous Games grid, not the hero
  const heroState = isLive ? 'live' : isCountdown ? 'countdown' : 'idle'

  // Show up to 6 previous games (no filtering needed since hero always shows countdown when game ends)
  const displayedPreviousGames = previousGames.slice(0, 6)


  // Finish game instantly (resolve current game)
  const [isFinishing, setIsFinishing] = useState(false)
  const finishGame = useCallback(async () => {
    if (!gameSession?.game?.id) return
    setIsFinishing(true)
    try {
      const res = await fetch('/api/game/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_game', gameId: gameSession.game.id }),
      })
      const data = await res.json()
      if (data.success) await refreshSession()
      else console.error('Failed to finish game:', data)
    } catch (err) {
      console.error('Failed to finish game:', err)
    } finally {
      setIsFinishing(false)
    }
  }, [gameSession?.game?.id, refreshSession])

  // Start game early (create if needed, then force-start)
  const [isStartingEarly, setIsStartingEarly] = useState(false)
  const startEarly = useCallback(async () => {
    setIsStartingEarly(true)
    try {
      let gameId = gameSession?.game?.id

      // If no game exists or game is resolved/cancelled, create a new one first
      if (!gameId || gameSession?.status === 'resolved' || gameSession?.status === 'cancelled') {
        const createRes = await fetch('/api/game/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_game' }),
        })
        const createData = await createRes.json()
        if (!createData.success) {
          console.error('Failed to create game:', createData)
          return
        }
        gameId = createData.gameId
      }

      // Force-start the game (skip countdown)
      const res = await fetch('/api/game/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game', gameId, force: true }),
      })
      const data = await res.json()
      if (data.success) await refreshSession()
      else console.error('Failed to start early:', data)
    } catch (err) {
      console.error('Failed to start early:', err)
    } finally {
      setIsStartingEarly(false)
    }
  }, [gameSession?.game?.id, gameSession?.status, refreshSession])

  const canFinishGame = !isFinishing && isLive
  // Start Early is available when not live (idle or countdown state)
  const canStartEarly = !isStartingEarly && !isLive

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Unclaimed Winnings Banner */}
      {gameSession?.unclaimedWinnings && gameSession.unclaimedWinnings.totalAmount > 0 && (
        <UnclaimedWinningsBanner
          totalAmount={gameSession.unclaimedWinnings.totalAmount}
          gameCount={gameSession.unclaimedWinnings.gameCount}
          onViewHistory={() => setShowBettingHistory(true)}
        />
      )}

      <Header />

      <BettingHistory
        isOpen={showBettingHistory}
        bets={gameSession?.unclaimedWinnings.bets || []}
        onClose={() => setShowBettingHistory(false)}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        {(isLoading || isLoadingPrevious) ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-neutral-500">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Hero - Current Game */}
            <motion.section
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-extrabold tracking-wide text-white mb-4">CURRENT GAME</h2>
              <HeroLobby
                state={heroState}
                gameId={gameSession?.game?.id}
                gameNumber={gameSession?.game?.gameNumber || 0}
                countdownSeconds={gameSession?.countdown?.secondsRemaining}
                currentHand={gameSession?.progress.currentHand || 0}
                maxHands={gameSession?.progress.maxHands || 5}
                bettingOpen={gameSession?.progress.isBettingOpen || false}
                bettingPool={gameSession?.bettingPool?.totalPool || 0}
                standings={gameSession?.standings || []}
                agentPools={gameSession?.bettingPool?.agentPools?.map(p => ({
                  agentId: p.agentId,
                  agentName: p.agentName,
                  pool: p.pool,
                })) || []}
                winner={gameSession?.winner}
              />
            </motion.section>

            {/* Previous Games Grid */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-extrabold tracking-wide text-white">PREVIOUS GAMES</h2>
                {displayedPreviousGames.length > 0 && (
                  <span className="text-xs text-neutral-700">Showing last {displayedPreviousGames.length}</span>
                )}
              </div>

              {displayedPreviousGames.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {displayedPreviousGames.map((game, idx) => (
                    <CompletedGameCard
                      key={game.id}
                      gameId={game.id}
                      gameNumber={game.gameNumber}
                      status={game.status}
                      winner={game.winner}
                      index={idx}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-black rounded-xl border border-neutral-800 p-8 text-center">
                  <p className="text-neutral-600 text-sm">No completed games yet</p>
                </div>
              )}
            </motion.section>

            {/* Dev Actions */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-12 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800"
              >
                <p className="text-[10px] font-bold tracking-widest text-neutral-600 mb-3">DEV ACTIONS</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={startEarly}
                    disabled={!canStartEarly}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      canStartEarly
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    {isStartingEarly ? 'Starting...' : 'Start Early'}
                  </button>
                  <button
                    onClick={finishGame}
                    disabled={!canFinishGame}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      canFinishGame
                        ? 'bg-amber-600 text-white hover:bg-amber-500'
                        : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    {isFinishing ? 'Finishing...' : 'Finish Game'}
                  </button>
                  <button
                    onClick={() => refreshSession()}
                    className="px-4 py-2 text-sm bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700"
                  >
                    Refresh
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-neutral-800 bg-background mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <a href="https://github.com/sillysausage-eth/x402-all-in" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <p className="text-xs text-neutral-600">© 2026 Agent All In</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-neutral-500">Inspired by</p>
              <a href="https://allin.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src="/All In Logo.png" alt="All-In Podcast" className="h-9" />
              </a>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <span className="font-bold text-white tracking-wide">LEGAL</span>
              <a href="/terms" className="text-neutral-500 hover:text-white transition-colors">Terms</a>
              <a href="/privacy" className="text-neutral-500 hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
