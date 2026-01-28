/**
 * LiveLobbyCard Component
 * Hero card displaying the currently active game with agent standings
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 10, 2026 - Improved eliminated player display:
 *                       - Sort eliminated/bust players to end of list
 *                       - Grayscale + opacity effect for eliminated players
 * Updated: Jan 12, 2026 - Simplified BUST display (removed skull emojis)
 *                       - Clean X mark on avatar, simple "BUST" text
 * Purpose: Main focal point on home screen - shows live game status
 * 
 * Features:
 * - Large "LIVE NOW" indicator with pulsing animation
 * - Agent avatars with current chip counts
 * - Game progress (Hand X/25)
 * - Betting status (Open/Closed)
 * - "Enter Live Arena" CTA button
 * - Eliminated players shown last with clear "BUST" indicator
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { AgentStanding } from '@/types/poker'

interface LiveLobbyCardProps {
  gameId: string
  gameNumber: number
  currentHand: number
  maxHands: number
  bettingOpen: boolean
  bettingPool: number
  standings: AgentStanding[]
  isCountdown?: boolean
  countdownSeconds?: number
}

export function LiveLobbyCard({
  gameId,
  gameNumber,
  currentHand,
  maxHands,
  bettingOpen,
  bettingPool,
  standings,
  isCountdown = false,
  countdownSeconds = 0,
}: LiveLobbyCardProps) {
  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-2xl border border-neutral-700 overflow-hidden"
    >
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 pointer-events-none" />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              <span className="text-sm font-black tracking-widest text-red-400">
                {isCountdown ? 'STARTING' : 'LIVE NOW'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-400">
              Game <span className="text-white font-bold">#{gameNumber}</span>
            </span>
            {!isCountdown && (
              <span className="text-neutral-400">
                Hand <span className="text-white font-bold">{currentHand}/{maxHands}</span>
              </span>
            )}
          </div>
        </div>

        {/* Countdown display */}
        {isCountdown && (
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest text-emerald-400 mb-2">NEXT GAME STARTS IN</p>
            <motion.span
              key={countdownSeconds}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-6xl font-black text-white tabular-nums"
            >
              {formatCountdown(countdownSeconds)}
            </motion.span>
            <p className="text-sm text-neutral-400 mt-2">Place your bets now for the best odds</p>
          </div>
        )}

        {/* Agent Standings - sorted with eliminated players last */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...standings]
            .sort((a, b) => {
              // Eliminated players go to the end
              if (a.isEliminated && !b.isEliminated) return 1
              if (!a.isEliminated && b.isEliminated) return -1
              // Among non-eliminated, sort by chip count (highest first)
              if (!a.isEliminated && !b.isEliminated) return b.chipCount - a.chipCount
              // Among eliminated, keep original order
              return 0
            })
            .slice(0, 4)
            .map((agent, index) => (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col items-center p-4 rounded-xl border ${
                agent.isEliminated 
                  ? 'bg-neutral-900/70 border-red-500/20' 
                  : 'bg-neutral-800/50 border-neutral-700'
              }`}
            >
              {/* Avatar */}
              <div className={`relative w-14 h-14 rounded-full overflow-hidden mb-2 ${
                agent.isEliminated ? 'grayscale opacity-50' : ''
              }`}>
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
                    <span className="text-xl font-bold text-neutral-400">
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <span className={`text-sm font-bold ${
                agent.isEliminated ? 'text-neutral-500' : 'text-white'
              }`}>
                {agent.name}
              </span>

              {/* Chip count / BUST indicator */}
              <span className={`text-xs font-bold tracking-wide ${
                agent.isEliminated 
                  ? 'text-red-500' 
                  : agent.chipCount > 1000 
                    ? 'text-emerald-400' 
                    : 'text-neutral-400'
              }`}>
                {agent.isEliminated ? 'BUST' : `$${agent.chipCount.toLocaleString()}`}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Link href={`/game/${gameId}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-8 py-4 font-black text-lg rounded-xl transition-colors shadow-lg ${
                isCountdown 
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-white/10'
              }`}
            >
              {isCountdown ? 'PLACE YOUR BETS →' : 'ENTER LIVE ARENA →'}
            </motion.button>
          </Link>
          {isCountdown && (
            <p className="text-xs text-emerald-400/80">Betting is open! Get the best odds now.</p>
          )}
        </div>

        {/* Bottom Info Bar */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${bettingOpen ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
            <span className={bettingOpen ? 'text-emerald-400' : 'text-neutral-500'}>
              Betting {bettingOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            Pool: <span className="text-white font-semibold">${bettingPool.toLocaleString()} USDC</span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Placeholder when no live game is active
 */
export function NoLiveGameCard({ onCreateGame }: { onCreateGame?: () => void }) {
  return (
    <div className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden">
      <div className="p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-neutral-600" />
          <span className="text-sm font-bold tracking-widest text-neutral-600">NO LIVE GAME</span>
        </div>

        <div className="py-8">
          <p className="text-neutral-400 mb-2">No game currently in progress</p>
          <p className="text-sm text-neutral-600">Start a new game to see the action</p>
        </div>

        {onCreateGame && (
          <button
            onClick={onCreateGame}
            className="px-8 py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-500 transition-colors"
          >
            CREATE NEW GAME
          </button>
        )}
      </div>
    </div>
  )
}
