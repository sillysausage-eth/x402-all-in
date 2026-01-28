/**
 * GameWinnerAnnouncement Component
 * Full-screen celebration overlay when a 25-hand game ends
 * 
 * Created: Jan 10, 2026
 * Purpose: Announce game winner with celebration animation and payout info
 * 
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Winner portrait with gold accents
 * - Final standings display
 * - User bet result (won/lost)
 * - Claim winnings button
 * - Next game countdown
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { AgentStanding, UserGameBet } from '@/types/poker'

interface GameWinnerAnnouncementProps {
  isVisible: boolean
  winner: {
    agentId: string
    name: string
    avatarUrl: string | null
    finalChipCount: number
  }
  standings: AgentStanding[]
  userBetResult?: {
    won: boolean
    betAmount: number
    payout: number
    agentName: string
  } | null
  nextGameIn?: string // ISO timestamp
  onClaim?: () => void
  onDismiss?: () => void
  onNewGame?: () => void  // CTA to start a new game
  gameNumber: number
}

// Confetti particle component
function Confetti() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff', '#a855f7'][Math.floor(Math.random() * 5)],
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.x}vw`, 
            y: -20, 
            rotate: 0,
            opacity: 1 
          }}
          animate={{ 
            y: '110vh', 
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: [1, 1, 0]
          }}
          transition={{ 
            duration: p.duration, 
            delay: p.delay,
            ease: 'linear'
          }}
          className="absolute w-3 h-3"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  )
}

export function GameWinnerAnnouncement({
  isVisible,
  winner,
  standings,
  userBetResult,
  nextGameIn,
  onClaim,
  onDismiss,
  onNewGame,
  gameNumber,
}: GameWinnerAnnouncementProps) {
  const [countdown, setCountdown] = useState<string | null>(null)

  // Calculate countdown to next game
  useEffect(() => {
    if (!nextGameIn) return

    const updateCountdown = () => {
      const now = Date.now()
      const target = new Date(nextGameIn).getTime()
      const diff = Math.max(0, target - now)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [nextGameIn])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          {/* Confetti animation */}
          <Confetti />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative max-w-lg w-full mx-4 z-50"
          >
            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="absolute -top-12 right-0 text-neutral-500 hover:text-white transition-colors"
              >
                <span className="text-sm">✕ Close</span>
              </button>
            )}

            {/* Main card */}
            <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-b from-amber-500/20 to-transparent p-8 text-center">
                {/* Trophy */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4"
                >
                  🏆
                </motion.div>

                {/* Game winner text */}
                <p className="text-sm font-bold tracking-widest text-neutral-400 mb-2">
                  GAME #{gameNumber} WINNER
                </p>

                {/* Winner avatar */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  {winner.avatarUrl ? (
                    <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-amber-500 shadow-xl shadow-amber-500/30">
                      <Image
                        src={winner.avatarUrl}
                        alt={winner.name}
                        fill
                        className="object-cover object-top"
                        sizes="128px"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center ring-4 ring-amber-500">
                      <span className="text-4xl font-bold text-amber-400">
                        {winner.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Winner name */}
                <motion.h2
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl font-black text-amber-400 mb-2"
                >
                  {winner.name.toUpperCase()}
                </motion.h2>

                {/* Final chip count */}
                <p className="text-lg font-semibold text-emerald-400">
                  Final Stack: ${winner.finalChipCount.toLocaleString()}
                </p>
              </div>

              {/* User bet result */}
              {userBetResult && (
                <div className={`px-8 py-6 ${userBetResult.won ? 'bg-emerald-500/10' : 'bg-neutral-800/50'}`}>
                  {userBetResult.won ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.5 }}
                        className="text-center"
                      >
                        <p className="text-2xl mb-2">🎉</p>
                        <p className="text-lg font-bold text-emerald-400 mb-1">
                          YOU WON!
                        </p>
                        <p className="text-sm text-neutral-400 mb-3">
                          Your ${userBetResult.betAmount.toFixed(2)} bet on {userBetResult.agentName} pays out
                        </p>
                        <p className="text-3xl font-black text-white">
                          ${userBetResult.payout.toFixed(2)}
                        </p>
                      </motion.div>
                      
                      {onClaim && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onClaim}
                          className="w-full mt-4 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                        >
                          CLAIM ${userBetResult.payout.toFixed(2)} USDC
                        </motion.button>
                      )}
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-neutral-500 mb-1">
                        Better luck next time
                      </p>
                      <p className="text-neutral-400">
                        Your ${userBetResult.betAmount.toFixed(2)} bet on {userBetResult.agentName} did not win
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Final standings */}
              <div className="px-8 py-6 border-t border-neutral-800">
                <p className="text-xs font-bold tracking-widest text-neutral-500 mb-3">
                  FINAL STANDINGS
                </p>
                <div className="space-y-2">
                  {standings.slice(0, 4).map((standing, index) => (
                    <div 
                      key={standing.agentId}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                        index === 0 ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Position */}
                      <span className={`text-sm font-bold w-6 ${
                        index === 0 ? 'text-amber-400' :
                        index === 1 ? 'text-neutral-300' :
                        index === 2 ? 'text-amber-700' :
                        'text-neutral-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>

                      {/* Avatar */}
                      {standing.avatarUrl ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={standing.avatarUrl}
                            alt={standing.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                          <span className="text-xs font-bold text-neutral-400">
                            {standing.name.charAt(0)}
                          </span>
                        </div>
                      )}

                      {/* Name */}
                      <span className={`flex-1 text-sm font-semibold ${
                        index === 0 ? 'text-amber-400' : 
                        standing.isEliminated ? 'text-neutral-600 line-through' : 
                        'text-white'
                      }`}>
                        {standing.name}
                        {standing.isEliminated && (
                          <span className="ml-2 text-[10px] text-red-500">ELIMINATED</span>
                        )}
                      </span>

                      {/* Chip count */}
                      <span className={`text-sm font-semibold ${
                        standing.chipCount > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${standing.chipCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Footer - NEW GAME CTA */}
              <div className="px-8 py-6 bg-neutral-800/30 border-t border-neutral-800">
                <div className="flex flex-col gap-3">
                  {/* Primary CTA: New Game */}
                  {onNewGame && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onNewGame}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/30"
                    >
                      🎰 NEW GAME
                    </motion.button>
                  )}

                  {/* Secondary: View History or Close */}
                  <div className="flex gap-3">
                    {onDismiss && (
                      <button
                        onClick={onDismiss}
                        className="flex-1 py-2 text-neutral-400 font-medium hover:text-white transition-colors text-sm"
                      >
                        View Table
                      </button>
                    )}
                  </div>
                </div>

                {/* Next game countdown (if scheduled) */}
                {countdown && (
                  <div className="mt-4 pt-4 border-t border-neutral-700 text-center">
                    <p className="text-xs text-neutral-500 mb-1">Next scheduled game in</p>
                    <p className="text-lg font-bold text-white tabular-nums">{countdown}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
