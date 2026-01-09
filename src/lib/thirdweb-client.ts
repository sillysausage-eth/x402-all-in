/**
 * Thirdweb Client Configuration
 * Creates and exports the Thirdweb client for wallet connections
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 9, 2026 - Added support for both Base mainnet and Sepolia
 * Updated: Jan 9, 2026 - Using built-in chain definitions from thirdweb/chains
 * Purpose: Centralized Thirdweb client configuration for the app
 */

import { createThirdwebClient } from 'thirdweb'
import { base, baseSepolia } from 'thirdweb/chains'

// Re-export chains for use in other files
export { base, baseSepolia }

// Create the Thirdweb client
// Client ID is required for client-side usage
export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '',
})

// Supported chains - both mainnet and testnet
export const supportedChains = [base, baseSepolia]

// Default chain based on environment (for initial connection)
export const defaultChain = process.env.NEXT_PUBLIC_CHAIN_ENV === 'production' 
  ? base 
  : baseSepolia

// USDC contract addresses
export const USDC_ADDRESSES = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet USDC
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
} as const

// Get USDC address for a specific chain (defaults to default chain)
export function getUsdcAddress(chainId?: number) {
  const id = chainId || defaultChain.id
  return USDC_ADDRESSES[id as keyof typeof USDC_ADDRESSES]
}

// Betting pool wallet (receives bets, distributes payouts)
export const BETTING_POOL_ADDRESS = process.env.NEXT_PUBLIC_BETTING_POOL_ADDRESS as `0x${string}`

// Poker pot wallet (AI agent bets go here)
export const POKER_POT_ADDRESS = process.env.NEXT_PUBLIC_POKER_POT_ADDRESS as `0x${string}`
