/**
 * BettingPanel Component
 * Polymarket-inspired betting interface
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 13, 2026 - Polymarket-style header
 *                       - CAPS titles to match app design
 *                       - Separated "Your Bets" section
 *                       - Subtle separators (don't go to edges)
 *                       - Neutral colors for user bets
 * Updated: Jan 23, 2026 - Show "<1%" instead of "0%" for small pool shares
 * Updated: Jan 23, 2026 - All bets (including x402) are now on-chain, so use on-chain data
 * Updated: Jan 26, 2026 - Fixed: on-chain status is now source of truth for bettingAllowed
 *                       - Locked state: hide radio buttons, dim text for closed betting
 */

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { GameSessionStatus } from '@/types/poker'
import { useActiveAccount } from 'thirdweb/react'
import { 
  usePlaceBet, 
  useFormattedBettingData,
  type TransactionStatus,
} from '@/lib/contracts/hooks'
import { parseUSDC, AGENT_NAMES, GameStatus } from '@/lib/contracts'
import { useWalletBalance } from '@/hooks/useWalletBalance'
// ClaimWinnings moved to be a separate component in the game page layout

const HOUSE_FEE_PERCENT = 5

interface BettingPanelProps {
  odds?: { agentId: string; agentName: string; odds: number; totalBets: number; betCount: number }[]
  totalPool?: number
  onPlaceBet?: (agentId: string, amount: number) => void
  walletConnected?: boolean
  userBalance?: number
  gameStatus?: GameSessionStatus
  currentHand?: number
  bettingClosesAfterHand?: number
  userBets?: { id: string; agentId: string; agentName: string; amount: number; status: string }[]
  onChainGameId?: number | null
  gameNumber?: number | string
}

const TX_STATUS_MESSAGES: Record<TransactionStatus, string> = {
  idle: '',
  approving: 'Approving USDC...',
  confirming: 'Placing bet...',
  success: 'Bet placed!',
  error: 'Failed',
}

