/**
 * useWalletBalance Hook
 * Fetches and returns the connected wallet's USDC balance on Base
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 9, 2026 - Migrated from wagmi to Thirdweb
 * Updated: Jan 9, 2026 - Support multi-chain (Base mainnet + Sepolia)
 * 
 * Features:
 * - Real-time USDC balance fetching via Thirdweb
 * - Automatic refresh on account change
 * - Formatted balance display (6 decimals for USDC)
 * - Multi-chain support (detects active chain)
 */

import { useEffect, useState, useCallback } from 'react'
import { useActiveAccount, useActiveWalletChain, useWalletBalance as useThirdwebBalance } from 'thirdweb/react'
import { thirdwebClient, USDC_ADDRESSES, defaultChain, base } from '@/lib/thirdweb-client'

export function useWalletBalance() {
  const account = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const [formattedBalance, setFormattedBalance] = useState('0.00')

  // Get USDC address for the active chain (fallback to default)
  const chainId = activeChain?.id || defaultChain.id
  const usdcAddress = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES] || USDC_ADDRESSES[base.id]

  // Use Thirdweb's balance hook for USDC
  const { data: balanceData, isLoading, refetch } = useThirdwebBalance({
    client: thirdwebClient,
    chain: activeChain || defaultChain,
    address: account?.address,
    tokenAddress: usdcAddress,
  })

  // Format the balance when it changes
  useEffect(() => {
    if (balanceData?.displayValue) {
      const num = parseFloat(balanceData.displayValue)
      setFormattedBalance(num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }))
    } else {
      setFormattedBalance('0.00')
    }
  }, [balanceData])

  // Manual refresh function
  const refreshBalance = useCallback(() => {
    if (account?.address) {
      refetch()
    }
  }, [account?.address, refetch])

  return {
    usdcBalance: formattedBalance,
    rawBalance: balanceData?.value,
    displayValue: balanceData?.displayValue,
    symbol: balanceData?.symbol || 'USDC',
    isLoading,
    isConnected: !!account?.address,
    address: account?.address,
    refreshBalance,
  }
}
