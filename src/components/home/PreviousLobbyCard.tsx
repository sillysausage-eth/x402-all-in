/**
 * PreviousLobbyCard Component
 * Displays the last completed game with winner and user's bet result
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 14, 2026 - Removed amber/gold colors, replaced with white/green
 *                       - Removed emojis except winner cup
 * 
 * Features:
 * - Winner display with avatar and final chip count
 * - User's bet result (won/lost/no bet)
 * - Claim winnings button if applicable
 * - View results link
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { AgentStanding } from '@/types/poker'

interface PreviousLobbyCardProps {
  gameNumber: number
  winner: {
    name: string
    avatarUrl: string | null
    finalChipCount: number
  } | null
  standings?: AgentStanding[]
  userBet?: {
    agentName: string
    amount: number
    won: boolean
    payout: number
    claimed: boolean
  } | null
  onClaim?: () => void
  onViewResults?: () => void
}

export function PreviousLobbyCard({
  gameNumber,
  winner,
  standings,
  userBet,
  onClaim,
  onViewResults,
}: PreviousLobbyCardProps) {
  // No previous game exists
  if (!winner) {
    return (
      <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 h-full">
        <span className="text-xs font-bold tracking-widest text-neutral-500">PREVIOUS</span>
        <div className="flex flex-col items-center justify-center py-8 text-neutral-600">
          <p className="text-sm">No previous games yet</p>
          <p className="text-xs mt-1 text-neutral-700">First game in progress...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tracking-widest text-neutral-500">PREVIOUS</span>
        <span className="text-xs font-medium text-neutral-600">Game #{gameNumber}</span>
      </div>

      {/* Winner Section */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">🏆</span>
          
          {/* Winner Avatar */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-500/50">
            {winner.avatarUrl ? (
              <Image
                src={winner.avatarUrl}
                alt={winner.name}
                fill
                className="object-cover object-top"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {winner.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="font-bold text-white">{winner.name}</p>
            <p className="text-xs text-emerald-400">
              ${winner.finalChipCount.toLocaleString()} chips
            </p>
          </div>
        </div>

        {/* User Bet Result */}
        {userBet && (
          <div className={`p-3 rounded-lg mb-4 ${
            userBet.won 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-neutral-800/50 border border-neutral-700/50'
          }`}>
            <p className="text-xs text-neutral-400 mb-1">Your bet on {userBet.agentName}</p>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                userBet.won ? 'text-emerald-400' : 'text-neutral-500'
              }`}>
                {userBet.won ? `Won $${userBet.payout.toFixed(2)}` : `Lost $${userBet.amount.toFixed(2)}`}
              </span>
              {userBet.won && !userBet.claimed && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                  UNCLAIMED
                </span>
              )}
              {userBet.won && userBet.claimed && (
                <span className="text-[10px] text-neutral-500">Claimed</span>
              )}
            </div>
          </div>
        )}

        {/* Don't show anything if we don't have bet data - could be wallet not connected */}
        {userBet === null && (
          <div className="p-3 rounded-lg mb-4 bg-neutral-800/20">
            <p className="text-xs text-neutral-700 text-center">
              Connect wallet to view your bets
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {userBet?.won && !userBet.claimed && onClaim && (
          <button
            onClick={onClaim}
            className="flex-1 py-2 px-4 bg-emerald-500 text-black font-bold text-sm rounded-lg hover:bg-emerald-400 transition-colors"
          >
            Claim ${userBet.payout.toFixed(2)}
          </button>
        )}
        {onViewResults && (
          <button
            onClick={onViewResults}
            className={`py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
              userBet?.won && !userBet.claimed 
                ? 'text-neutral-400 hover:text-white' 
                : 'flex-1 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            View Results
          </button>
        )}
      </div>
    </motion.div>
  )
}
