/**
 * GameFinished Component
 * Displays the final state of a completed poker game with confetti celebration
 * 
 * Created: Jan 13, 2026
 * Updated: Jan 14, 2026 - Merged UI design:
 *                        - Winner celebration at top with confetti
 *                        - Final standings include betting pool data (amount + %)
 *                        - Black/white design with green accents
 *                        - No buttons (handled in page layout)
 * 
 * Features:
 * - Confetti celebration animation (green/white theme)
 * - Winner display with avatar
 * - Final standings with chip counts AND betting pool data
 */

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import type { AgentStanding } from '@/types/poker'

interface BettingPoolData {
  agentId: string
  pool: number
  percentage: number
}

interface GameFinishedProps {
  gameNumber: number
  winner: {
    agentId: string
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
  standings: AgentStanding[]
  bettingPools?: BettingPoolData[]
  totalPool?: number
}

// Position indicators - subtle numbered badges
const POSITION_STYLES = [
  { bg: 'bg-emerald-500', text: 'text-black' },
  { bg: 'bg-neutral-500', text: 'text-white' },
  { bg: 'bg-neutral-600', text: 'text-white' },
  { bg: 'bg-neutral-700', text: 'text-neutral-400' },
]

// Confetti piece component
function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0 }}
      animate={{ 
        y: 600, 
        x: x + (Math.random() - 0.5) * 100,
        opacity: 0,
        rotate: Math.random() * 720 - 360
      }}
      transition={{ 
        duration: 3 + Math.random() * 2,
        delay,
        ease: "easeOut"
      }}
      className="absolute top-0 pointer-events-none"
      style={{ left: `${x}%` }}
    >
      <div 
        className={`w-3 h-3 ${color}`}
        style={{ 
          clipPath: Math.random() > 0.5 
            ? 'polygon(50% 0%, 100% 100%, 0% 100%)' 
            : 'none',
          borderRadius: Math.random() > 0.5 ? '50%' : '2px'
        }}
      />
    </motion.div>
  )
}

// Confetti colors - green and white theme
const CONFETTI_COLORS = [
  'bg-emerald-400',
  'bg-emerald-500',
  'bg-white',
  'bg-neutral-300',
]

export function GameFinished({
  gameNumber,
  winner,
  standings,
  bettingPools = [],
  totalPool = 0,
}: GameFinishedProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  
  // Sort standings by chip count (highest first), eliminated players last
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1
    if (!a.isEliminated && b.isEliminated) return -1
    return b.chipCount - a.chipCount
  })
  
  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])
  
  // Generate confetti pieces
  const confettiPieces = showConfetti ? Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 2,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
  })) : []
  
  // Helper to get betting pool for an agent
  const getPoolData = (agentId: string) => {
    return bettingPools.find(p => p.agentId === agentId) || { pool: 0, percentage: 0 }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative overflow-hidden"
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {confettiPieces.map(piece => (
            <ConfettiPiece 
              key={piece.id} 
              delay={piece.delay} 
              x={piece.x} 
              color={piece.color}
            />
          ))}
        </div>
      )}
      
      <div className="relative bg-black rounded-xl overflow-hidden">
        {/* Winner Section */}
        <div className="p-6">
          <div className="text-center pb-6 mb-6 border-b border-neutral-800">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
              className="text-5xl mb-4"
            >
              🏆
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-4"
            >
              Game #{gameNumber} Complete
            </motion.p>
            
            {winner && (
              <>
                {/* Winner avatar */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="w-24 h-24 mx-auto mb-4 relative"
                >
                  <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400 overflow-hidden">
                    {winner.avatarUrl ? (
                      <Image
                        src={winner.avatarUrl}
                        alt={winner.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {winner.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
                
                <motion.h2
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-2xl font-bold text-white mb-1"
                >
                  {winner.name} Wins
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm text-emerald-400 font-medium"
                >
                  ${winner.finalChipCount.toLocaleString()}
                </motion.p>
              </>
            )}
          </div>

          {/* Final Standings with Betting Data */}
          <div>
            <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-4">
              Final Standings
            </p>
            
            {/* Column Headers */}
            {bettingPools.length > 0 && (
              <div className="flex items-center gap-3 px-3 pb-2 text-xs text-neutral-600">
                <div className="w-6" /> {/* Position spacer */}
                <div className="w-8" /> {/* Avatar spacer */}
                <div className="flex-1">Player</div>
                <div className="w-20 text-right">Chips</div>
                <div className="w-20 text-right">Pool</div>
                <div className="w-12 text-right">%</div>
              </div>
            )}
            
            <div className="space-y-1">
              {sortedStandings.slice(0, 4).map((standing, index) => {
                const posStyle = POSITION_STYLES[index] || POSITION_STYLES[3]
                const isWinner = index === 0
                const poolData = getPoolData(standing.agentId)
                
                return (
                  <motion.div
                    key={standing.agentId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isWinner ? 'bg-neutral-900' : 'bg-transparent'
                    }`}
                  >
                    {/* Position number */}
                    <div className={`w-6 h-6 rounded-full ${posStyle.bg} flex items-center justify-center shrink-0`}>
                      <span className={`text-xs font-bold ${posStyle.text}`}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {standing.avatarUrl ? (
                        <Image
                          src={standing.avatarUrl}
                          alt={standing.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: 'center 20%' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                          <span className="text-xs font-bold text-neutral-400">
                            {standing.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        standing.isEliminated ? 'text-neutral-600 line-through' : 'text-white'
                      }`}>
                        {standing.name}
                      </p>
                    </div>
                    
                    {/* Chip count */}
                    <div className="w-20 text-right">
                      <p className={`text-sm tabular-nums ${
                        standing.isEliminated ? 'text-neutral-700' :
                        isWinner ? 'text-emerald-400' : 'text-neutral-400'
                      }`}>
                        {standing.isEliminated ? 'Bust' : `$${standing.chipCount.toLocaleString()}`}
                      </p>
                    </div>
                    
                    {/* Betting Pool - only show if we have pool data */}
                    {bettingPools.length > 0 && (
                      <>
                        <div className="w-20 text-right">
                          <p className={`text-sm tabular-nums ${
                            isWinner ? 'text-emerald-400' : 'text-neutral-500'
                          }`}>
                            ${poolData.pool.toFixed(2)}
                          </p>
                        </div>
                        <div className="w-12 text-right">
                          <p className={`text-sm tabular-nums ${
                            isWinner ? 'text-emerald-400' : 'text-neutral-600'
                          }`}>
                            {poolData.percentage.toFixed(0)}%
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </div>
            
            {/* Total Pool - Bottom right */}
            {totalPool > 0 && (
              <div className="flex justify-end mt-4 pt-3 border-t border-neutral-800">
                <p className="text-xs text-neutral-500">
                  Total Pool: <span className="text-white">${totalPool.toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
