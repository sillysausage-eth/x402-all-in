/**
 * GameCountdown Component
 * Pre-game countdown UI shown before a 25-hand game starts
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 12, 2026 - Made more compact for side-by-side with betting panel
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { AgentStanding } from '@/types/poker'

interface GameCountdownProps {
  countdown: {
    secondsRemaining: number
    formattedTime: string
  }
  agents: AgentStanding[]
  lastWinner?: {
    name: string
    avatarUrl: string | null
    finalChipCount: number
  }
  gameNumber: number
  onBetEarly?: () => void
}

export function GameCountdown({
  countdown,
  agents,
  lastWinner,
  gameNumber,
}: GameCountdownProps) {
  const isUrgent = countdown.secondsRemaining <= 30

  return (
    <div className="bg-gradient-to-b from-neutral-900 to-black rounded-xl border border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`w-2.5 h-2.5 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
          />
          <span className={`text-xs font-bold tracking-widest ${isUrgent ? 'text-red-400' : 'text-emerald-400'}`}>
            GAME STARTING
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          Game <span className="text-white font-bold">#{gameNumber}</span>
        </span>
      </div>

      {/* Countdown */}
      <div className="px-6 py-8 text-center">
        <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-2">STARTS IN</p>
        <motion.div
          key={countdown.secondsRemaining}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
          className="relative inline-block"
        >
          <span className={`text-6xl font-black tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}>
            {countdown.formattedTime}
          </span>
          
          {/* Pulsing ring when urgent */}
          {isUrgent && (
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 border-2 border-red-500/50 rounded-2xl -m-4"
            />
          )}
        </motion.div>
        
        <p className="text-xs text-neutral-500 mt-3">
          Place your bets now for the best odds →
        </p>
      </div>

      {/* Agent roster */}
      <div className="px-6 pb-6">
        <p className="text-[10px] font-bold tracking-widest text-neutral-600 mb-3">PLAYERS</p>
        <div className="grid grid-cols-4 gap-3">
          {agents.slice(0, 4).map((agent, index) => (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative w-12 h-12 mb-2">
                {agent.avatarUrl ? (
                  <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-neutral-700">
                    <Image
                      src={agent.avatarUrl}
                      alt={agent.name}
                      fill
                      className="object-cover object-top"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center ring-2 ring-neutral-700">
                    <span className="text-lg font-bold text-neutral-400">
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-white truncate w-full">
                {agent.name}
              </span>
              <span className="text-[10px] text-emerald-400">
                ${agent.chipCount.toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Last winner */}
      <AnimatePresence>
        {lastWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6 py-3 bg-neutral-900/50 border-t border-neutral-800 flex items-center justify-center gap-2"
          >
            <span className="text-emerald-500 text-sm">🏆</span>
            <span className="text-xs text-neutral-500">Last winner:</span>
            <span className="text-xs font-bold text-white">{lastWinner.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
