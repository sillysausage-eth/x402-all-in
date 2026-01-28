/**
 * BettingHistory Component
 * Modal/panel showing user's betting history and claimable winnings
 * 
 * Created: Jan 10, 2026
 * Purpose: Display past bets, won/lost status, and claim buttons
 * 
 * Features:
 * - List of all user bets
 * - Won/Lost/Pending status indicators
 * - Individual claim buttons for unclaimed wins
 * - Total stats (won/lost/pending)
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { UserGameBet } from '@/types/poker'

interface BettingHistoryProps {
  isOpen: boolean
  bets: UserGameBet[]
  onClose: () => void
  onClaim?: (betId: string) => void
}

export function BettingHistory({
  isOpen,
  bets,
  onClose,
  onClaim,
}: BettingHistoryProps) {
  // Calculate stats
  const stats = {
    totalWon: bets
      .filter(b => b.status === 'won')
      .reduce((sum, b) => sum + (b.potentialPayout || 0), 0),
    totalLost: bets
      .filter(b => b.status === 'lost')
      .reduce((sum, b) => sum + b.amount, 0),
    pending: bets
      .filter(b => b.status === 'pending')
      .reduce((sum, b) => sum + b.amount, 0),
    unclaimed: bets
      .filter(b => b.status === 'won' && !b.claimed)
      .reduce((sum, b) => sum + (b.potentialPayout || 0), 0),
  }

  // Sort bets: unclaimed first, then by status and date
  const sortedBets = [...bets].sort((a, b) => {
    // Unclaimed wins first
    if (a.status === 'won' && !a.claimed && (b.status !== 'won' || b.claimed)) return -1
    if (b.status === 'won' && !b.claimed && (a.status !== 'won' || a.claimed)) return 1
    // Then pending
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return 0
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 rounded-2xl border border-neutral-800 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-extrabold tracking-wide text-white">
                MY BETTING HISTORY
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-neutral-800/50">
              <div className="text-center">
                <p className="text-xs text-neutral-500 mb-1">WON</p>
                <p className="text-lg font-bold text-emerald-400">
                  ${stats.totalWon.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500 mb-1">LOST</p>
                <p className="text-lg font-bold text-red-400">
                  ${stats.totalLost.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-500 mb-1">PENDING</p>
                <p className="text-lg font-bold text-neutral-300">
                  ${stats.pending.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Unclaimed alert */}
            {stats.unclaimed > 0 && (
              <div className="mx-6 my-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <p className="text-sm font-bold text-emerald-400">
                  💰 ${stats.unclaimed.toFixed(2)} ready to claim
                </p>
              </div>
            )}

            {/* Bet list */}
            <div className="px-6 py-4 overflow-y-auto max-h-[400px] space-y-3">
              {sortedBets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-500">No bets yet</p>
                  <p className="text-xs text-neutral-600 mt-2">
                    Place a bet on who you think will win!
                  </p>
                </div>
              ) : (
                sortedBets.map((bet) => (
                  <BetCard 
                    key={bet.id} 
                    bet={bet} 
                    onClaim={onClaim ? () => onClaim(bet.id) : undefined} 
                  />
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Individual bet card
function BetCard({ 
  bet, 
  onClaim 
}: { 
  bet: UserGameBet
  onClaim?: () => void 
}) {
  const statusConfig = {
    pending: { 
      label: 'PENDING', 
      bg: 'bg-neutral-500/20', 
      text: 'text-neutral-300',
      icon: ''
    },
    won: { 
      label: 'WON', 
      bg: 'bg-emerald-500/20', 
      text: 'text-emerald-400',
      icon: '✅'
    },
    lost: { 
      label: 'LOST', 
      bg: 'bg-red-500/20', 
      text: 'text-red-400',
      icon: '❌'
    },
  }

  const status = statusConfig[bet.status]
  const showClaim = bet.status === 'won' && !bet.claimed && onClaim

  return (
    <motion.div
      layout
      className={`p-4 rounded-xl border ${
        showClaim 
          ? 'bg-emerald-500/5 border-emerald-500/30' 
          : 'bg-neutral-800/50 border-neutral-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Status badge */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.bg} ${status.text}`}>
              {status.icon} {status.label}
            </span>
            
            {/* Claimed badge */}
            {bet.status === 'won' && bet.claimed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-700 text-neutral-400">
                CLAIMED
              </span>
            )}
          </div>

          {/* Bet details */}
          <p className="text-sm text-white font-semibold mb-1">
            ${bet.amount.toFixed(2)} on {bet.agentName}
          </p>
          <p className="text-xs text-neutral-500">
            {bet.oddsAtBet.toFixed(2)}x odds
          </p>
        </div>

        {/* Right side - payout or claim */}
        <div className="text-right">
          {bet.status === 'won' ? (
            <>
              <p className="text-lg font-bold text-emerald-400">
                ${bet.potentialPayout.toFixed(2)}
              </p>
              {showClaim && (
                <button
                  onClick={onClaim}
                  className="mt-2 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full hover:bg-emerald-400 transition-colors"
                >
                  CLAIM
                </button>
              )}
            </>
          ) : bet.status === 'pending' ? (
            <p className="text-sm text-neutral-300 font-semibold">
              Potential: ${bet.potentialPayout.toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-red-400/60">
              -${bet.amount.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
