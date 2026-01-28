/**
 * GameStatus Component
 * Shows current game progress (Hand X/25, Round, Betting Open/Closed)
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 10, 2026 - Added round indicator next to hand counter
 * Updated: Jan 20, 2026 - Added verification badge for verifiable games
 * Purpose: Display game progress, current round, and betting window status
 * 
 * Features:
 * - Game number + Verification badge
 * - Hand counter (X/25)
 * - Round indicator (Preflop/Flop/Turn/River)
 * - Betting status (OPEN/CLOSED)
 */

'use client'

import { motion } from 'framer-motion'
import { VerificationBadge } from './VerificationBadge'

interface GameStatusProps {
  gameId: string
  gameNumber: number
  currentHand: number
  maxHands: number
  bettingOpen: boolean
  bettingClosesAfterHand: number
  round?: string
  status?: string
  deckCommitment?: string | null
}

export function GameStatus({
  gameId,
  gameNumber,
  currentHand,
  maxHands,
  bettingOpen,
  bettingClosesAfterHand,
  round,
  status,
  deckCommitment,
}: GameStatusProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Game number + Verification */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/80 rounded-lg border border-neutral-700">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-neutral-500">
            GAME
          </span>
          <span className="ml-2 text-sm font-bold text-white">
            #{gameNumber}
          </span>
        </div>
        {deckCommitment && (
          <VerificationBadge
            gameId={gameId}
            gameNumber={gameNumber}
            status={status || 'betting_open'}
            commitment={deckCommitment}
          />
        )}
      </div>

      {/* Hand counter */}
      <div className="px-3 py-1.5 bg-neutral-800/80 rounded-lg border border-neutral-700">
        <span className="text-[10px] font-bold tracking-widest text-neutral-500">
          HAND
        </span>
        <span className="ml-2 text-sm font-bold text-white tabular-nums">
          {currentHand}/{maxHands}
        </span>
      </div>

      {/* Round indicator */}
      {round && (
        <div className="px-3 py-1.5 bg-neutral-800/80 rounded-lg border border-neutral-700">
          <span className="text-[10px] font-bold tracking-widest text-neutral-500">
            ROUND
          </span>
          <span className="ml-2 text-sm font-bold text-white uppercase">
            {round}
          </span>
        </div>
      )}

      {/* Betting status */}
      <motion.div
        animate={{
          borderColor: bettingOpen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.3)',
        }}
        className={`px-3 py-1.5 rounded-lg border ${
          bettingOpen 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <span className="text-[10px] font-bold tracking-widest text-neutral-500">
          BETTING
        </span>
        <span className={`ml-2 text-sm font-bold ${
          bettingOpen ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {bettingOpen ? 'OPEN' : 'CLOSED'}
        </span>
        {bettingOpen && currentHand < bettingClosesAfterHand && (
          <span className="ml-1 text-[10px] text-neutral-500">
            (until hand {bettingClosesAfterHand})
          </span>
        )}
      </motion.div>
    </div>
  )
}
