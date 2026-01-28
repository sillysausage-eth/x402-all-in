/**
 * CompletedGameCard Component
 * Card for displaying completed games in the previous games grid
 * 
 * Created: Jan 14, 2026
 * Updated: Jan 19, 2026 - Improved "View results" link visibility
 * Updated: Jan 23, 2026 - Added support for cancelled games
 * Purpose: Show completed game with winner, clear game number
 * 
 * Design: Black/white aesthetic, prominent game number, winner info
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

interface CompletedGameCardProps {
  gameId: string
  gameNumber: number
  status?: 'resolved' | 'cancelled'
  winner: {
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
  index?: number
}

export function CompletedGameCard({
  gameId,
  gameNumber,
  status = 'resolved',
  winner,
  index = 0,
}: CompletedGameCardProps) {
  const isCancelled = status === 'cancelled'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        href={`/game/${gameId}`}
        className="block bg-black rounded-xl border border-neutral-800 overflow-hidden hover:border-neutral-700 transition-colors h-full"
      >
        <div className="p-4">
          {/* Header with game number */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isCancelled ? 'bg-red-500/50' : 'bg-neutral-600'}`} />
              <span className={`text-[10px] font-medium tracking-widest ${isCancelled ? 'text-red-500/70' : 'text-neutral-600'}`}>
                {isCancelled ? 'CANCELLED' : 'COMPLETED'}
              </span>
            </div>
          </div>

          {/* Game number - prominent */}
          <div className="mb-4">
            <span className="text-3xl font-bold text-white">#{gameNumber}</span>
          </div>

          {/* Winner section */}
          {winner ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
              <span className="text-lg">🏆</span>
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-emerald-500/30">
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
                <p className="text-xs text-emerald-400 tabular-nums">
                  ${winner.finalChipCount.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-neutral-900/30">
              <p className="text-xs text-neutral-600 text-center">
                {isCancelled ? 'Game was cancelled' : 'No winner data'}
              </p>
            </div>
          )}

          {/* View results link */}
          <div className="mt-4 text-center">
            <span className="text-xs text-neutral-500 hover:text-white transition-colors">
              View results →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
