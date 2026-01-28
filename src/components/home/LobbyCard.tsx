/**
 * LobbyCard Component
 * Unified card for displaying game lobbies in all states
 * 
 * Created: Jan 14, 2026
 * Purpose: Single component for upcoming, live, and completed game states
 * 
 * States:
 * - upcoming: Placeholder for next game
 * - countdown: Game created, waiting to start
 * - live: Game in progress (betting_open or betting_closed)
 * - completed: Game resolved with winner
 * 
 * Design: Black/white aesthetic, minimal color, clean lines
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { AgentStanding } from '@/types/poker'

type LobbyState = 'upcoming' | 'countdown' | 'live' | 'completed'

interface LobbyCardProps {
  state: LobbyState
  gameId?: string
  gameNumber: number
  
  // For countdown state
  countdownSeconds?: number
  
  // For live state
  currentHand?: number
  maxHands?: number
  bettingOpen?: boolean
  bettingPool?: number
  standings?: AgentStanding[]
  
  // For completed state
  winner?: {
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
  
  // Animation
  index?: number
}

// Agent preview for upcoming/countdown states
const DEFAULT_AGENTS = [
  { name: 'Chamath', avatarUrl: '/avatars/Chamath.png' },
  { name: 'Sacks', avatarUrl: '/avatars/Sacks.png' },
  { name: 'Jason', avatarUrl: '/avatars/Jason.png' },
  { name: 'Friedberg', avatarUrl: '/avatars/Freidberg.png' },
]

export function LobbyCard({
  state,
  gameId,
  gameNumber,
  countdownSeconds = 0,
  currentHand = 0,
  maxHands = 5,
  bettingOpen = false,
  bettingPool = 0,
  standings = [],
  winner,
  index = 0,
}: LobbyCardProps) {
  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status label and indicator
  const getStatusInfo = () => {
    switch (state) {
      case 'upcoming':
        return { label: 'UPCOMING', color: 'bg-neutral-600', textColor: 'text-neutral-500' }
      case 'countdown':
        return { label: 'STARTING', color: 'bg-emerald-500', textColor: 'text-emerald-400', pulse: true }
      case 'live':
        return { label: 'LIVE', color: 'bg-red-500', textColor: 'text-red-400', pulse: true }
      case 'completed':
        return { label: 'COMPLETED', color: 'bg-neutral-600', textColor: 'text-neutral-500' }
    }
  }

  const statusInfo = getStatusInfo()
  const isClickable = state !== 'upcoming' && gameId

  const cardClassName = `block bg-black rounded-xl border border-neutral-800 overflow-hidden h-full ${
    isClickable ? 'hover:border-neutral-700 transition-colors cursor-pointer' : ''
  }`

  const cardContent = (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={statusInfo.pulse ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`w-2 h-2 rounded-full ${statusInfo.color}`}
          />
          <span className={`text-[10px] font-bold tracking-widest ${statusInfo.textColor}`}>
            {statusInfo.label}
          </span>
        </div>
        <span className="text-[10px] font-medium text-neutral-600">
          #{gameNumber}
        </span>
      </div>

      {/* Content based on state */}
      {state === 'upcoming' && (
        <UpcomingContent />
      )}

      {state === 'countdown' && (
        <CountdownContent 
          seconds={countdownSeconds} 
          formatCountdown={formatCountdown}
        />
      )}

      {state === 'live' && (
        <LiveContent
          currentHand={currentHand}
          maxHands={maxHands}
          bettingOpen={bettingOpen}
          bettingPool={bettingPool}
          standings={standings}
        />
      )}

      {state === 'completed' && winner && (
        <CompletedContent winner={winner} />
      )}

      {state === 'completed' && !winner && (
        <div className="py-6 text-center">
          <p className="text-neutral-600 text-sm">Game data unavailable</p>
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {isClickable && gameId ? (
        <Link href={`/game/${gameId}`} className={cardClassName}>
          {cardContent}
        </Link>
      ) : (
        <div className={cardClassName}>
          {cardContent}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// State-specific content components
// =============================================================================

function UpcomingContent() {
  return (
    <div className="py-2">
      <p className="text-neutral-600 text-xs mb-3">Next game</p>
      
      {/* Agent preview grid */}
      <div className="grid grid-cols-4 gap-2">
        {DEFAULT_AGENTS.map((agent) => (
          <div key={agent.name} className="flex flex-col items-center">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 mb-1">
              <Image
                src={agent.avatarUrl}
                alt={agent.name}
                fill
                className="object-cover object-top opacity-50"
                sizes="40px"
              />
            </div>
            <span className="text-[9px] text-neutral-600 truncate w-full text-center">
              {agent.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountdownContent({ 
  seconds, 
  formatCountdown 
}: { 
  seconds: number
  formatCountdown: (s: number) => string 
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-[10px] font-medium tracking-widest text-neutral-500 mb-2">
        STARTS IN
      </p>
      <motion.span
        key={seconds}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        className="text-3xl font-bold text-white tabular-nums"
      >
        {formatCountdown(seconds)}
      </motion.span>
      <p className="text-[10px] text-emerald-500 mt-2">
        Betting open
      </p>
    </div>
  )
}

function LiveContent({
  currentHand,
  maxHands,
  bettingOpen,
  bettingPool,
  standings,
}: {
  currentHand: number
  maxHands: number
  bettingOpen: boolean
  bettingPool: number
  standings: AgentStanding[]
}) {
  // Sort standings by chip count
  const sortedStandings = [...standings]
    .filter(s => !s.isEliminated)
    .sort((a, b) => b.chipCount - a.chipCount)
    .slice(0, 4)

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-neutral-500">Hand {currentHand}/{maxHands}</span>
          <span className={`${bettingOpen ? 'text-emerald-400' : 'text-neutral-600'}`}>
            {bettingOpen ? 'Betting open' : 'Betting closed'}
          </span>
        </div>
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${(currentHand / maxHands) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Standings preview */}
      <div className="space-y-1.5">
        {sortedStandings.map((agent, idx) => (
          <div key={agent.agentId} className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-600 w-3">{idx + 1}</span>
            <div className="relative w-6 h-6 rounded-full overflow-hidden">
              {agent.avatarUrl ? (
                <Image
                  src={agent.avatarUrl}
                  alt={agent.name}
                  fill
                  className="object-cover object-top"
                  sizes="24px"
                />
              ) : (
                <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-neutral-400">
                    {agent.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-white flex-1 truncate">{agent.name}</span>
            <span className="text-[10px] text-neutral-400 tabular-nums">
              ${agent.chipCount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Pool info */}
      {bettingPool > 0 && (
        <div className="mt-3 pt-2 border-t border-neutral-800/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-600">Pool</span>
            <span className="text-xs text-white">${bettingPool.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function CompletedContent({ 
  winner 
}: { 
  winner: { name: string; avatarUrl: string | null; finalChipCount: number } 
}) {
  return (
    <div className="py-2">
      {/* Winner */}
      <div className="flex items-center gap-3">
        <span className="text-lg">🏆</span>
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-emerald-500/50">
          {winner.avatarUrl ? (
            <Image
              src={winner.avatarUrl}
              alt={winner.name}
              fill
              className="object-cover object-top"
              sizes="40px"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {winner.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{winner.name}</p>
          <p className="text-[10px] text-emerald-400">
            ${winner.finalChipCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
