/**
 * ClaimWinnings Component
 * UI for claiming winnings or refunds from resolved/cancelled games
 * 
 * Created: January 12, 2026
 * Updated: January 14, 2026 - Added userBet prop to show full breakdown:
 *                           - Your bet (on winner only)
 *                           - Winnings (profit portion)
 *                           - Fee (5% of winnings)
 *                           - Net payout
 * Updated: January 14, 2026 - Styling cleanup:
 *                           - Removed excess green from container
 *                           - Only CTA button is green now
 *                           - Changed userTotalBet to userBetOnWinner
 * Updated: January 26, 2026 - FIX: Hide claim button immediately after successful transaction
 *                           - Button now hides when txState.status === 'success' (not just hasClaimed)
 *                           - Prevents button from showing after claim completes but before contract read updates
 * Purpose: Allow users to claim their on-chain winnings after game resolution
 * 
 * Features:
 * - Shows claimable amount breakdown (bet on winner, winnings, fee, net)
 * - Handles both winnings (resolved games) and refunds (cancelled games)
 * - Transaction status tracking with BaseScan link
 * - Disabled state when already claimed
 */

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useClaimWinnings, useClaimRefund, type TransactionStatus } from '@/lib/contracts/hooks'
import { GameStatus } from '@/lib/contracts'

interface ClaimWinningsProps {
  onChainGameId: number
  gameStatus: GameStatus
  userBetOnWinner: number  // Only the bet placed on the winning agent
  claimableGross: number
  claimableFee: number
  claimableNet: number
  hasClaimed: boolean
  onSuccess?: () => void
}

const TX_STATUS_MESSAGES: Record<TransactionStatus, string> = {
  idle: '',
  approving: '', // Not used for claims
  confirming: 'Claiming...',
  success: 'Claimed!',
  error: 'Claim failed',
}

export function ClaimWinnings({
  onChainGameId,
  gameStatus,
  userBetOnWinner,
  claimableGross,
  claimableFee,
  claimableNet,
  hasClaimed,
  onSuccess,
}: ClaimWinningsProps) {
  const { claimWinnings, txState: winningsTxState, reset: resetWinnings } = useClaimWinnings()
  const { claimRefund, txState: refundTxState, reset: resetRefund } = useClaimRefund()
  
  const isResolved = gameStatus === GameStatus.Resolved
  const isCancelled = gameStatus === GameStatus.Cancelled
  const canClaim = (isResolved || isCancelled) && claimableNet > 0 && !hasClaimed
  
  const txState = isResolved ? winningsTxState : refundTxState
  const isProcessing = txState.status === 'confirming'
  
  // Calculate winnings (profit portion only) - based on bet on winner, not total bets
  const winningsProfit = Math.max(0, claimableGross - userBetOnWinner)
  
  const handleClaim = useCallback(async () => {
    if (!canClaim) return
    
    const gameIdBigInt = BigInt(onChainGameId)
    let txHash: string | null = null
    
    if (isResolved) {
      txHash = await claimWinnings(gameIdBigInt)
    } else if (isCancelled) {
      txHash = await claimRefund(gameIdBigInt)
    }
    
    if (txHash && onSuccess) {
      onSuccess()
    }
  }, [canClaim, onChainGameId, isResolved, isCancelled, claimWinnings, claimRefund, onSuccess])
  
  // Nothing to show if no claimable amount
  if (claimableNet <= 0 && !hasClaimed) {
    return null
  }
  
  const formatAmount = (amount: number) => 
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 rounded-xl border border-neutral-700 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          {isCancelled ? 'Refund Available' : 'Winnings Available'}
        </h3>
        {hasClaimed && (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
            ✓ Claimed
          </span>
        )}
      </div>
      
      {/* Amount Breakdown - Full detail */}
      <div className="space-y-2 mb-4">
        {isResolved && (
          <>
            {/* Your bet (on winner only) */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">Your bet</span>
              <span className="text-white tabular-nums">
                ${formatAmount(userBetOnWinner)}
              </span>
            </div>
            
            {/* Winnings (profit) */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">Winnings</span>
              <span className="text-white tabular-nums">
                +${formatAmount(winningsProfit)}
              </span>
            </div>
            
            {/* Fee */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">Fee (5% of winnings)</span>
              <span className="text-white tabular-nums">
                -${formatAmount(claimableFee)}
              </span>
            </div>
            
            <div className="border-t border-neutral-700 pt-2" />
          </>
        )}
        
        {/* Net payout */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white">
            {isCancelled ? 'Refund amount' : 'Net payout'}
          </span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums">
            ${formatAmount(claimableNet)}
          </span>
        </div>
      </div>
      
      {/* Transaction Status */}
      {txState.status !== 'idle' && (
        <div className={`p-3 rounded-lg text-sm mb-3 ${
          txState.status === 'error' 
            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
            : txState.status === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-neutral-500/10 border border-neutral-500/30 text-neutral-300'
        }`}>
          <div className="flex items-center gap-2">
            {txState.status === 'confirming' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
            )}
            {txState.status === 'success' && <span>✓</span>}
            {txState.status === 'error' && <span>✗</span>}
            <span>{TX_STATUS_MESSAGES[txState.status]}</span>
          </div>
          {txState.error && (
            <p className="text-xs mt-1 opacity-75">{txState.error}</p>
          )}
          {txState.txHash && (
            <a 
              href={`https://sepolia.basescan.org/tx/${txState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1 underline opacity-75 hover:opacity-100 block"
            >
              View on BaseScan →
            </a>
          )}
        </div>
      )}
      
      {/* Claim Button - Hide if already claimed OR if transaction succeeded */}
      {!hasClaimed && txState.status !== 'success' && (
        <button
          onClick={handleClaim}
          disabled={!canClaim || isProcessing}
          className={`
            w-full py-3 rounded-lg font-bold text-sm transition-all
            ${canClaim && !isProcessing
              ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}
          `}
        >
          {isProcessing 
            ? 'Claiming...' 
            : isCancelled 
              ? 'Claim Refund' 
              : 'Claim Winnings'
          }
        </button>
      )}
      
      {/* Already Claimed Message - Show if claimed OR transaction succeeded */}
      {(hasClaimed || txState.status === 'success') && (
        <div className="text-center text-sm text-emerald-400/70">
          Your {isCancelled ? 'refund' : 'winnings'} have been claimed
        </div>
      )}
    </motion.div>
  )
}
