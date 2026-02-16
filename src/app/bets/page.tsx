/**
 * Bets Page - /bets
 * User's betting history, active bets, and unclaimed winnings
 * 
 * Created: Jan 12, 2026 (renamed from /history)
 * Updated: Jan 14, 2026 - Expanded content width, unified design patterns with Metrics
 * Updated: Jan 14, 2026 - Simplified transaction UI: removed potentials, odds, bet amount for claimed
 * Updated: Jan 14, 2026 - Connected to real on-chain data via smart contract reads
 * Updated: Jan 14, 2026 - Connected claims to useClaimWinnings hook (real smart contract)
 * Updated: Jan 16, 2026 - Always show Bet amount for all bets, added NaN guard for Payout display
 * Updated: Feb 16, 2026 - Replaced inline footer with shared Footer component
 * Updated: Feb 16, 2026 - Dynamic BaseScan URL from getCurrentConfig().explorer
 *                        - Was hardcoded to sepolia.basescan.org
 * Purpose: Central hub for all betting activity - view past bets, claim winnings
 * 
 * Features:
 * - Real data from smart contract (source of truth)
 * - Connect wallet CTA when not connected
 * - Unclaimed winnings summary with claim per game
 * - Active bets (games in progress)
 * - Past bets with filters (all, won, lost, pending)
 * - Transaction hash links to BaseScan
 * - Real smart contract claim functionality
 */

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Header, Footer } from '@/components/layout'
import { useUserBets, UserBet } from '@/hooks'
import { ConnectWalletButton } from '@/components/wallet'
import { useClaimWinnings } from '@/lib/contracts/hooks'
import { getCurrentConfig } from '@/lib/contracts/config'

type FilterType = 'all' | 'active' | 'won' | 'lost' | 'unclaimed'

// BaseScan URL for transaction links - dynamic based on current chain
const BASESCAN_URL = `${getCurrentConfig().explorer}/tx/`