export function BettingPanel({
  totalPool: fallbackTotalPool = 0,
  onPlaceBet,
  walletConnected: propWalletConnected = false,
  userBalance: propUserBalance = 0,
  gameStatus = 'betting_open',
  currentHand = 1,
  bettingClosesAfterHand = 5,
  onChainGameId,
  gameNumber,
}: BettingPanelProps) {
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number | null>(null)
  const [betAmount, setBetAmount] = useState<string>('')
  
  // Wallet connection
  const account = useActiveAccount()
  const { usdcBalance, isConnected } = useWalletBalance()
  const walletConnected = propWalletConnected || isConnected
  const userBalance = propUserBalance || parseFloat(usdcBalance.replace(/,/g, '')) || 0
  
  // On-chain data
  const onChainData = useFormattedBettingData(
    onChainGameId !== null && onChainGameId !== undefined ? BigInt(onChainGameId) : null
  )
  
  const { placeBet, txState, reset: resetTx, isConnected: canPlaceBet } = usePlaceBet()
  
  const useOnChain = onChainGameId !== null && onChainGameId !== undefined && onChainData.gameStatus !== null
  
  // Use on-chain data when available (all bets including x402 are now on-chain)
  // Fallback to prop data for games without on-chain ID
  const totalPool = useOnChain ? onChainData.totalPool : fallbackTotalPool
  const agentPools = useOnChain ? onChainData.agentPools : [0, 0, 0, 0]
  const userAgentBets = useOnChain ? onChainData.userAgentBets : [0, 0, 0, 0]
  const userTotalBet = userAgentBets.reduce((sum, b) => sum + b, 0)
  
  // Calculate % of betting pool for each agent (NOT win probability!)
  const agents = AGENT_NAMES.map((name, index) => {
    const pool = agentPools[index] || 0
    const poolShare = totalPool > 0 ? (pool / totalPool) * 100 : 25
    const roundedShare = Math.round(poolShare)
    return {
      index,
      name,
      pool,
      // Show "<1%" if there's pool share but rounds to 0, otherwise show actual %
      poolShareDisplay: totalPool > 0 && pool > 0 && roundedShare === 0 ? '<1' : String(roundedShare),
      userBet: userAgentBets[index] || 0,
    }
  })
  
  // Betting allowed - on-chain status is source of truth when available
  const bettingAllowed = useMemo(() => {
    // If we have on-chain data, use it as the source of truth
    if (useOnChain && onChainData.gameStatus !== null) {
      // Only allow betting if on-chain game status is Open
      return onChainData.gameStatus === GameStatus.Open
    }
    
    // Fallback to Supabase status for games without on-chain ID
    return (
      gameStatus === 'waiting' || 
      gameStatus === 'betting_open' ||
      (currentHand >= 1 && currentHand <= bettingClosesAfterHand && gameStatus !== 'resolved' && gameStatus !== 'cancelled')
    )
  }, [useOnChain, onChainData.gameStatus, gameStatus, currentHand, bettingClosesAfterHand])

  // Calculate potential payout
  const potentialPayout = useMemo(() => {
    if (selectedAgentIndex === null || !betAmount) return null
    
    const amount = parseFloat(betAmount)
    if (isNaN(amount) || amount <= 0) return null
    
    const agentPool = agentPools[selectedAgentIndex] || 0
    const newTotalPool = totalPool + amount
    const newAgentPool = agentPool + amount
    
    if (newAgentPool === 0) return null
    
    const gross = (amount / newAgentPool) * newTotalPool
    const profit = gross - amount
    const fee = profit > 0 ? profit * (HOUSE_FEE_PERCENT / 100) : 0
    const net = gross - fee
    
    return { net: net.toFixed(2) }
  }, [selectedAgentIndex, betAmount, agentPools, totalPool])

  const handlePlaceBet = async () => {
    if (selectedAgentIndex === null || !betAmount) return
    
    const amount = parseFloat(betAmount)
    if (isNaN(amount) || amount < 0.10) return
    
    if (useOnChain && canPlaceBet && onChainGameId !== null) {
      const amountRaw = parseUSDC(amount)
      const txHash = await placeBet(BigInt(onChainGameId), selectedAgentIndex, amountRaw)
      
      if (txHash) {
        setBetAmount('')
        setSelectedAgentIndex(null)
        // Delay refresh to let RPC node index the new transaction
        // First refresh after 2s, second after 5s for reliability
        setTimeout(() => onChainData.refresh(), 2000)
        setTimeout(() => onChainData.refresh(), 5000)
        setTimeout(() => resetTx(), 3000)
      }
    } else if (onPlaceBet) {
      onPlaceBet(String(selectedAgentIndex), amount)
      setBetAmount('')
      setSelectedAgentIndex(null)
    }
  }

  const handleAgentSelect = (index: number) => {
    if (!bettingAllowed) return
    setSelectedAgentIndex(selectedAgentIndex === index ? null : index)
    resetTx()
  }

  const betAmountNum = parseFloat(betAmount) || 0
  const insufficientBalance = betAmountNum > userBalance
  const isOnChainActive = useOnChain && !onChainData.isLoading
  const selectedAgent = selectedAgentIndex !== null ? agents[selectedAgentIndex] : null
  const userBetsList = agents.filter(a => a.userBet > 0)

  // Format title
  const title = gameNumber ? `WHO WILL WIN GAME #${gameNumber}?` : 'WHO WILL WIN?'

  return (
    <div className="space-y-3">
      {/* Main Betting Panel */}
      <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
        {/* Header - with padding so border doesn't touch edges */}
        <div className="p-4">
          <div className="pb-3 mb-3 border-b border-neutral-800">
            <h2 className="text-xs font-medium tracking-widest text-white uppercase">
              {title}
            </h2>
            <p className="text-neutral-500 text-xs mt-1 tabular-nums">
              ${totalPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Vol.
            </p>
          </div>

          {/* Agent Selection */}
          <div className="space-y-1.5">
            {agents.map((agent) => {
              const isSelected = selectedAgentIndex === agent.index
              
              return (
                <motion.button
                  key={agent.index}
                  onClick={() => handleAgentSelect(agent.index)}
                  disabled={!bettingAllowed}
                  whileHover={bettingAllowed ? { scale: 1.005 } : {}}
                  whileTap={bettingAllowed ? { scale: 0.995 } : {}}
                  className={`
                    w-full px-3 py-3 rounded-lg text-left transition-all relative
                    ${isSelected 
                      ? 'bg-white text-black' 
                      : bettingAllowed
                        ? 'bg-neutral-900 hover:bg-neutral-800/80'
                        : 'bg-neutral-900/50 cursor-default'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Radio indicator - only show when betting is allowed */}
                    {bettingAllowed && (
                      <div className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${isSelected ? 'border-black bg-black' : 'border-neutral-600'}
                      `}>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-white"
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Player Name */}
                    <span className={`flex-1 font-medium text-sm ${
                      isSelected ? 'text-black' : bettingAllowed ? 'text-white' : 'text-neutral-500'
                    }`}>
                      {agent.name}
                    </span>
                    
                    {/* Stats: % of bets + pool amount */}
                    <div className="flex items-center gap-4">
                      <span className={`text-sm tabular-nums ${
                        isSelected ? 'text-black/60' : bettingAllowed ? 'text-neutral-500' : 'text-neutral-600'
                      }`}>
                        {agent.poolShareDisplay}%
                      </span>
                      <span className={`text-sm font-medium tabular-nums min-w-[60px] text-right ${
                        isSelected ? 'text-black' : bettingAllowed ? 'text-white' : 'text-neutral-500'
                      }`}>
                        ${agent.pool < 1 ? agent.pool.toFixed(2) : agent.pool.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Bet Input (when agent selected) */}
        <AnimatePresence>
          {bettingAllowed && selectedAgent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="px-4 pb-4 pt-1 space-y-3">
                {/* Divider */}
                <div className="border-t border-neutral-800 -mx-0 pt-3" />
                
                {/* Amount Input */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0"
                      min="0.10"
                      step="1"
                      disabled={txState.status !== 'idle'}
                      autoFocus
                      className={`
                        w-full pl-7 pr-3 py-2.5 rounded-lg text-base font-medium
                        bg-neutral-900 border 
                        ${insufficientBalance ? 'border-red-500/50' : 'border-neutral-700 focus:border-neutral-500'}
                        text-white placeholder:text-neutral-700
                        focus:outline-none transition-colors tabular-nums
                      `}
                    />
                  </div>
                  {[10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt.toString())}
                      disabled={txState.status !== 'idle'}
                      className={`
                        px-3 py-2.5 rounded-lg text-xs font-medium transition-colors
                        ${parseFloat(betAmount) === amt 
                          ? 'bg-white text-black'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                        }
                      `}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                {/* Potential Return */}
                {potentialPayout && (
                  <div className="flex items-center justify-between py-2 px-3 bg-neutral-900 rounded-lg">
                    <span className="text-xs text-neutral-500">Potential return</span>
                    <span className="text-sm font-medium text-white tabular-nums">
                      ${potentialPayout.net}
                    </span>
                  </div>
                )}

                {/* Transaction Status */}
                {txState.status !== 'idle' && (
                  <div className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs ${
                    txState.status === 'error' 
                      ? 'bg-red-500/10 text-red-400'
                      : txState.status === 'success'
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {(txState.status === 'approving' || txState.status === 'confirming') && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                      />
                    )}
                    {txState.status === 'success' && <span>✓</span>}
                    {txState.status === 'error' && <span>✗</span>}
                    <span>{TX_STATUS_MESSAGES[txState.status]}</span>
                  </div>
                )}

                {/* Balance + Bet Button */}
                <div className="space-y-2">
                  {walletConnected && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Balance</span>
                      <span className={insufficientBalance ? 'text-red-400' : 'text-neutral-500'}>
                        ${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={handlePlaceBet}
                    disabled={
                      !betAmount || 
                      !walletConnected || 
                      insufficientBalance || 
                      betAmountNum < 0.10 ||
                      txState.status === 'approving' ||
                      txState.status === 'confirming'
                    }
                    className={`
                      w-full py-3 rounded-lg font-medium text-sm transition-all
                      ${betAmount && walletConnected && !insufficientBalance && betAmountNum >= 0.10 && txState.status === 'idle'
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}
                    `}
                  >
                    {!walletConnected
                      ? 'Connect Wallet'
                      : txState.status === 'approving' || txState.status === 'confirming'
                        ? 'Processing...'
                        : insufficientBalance
                          ? 'Insufficient balance'
                          : `Bet on ${selectedAgent.name}`
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Closed State */}
        {!bettingAllowed && userBetsList.length === 0 && (
          <div className="px-4 pb-4">
            <div className="pt-3 border-t border-neutral-800 text-center">
              <p className="text-neutral-600 text-xs">
                {gameStatus === 'resolved' ? 'Game ended' : gameStatus === 'cancelled' ? 'Game cancelled' : 'Betting closed'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Your Bets - Separate Card */}
      {userBetsList.length > 0 && (
        <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
              <h3 className="text-xs font-medium tracking-widest text-white uppercase">
                Your Bets
              </h3>
              <span className="text-sm text-neutral-500 tabular-nums">
                ${userTotalBet.toFixed(2)}
              </span>
            </div>
            
            {/* Bet List */}
            <div className="space-y-2">
              {userBetsList.map((agent, idx) => (
                <div 
                  key={agent.index}
                  className={`
                    flex items-center justify-between py-2
                    ${idx < userBetsList.length - 1 ? 'border-b border-neutral-800/50' : ''}
                  `}
                >
                  <span className="text-sm text-neutral-400">{agent.name}</span>
                  <span className="text-sm text-white tabular-nums">
                    ${agent.userBet.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Footer Link */}
            <div className="pt-3 mt-3 border-t border-neutral-800">
              <Link 
                href="/bets" 
                className="text-[10px] text-neutral-600 hover:text-white uppercase tracking-wider transition-colors"
              >
                View History →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
