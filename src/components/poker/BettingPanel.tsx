/**
 * BettingPanel Component
 * Spectator betting interface with countdown timer and odds display
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 9, 2026 - Removed emojis and mono fonts for cleaner look
 * Purpose: Allow spectators to bet on which AI will win
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BettingOdds } from '@/types/poker'

interface BettingPanelProps {
  isOpen: boolean
  closesAt?: string
  odds: BettingOdds[]
  totalPool: number
  onPlaceBet?: (agentId: string, amount: number) => void
  walletConnected?: boolean
  userBalance?: number
}

export function BettingPanel({
  isOpen,
  closesAt,
  odds,
  totalPool,
  onPlaceBet,
  walletConnected = false,
  userBalance = 0,
}: BettingPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<string>('')
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Countdown timer
  useEffect(() => {
    if (!closesAt || !isOpen) {
      setTimeRemaining(0)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, new Date(closesAt).getTime() - Date.now())
      setTimeRemaining(Math.floor(remaining / 1000))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [closesAt, isOpen])

  const handlePlaceBet = () => {
    if (selectedAgent && betAmount && onPlaceBet) {
      onPlaceBet(selectedAgent, parseFloat(betAmount))
      setBetAmount('')
      setSelectedAgent(null)
    }
  }

  const isUrgent = timeRemaining <= 5 && timeRemaining > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-background-card rounded-2xl border border-border p-5
        ${isOpen ? 'betting-active' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">
          {isOpen ? 'PLACE YOUR BETS' : 'BETTING CLOSED'}
        </h2>
        {isOpen && timeRemaining > 0 && (
          <div className={`
            px-3 py-1 rounded-full text-lg font-bold
            ${isUrgent ? 'bg-accent-red/20 timer-urgent' : 'bg-accent-gold/20 text-accent-gold'}
          `}>
            {timeRemaining}s
          </div>
        )}
      </div>

      {/* Total Pool */}
      <div className="mb-4 p-3 bg-background-secondary rounded-xl">
        <div className="text-sm text-foreground-muted font-extrabold">TOTAL POOL</div>
        <div className="text-2xl font-bold text-accent-gold">
          ${totalPool.toLocaleString()} USDC
        </div>
        <div className="text-xs text-foreground-muted mt-1">
          {odds.reduce((sum, o) => sum + o.betCount, 0)} bettors
        </div>
      </div>

      {/* Odds Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {odds.map((odd) => (
          <motion.button
            key={odd.agentId}
            whileHover={{ scale: isOpen ? 1.02 : 1 }}
            whileTap={{ scale: isOpen ? 0.98 : 1 }}
            onClick={() => isOpen && setSelectedAgent(odd.agentId)}
            disabled={!isOpen}
            className={`
              p-3 rounded-xl border-2 transition-all text-left
              ${selectedAgent === odd.agentId 
                ? 'border-accent-gold bg-accent-gold/10' 
                : 'border-border hover:border-border-bright bg-background-secondary'}
              ${!isOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-semibold text-foreground">{odd.agentName}</div>
            <div className="text-xl font-bold text-accent-green">
              {odd.odds.toFixed(1)}x
            </div>
            <div className="text-xs text-foreground-muted">
              ${odd.totalBets.toLocaleString()} • {odd.betCount} bets
            </div>
          </motion.button>
        ))}
      </div>

      {/* Bet Input */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-background-secondary border border-border
                    text-foreground placeholder:text-foreground-muted
                    focus:outline-none focus:border-accent-gold
                  "
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                  USDC
                </span>
              </div>
              <button
                onClick={handlePlaceBet}
                disabled={!selectedAgent || !betAmount || !walletConnected}
                className={`
                  px-6 py-3 rounded-xl font-bold transition-all
                  ${selectedAgent && betAmount && walletConnected
                    ? 'bg-accent-green text-white hover:bg-accent-green-dim'
                    : 'bg-border text-foreground-muted cursor-not-allowed'}
                `}
              >
                Bet
              </button>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[5, 10, 25, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount.toString())}
                  className="
                    flex-1 py-2 rounded-lg
                    bg-background-secondary border border-border
                    text-sm text-foreground-muted
                    hover:border-border-bright hover:text-foreground
                    transition-all
                  "
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Wallet Status */}
            {!walletConnected ? (
              <div className="text-center text-sm text-foreground-muted">
                CONNECT WALLET TO PLACE BETS
              </div>
            ) : (
              <div className="text-center text-sm text-foreground-muted">
                Balance: <span className="text-accent-gold">${userBalance} USDC</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

