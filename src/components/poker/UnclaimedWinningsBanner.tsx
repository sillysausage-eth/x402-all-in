/**
 * UnclaimedWinningsBanner Component
 * Persistent banner showing user has unclaimed winnings
 * 
 * Created: Jan 10, 2026
 * Purpose: Notify users they have winnings to claim from past games
 * 
 * Features:
 * - Persistent sticky banner at top
 * - Shows total unclaimed amount
 * - Click to expand/view history
 * - Claim all button
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface UnclaimedWinningsBannerProps {
  totalAmount: number
  gameCount: number
  onClaimAll?: () => void
  onViewHistory?: () => void
}

export function UnclaimedWinningsBanner({
  totalAmount,
  gameCount,
  onClaimAll,
  onViewHistory,
}: UnclaimedWinningsBannerProps) {
  if (totalAmount <= 0) return null

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="bg-emerald-500/10 border-b border-emerald-500/30"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - message */}
          <div className="flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div>
              <p className="text-sm font-bold text-emerald-400">
                You have ${totalAmount.toFixed(2)} in unclaimed winnings
              </p>
              <p className="text-xs text-neutral-500">
                From {gameCount} game{gameCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Right side - actions */}
          <div className="flex items-center gap-3">
            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
              >
                VIEW
              </button>
            )}
            {onClaimAll && (
              <button
                onClick={onClaimAll}
                className="px-4 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-full hover:bg-emerald-400 transition-colors"
              >
                CLAIM ALL
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
