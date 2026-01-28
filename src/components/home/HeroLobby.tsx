/**
 * HeroLobby Component
 * Full-width hero section for the current/live game
 * 
 * Created: Jan 14, 2026
 * Updated: Jan 19, 2026 - UI improvements:
 *   - Changed LIVE NOW indicator to brand green
 *   - Removed progress bar, moved betting status to header as pill
 *   - Improved legibility of Leader and Chips labels
 *   - Subtle text CTA matching "View results" style
 *   - Added emerald glow effect to make live game card prominent
 * Updated: Jan 20, 2026 - Added "Next Game In" countdown when idle
 * Updated: Jan 23, 2026 - Added "resolved" state to show winner after game ends
 *                       - Game remains visible until new game starts
 * Updated: Jan 26, 2026 - Idle state: changed title to "STARTING SOON", added player avatars
 *                       - Added next game number to idle state header, removed footer text
 * Purpose: Prominent display of active game with all agent standings
 * 
 * States:
 * - idle: No active game - shows countdown to next scheduled game
 * - countdown: Game created, waiting to start
 * - live: Game in progress
 * - resolved: Game finished - shows winner
 * 
 * Design: Black/white aesthetic, shows all 4 agents with chips and pools
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { AgentStanding } from '@/types/poker'

type HeroState = 'idle' | 'countdown' | 'live' | 'resolved'

interface Winner {
  agentId: string
  name: string
  avatarUrl: string | null
  finalChipCount: number
}

interface HeroLobbyProps {
  state: HeroState
  gameId?: string
  gameNumber?: number
  
  // Countdown
  countdownSeconds?: number
  
  // Live game
  currentHand?: number
  maxHands?: number
  bettingOpen?: boolean
  bettingPool?: number
  standings?: AgentStanding[]
  
  // Agent betting pools (from on-chain data)
  agentPools?: Array<{
    agentId: string
    agentName: string
    pool: number
  }>
  
  // Winner (for resolved games)
  winner?: Winner | null
}

export function HeroLobby({
  state,
  gameId,
  gameNumber = 0,
  countdownSeconds = 0,
  currentHand = 0,
  maxHands = 5,
  bettingOpen = false,
  bettingPool = 0,
  standings = [],
  agentPools = [],
  winner = null,
}: HeroLobbyProps) {
  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get pool for an agent
  const getAgentPool = (agentId: string) => {
    const pool = agentPools.find(p => p.agentId === agentId)
    return pool?.pool || 0
  }

  // Calculate seconds until next hour (games run at :00)
  const getSecondsToNextHour = () => {
    const now = new Date()
    const nextHour = new Date(now)
    nextHour.setHours(now.getHours() + 1, 0, 0, 0)
    return Math.floor((nextHour.getTime() - now.getTime()) / 1000)
  }

  // Countdown state for idle mode
  const [nextGameCountdown, setNextGameCountdown] = useState(getSecondsToNextHour())

  // Tick countdown when idle
  useEffect(() => {
    if (state !== 'idle') return
    
    const interval = setInterval(() => {
      setNextGameCountdown(getSecondsToNextHour())
    }, 1000)

    return () => clearInterval(interval)
  }, [state])

  // No active game state - show countdown to next scheduled game
  // gameNumber + 1 = next game number (since last game already finished)
  const nextGameNumber = (gameNumber || 0) + 1

  if (state === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black rounded-xl border border-neutral-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
              <span className="text-xs font-bold tracking-widest text-neutral-500">
                STARTING SOON
              </span>
            </div>
            <span className="text-neutral-400 text-sm">
              Game <span className="text-white font-bold">#{nextGameNumber}</span>
            </span>
          </div>
        </div>

        {/* Countdown display */}
        <div className="py-8 text-center">
          <p className="text-[10px] font-medium tracking-widest text-neutral-500 mb-3">
            NEXT GAME IN
          </p>
          <motion.span
            key={nextGameCountdown}
            initial={{ scale: 1.02 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold text-white tabular-nums"
          >
            {formatCountdown(nextGameCountdown)}
          </motion.span>
          <p className="text-xs text-neutral-600 mt-4">
            Games start at the top of every hour
          </p>
        </div>

        {/* Player avatars */}
        {standings.length > 0 && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-4">
              {standings.slice(0, 4).map((agent, idx) => (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-neutral-700">
                    {agent.avatarUrl ? (
                      <Image
                        src={agent.avatarUrl}
                        alt={agent.name}
                        fill
                        className="object-cover object-top"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                        <span className="text-lg font-bold text-neutral-400">
                          {agent.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-neutral-400">{agent.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const isCountdown = state === 'countdown'
  const isResolved = state === 'resolved'

  // Resolved state - show winner and link to results
  if (isResolved) {
    return (
      <Link href={`/game/${gameId}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black rounded-xl border border-neutral-700 overflow-hidden hover:border-neutral-600 transition-all"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                <span className="text-xs font-bold tracking-widest text-neutral-400">
                  GAME ENDED
                </span>
              </div>
              <span className="text-neutral-400 text-sm">
                Game <span className="text-white font-bold">#{gameNumber}</span>
              </span>
            </div>
          </div>

          {/* Winner display */}
          <div className="py-8 text-center">
            {winner ? (
              <>
                <p className="text-[10px] font-medium tracking-widest text-neutral-500 mb-3">
                  WINNER
                </p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  {winner.avatarUrl && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-emerald-500">
                      <Image
                        src={winner.avatarUrl}
                        alt={winner.name}
                        fill
                        className="object-cover object-top"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-2xl font-bold text-emerald-400">{winner.name}</p>
                    <p className="text-sm text-neutral-400">
                      Final chips: <span className="text-white font-medium">${winner.finalChipCount.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-neutral-400">Game cancelled</p>
            )}
          </div>

          {/* Pool info */}
          {bettingPool > 0 && (
            <div className="px-6 py-3 border-t border-neutral-800/50 bg-neutral-900/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Total Pool</span>
                <span className="text-sm font-medium text-white">${bettingPool.toFixed(2)} USDC</span>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 py-4 border-t border-neutral-800/50 text-center">
            <span className="text-sm text-neutral-400 hover:text-white transition-colors">
              View results →
            </span>
          </div>
        </motion.div>
      </Link>
    )
  }

  return (
    <Link href={`/game/${gameId}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-black rounded-xl border overflow-hidden transition-all ${
          isCountdown 
            ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]'
            : 'border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:border-emerald-500/60 hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Status indicator - always green for live */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-emerald-500"
              />
              <span className="text-xs font-bold tracking-widest text-emerald-400">
                {isCountdown ? 'STARTING SOON' : 'LIVE NOW'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-400">
                Game <span className="text-white font-bold">#{gameNumber}</span>
              </span>
              {!isCountdown && (
                <>
                  <span className="text-neutral-400">
                    Hand <span className="text-white font-bold">{currentHand}/{maxHands}</span>
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    bettingOpen 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-neutral-700 text-neutral-400'
                  }`}>
                    {bettingOpen ? 'Betting open' : 'Betting closed'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Countdown display */}
        {isCountdown && (
          <div className="py-8 text-center border-b border-neutral-800/50">
            <p className="text-[10px] font-medium tracking-widest text-neutral-500 mb-2">
              GAME STARTS IN
            </p>
            <motion.span
              key={countdownSeconds}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold text-white tabular-nums"
            >
              {formatCountdown(countdownSeconds)}
            </motion.span>
          </div>
        )}


        {/* Agent standings */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {standings.slice(0, 4).map((agent, idx) => {
              const pool = getAgentPool(agent.agentId)
              const isLeader = idx === 0 && !agent.isEliminated
              
              return (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    agent.isEliminated 
                      ? 'bg-neutral-900/30 border-neutral-800/50' 
                      : isLeader
                        ? 'bg-neutral-900 border-neutral-700'
                        : 'bg-neutral-900/50 border-neutral-800'
                  }`}
                >
                  {/* Avatar and name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`relative w-12 h-12 rounded-full overflow-hidden ${
                      agent.isEliminated ? 'grayscale opacity-50' : ''
                    } ${isLeader ? 'ring-2 ring-white/20' : ''}`}>
                      {agent.avatarUrl ? (
                        <Image
                          src={agent.avatarUrl}
                          alt={agent.name}
                          fill
                          className="object-cover object-top"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                          <span className="text-lg font-bold text-neutral-400">
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${
                        agent.isEliminated ? 'text-neutral-600' : 'text-white'
                      }`}>
                        {agent.name}
                      </p>
                      {isLeader && !agent.isEliminated && (
                        <p className="text-xs font-medium text-emerald-400">Leader</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    {/* Chips */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium">Chips</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        agent.isEliminated 
                          ? 'text-red-500' 
                          : isLeader 
                            ? 'text-white' 
                            : 'text-neutral-200'
                      }`}>
                        {agent.isEliminated ? 'BUST' : `$${agent.chipCount.toLocaleString()}`}
                      </span>
                    </div>
                    
                    {/* Pool */}
                    {pool > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 font-medium">Pool</span>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">
                          ${pool.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Footer with pool info */}
        {bettingPool > 0 && (
          <div className="px-6 py-3 border-t border-neutral-800/50 bg-neutral-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Total Pool</span>
              <span className="text-sm font-medium text-white">${bettingPool.toFixed(2)} USDC</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 py-4 border-t border-neutral-800/50 text-center">
          <span className="text-sm text-neutral-400 hover:text-white transition-colors">
            {isCountdown ? 'Place bets' : 'Watch live'} →
          </span>
        </div>
      </motion.div>
    </Link>
  )
}
