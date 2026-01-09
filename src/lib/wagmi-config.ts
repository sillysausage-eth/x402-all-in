/**
 * Wagmi & OnchainKit Configuration
 * Web3 wallet connection configuration for Base network
 * 
 * Created: Jan 5, 2026
 * Purpose: Configure wagmi for Coinbase wallet and Base chain
 */

import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

// Use Base Sepolia for development, Base mainnet for production
const activeChain = process.env.NEXT_PUBLIC_CHAIN_ENV === 'production' ? base : baseSepolia

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    coinbaseWallet({
      appName: 'x402 All-In',
      preference: 'smartWalletOnly', // Use Coinbase Smart Wallet
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

// USDC contract addresses
export const USDC_ADDRESSES = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet USDC
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
} as const

// Get active USDC address
export function getUsdcAddress() {
  return USDC_ADDRESSES[activeChain.id]
}

// Betting pool wallet (receives bets, distributes payouts)
export const BETTING_POOL_ADDRESS = process.env.NEXT_PUBLIC_BETTING_POOL_ADDRESS as `0x${string}`

// Poker pot wallet (AI agent bets go here)
export const POKER_POT_ADDRESS = process.env.NEXT_PUBLIC_POKER_POT_ADDRESS as `0x${string}`

// Export active chain for use in components
export { activeChain }