export default function BetsPage() {
  const { 
    bets, 
    isLoading, 
    error, 
    isConnected, 
    walletAddress,
    stats,
    refetch 
  } = useUserBets()
  
  const { claimWinnings, txState: claimTxState, reset: resetClaimState } = useClaimWinnings()
  
  const [filter, setFilter] = useState<FilterType>('all')
  const [claimingGameId, setClaimingGameId] = useState<number | null>(null)
  const [claimSuccess, setClaimSuccess] = useState<{ gameId: number; txHash: string } | null>(null)

  // Filter bets
  const filteredBets = bets.filter(bet => {
    switch (filter) {
      case 'active':
        return bet.status === 'pending'
      case 'won':
        return bet.status === 'won'
      case 'lost':
        return bet.status === 'lost'
      case 'unclaimed':
        return bet.status === 'won' && !bet.claimed
      default:
        return true
    }
  })

  // Calculate totals
  const unclaimedTotal = bets
    .filter(b => b.status === 'won' && !b.claimed)
    .reduce((sum, b) => sum + (b.payoutAmount || 0), 0)
  
  const unclaimedCount = bets.filter(b => b.status === 'won' && !b.claimed).length
  const activeBetsCount = bets.filter(b => b.status === 'pending').length

  // Get unique unclaimed game IDs (for batch claiming we claim per game, not per bet)
  const unclaimedGameIds = [...new Set(
    bets
      .filter(b => b.status === 'won' && !b.claimed)
      .map(b => b.onChainGameId)
  )]

  // Handle claim for a specific game
  const handleClaim = useCallback(async (onChainGameId: number) => {
    setClaimingGameId(onChainGameId)
    resetClaimState()
    setClaimSuccess(null)
    
    try {
      const txHash = await claimWinnings(BigInt(onChainGameId))
      
      if (txHash) {
        setClaimSuccess({ gameId: onChainGameId, txHash })
        // Refetch bets after successful claim
        setTimeout(() => {
          refetch()
          setClaimingGameId(null)
        }, 2000)
      } else {
        setClaimingGameId(null)
      }
    } catch (err) {
      console.error('Claim failed:', err)
      setClaimingGameId(null)
    }
  }, [claimWinnings, resetClaimState, refetch])

  // Handle claim all (claim each game sequentially)
  const handleClaimAll = useCallback(async () => {
    for (const gameId of unclaimedGameIds) {
      await handleClaim(gameId)
    }
  }, [unclaimedGameIds, handleClaim])

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Truncate tx hash for display
  const truncateTxHash = (hash: string | null) => {
    if (!hash) return null
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  // Truncate wallet address
  const truncateAddress = (address: string | null) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Group bets by game for display (since claims are per-game)
  const getBetsForGame = (onChainGameId: number) => 
    bets.filter(b => b.onChainGameId === onChainGameId)
  
  const getGameClaimableTotal = (onChainGameId: number) =>
    getBetsForGame(onChainGameId)
      .filter(b => b.status === 'won' && !b.claimed)
      .reduce((sum, b) => sum + (b.payoutAmount || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-extrabold tracking-wide text-white">YOUR BETS</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isConnected 
              ? `Wallet: ${truncateAddress(walletAddress)}`
              : 'Connect your wallet to view your bets'
            }
          </p>
        </motion.div>

        {/* Not Connected State */}
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800"
          >
            <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-500 text-center max-w-md mb-6">
              Connect your wallet to view your betting history, active bets, and claim any winnings.
            </p>
            <ConnectWalletButton />
          </motion.div>
        ) : (
          <>
            {/* Stats Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Active Bets</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.activeBets}</p>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Wagered</p>
                <p className="text-2xl font-bold text-white mt-1">${stats.totalWagered.toFixed(2)}</p>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Won</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">${stats.totalWon.toFixed(2)}</p>
              </div>
              <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Win Rate</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.totalBets > 0 && stats.winRate > 0
                    ? `${Math.round(stats.winRate)}%`
                    : '-'
                  }
                </p>
              </div>
            </motion.div>

            {/* Unclaimed Winnings Banner */}
            {unclaimedTotal > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 p-6 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-emerald-400 font-semibold mb-1">
                      Unclaimed Winnings
                    </p>
                    <p className="text-3xl font-black text-white">
                      ${unclaimedTotal.toFixed(2)} <span className="text-lg text-neutral-500">USDC</span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      From {unclaimedGameIds.length} game{unclaimedGameIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {unclaimedGameIds.length === 1 ? (
                    <button
                      onClick={() => handleClaim(unclaimedGameIds[0])}
                      disabled={claimingGameId !== null}
                      className={`px-6 py-3 font-bold rounded-xl transition-colors ${
                        claimingGameId !== null
                          ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                          : 'bg-emerald-500 text-black hover:bg-emerald-400'
                      }`}
                    >
                      {claimingGameId !== null ? (
                        <span className="flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="inline-block w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full"
                          />
                          Claiming...
                        </span>
                      ) : (
                        `CLAIM $${unclaimedTotal.toFixed(2)}`
                      )}
                    </button>
                  ) : (
                    <p className="text-xs text-neutral-400">
                      Claim each game individually below
                    </p>
                  )}
                </div>
                
                {/* Claim success message */}
                {claimSuccess && (
                  <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg">
                    <p className="text-sm text-emerald-400">
                      Claimed successfully!{' '}
                      <a 
                        href={`${BASESCAN_URL}${claimSuccess.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-emerald-300"
                      >
                        View transaction
                      </a>
                    </p>
                  </div>
                )}
                
                {/* Claim error message */}
                {claimTxState.status === 'error' && (
                  <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                    <p className="text-sm text-red-400">
                      {claimTxState.error || 'Claim failed. Please try again.'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
                <button 
                  onClick={refetch}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(['all', 'active', 'unclaimed', 'won', 'lost'] as FilterType[]).map((f) => {
                const count = f === 'active' ? activeBetsCount : f === 'unclaimed' ? unclaimedCount : null
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      filter === f
                        ? 'bg-white text-black'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {count !== null && count > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                        f === 'unclaimed' ? 'bg-emerald-500 text-black' : 'bg-white text-black'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Bets List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-3 border-white border-t-transparent rounded-full"
                />
                <p className="text-neutral-500 text-sm mt-4">Loading your bets from the blockchain...</p>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="text-center py-12 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-neutral-400 font-medium">No bets found</p>
                <p className="text-sm text-neutral-600 mt-1">
                  {filter === 'all' 
                    ? 'Place your first bet to see it here'
                    : `No ${filter} bets`
                  }
                </p>
                <Link 
                  href="/"
                  className="inline-block mt-4 px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Go to Lobby
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBets.map((bet, index) => {
                  const isClaimingThis = claimingGameId === bet.onChainGameId
                  const gameClaimable = getGameClaimableTotal(bet.onChainGameId)
                  const canClaim = bet.status === 'won' && !bet.claimed
                  
                  return (
                    <motion.div
                      key={bet.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 rounded-xl border ${
                        bet.status === 'won' && !bet.claimed
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : bet.status === 'won'
                            ? 'bg-neutral-900/50 border-neutral-700'
                            : bet.status === 'lost'
                              ? 'bg-neutral-900/30 border-neutral-800'
                              : 'bg-neutral-900/50 border-neutral-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Agent & Game Info */}
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            bet.status === 'won' 
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : bet.status === 'lost'
                                ? 'bg-neutral-700 text-neutral-500'
                                : 'bg-neutral-700 text-neutral-300'
                          }`}>
                            {bet.status === 'won' ? '✓' : bet.status === 'lost' ? '✕' : '•'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white">{bet.agentName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                bet.status === 'won'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : bet.status === 'lost'
                                    ? 'bg-neutral-700 text-neutral-500'
                                    : 'bg-neutral-700 text-neutral-300'
                              }`}>
                                {bet.status === 'pending' ? 'ACTIVE' : bet.status.toUpperCase()}
                              </span>
                              {bet.status === 'won' && bet.claimed && (
                                <span className="text-xs text-neutral-500">Claimed</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Game #{bet.gameNumber} • {formatDate(bet.placedAt)}
                            </p>

                            {/* Transaction links */}
                            {bet.betTxHash && (
                              <div className="flex items-center gap-3 mt-2">
                                <a
                                  href={`${BASESCAN_URL}${bet.betTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                                >
                                  Bet: {truncateTxHash(bet.betTxHash)}
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                {bet.claimTxHash && (
                                  <a
                                    href={`${BASESCAN_URL}${bet.claimTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                  >
                                    Claim: {truncateTxHash(bet.claimTxHash)}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Always show Bet amount */}
                          <div className="text-right">
                            <p className="text-xs text-neutral-500">Bet</p>
                            <p className="font-semibold text-white">${bet.amount.toFixed(2)}</p>
                          </div>
                          
                          {/* Show Payout for won bets (with valid payout) */}
                          {bet.status === 'won' && bet.payoutAmount != null && !isNaN(bet.payoutAmount) && (
                            <div className="text-right">
                              <p className="text-xs text-neutral-500">Payout</p>
                              <p className="font-semibold text-emerald-400">
                                ${bet.payoutAmount.toFixed(2)}
                              </p>
                            </div>
                          )}

                          {canClaim && (
                            <button
                              onClick={() => handleClaim(bet.onChainGameId)}
                              disabled={claimingGameId !== null}
                              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                                isClaimingThis
                                  ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                                  : claimingGameId !== null
                                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                                    : 'bg-emerald-500 text-black hover:bg-emerald-400'
                              }`}
                            >
                              {isClaimingThis ? (
                                <span className="flex items-center gap-2">
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="inline-block w-3 h-3 border-2 border-neutral-500 border-t-transparent rounded-full"
                                  />
                                </span>
                              ) : (
                                'Claim'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
