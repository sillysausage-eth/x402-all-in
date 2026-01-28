/**
 * Thirdweb Client Configuration
 * Creates and exports the Thirdweb client for wallet connections
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 26, 2026 - Consolidated to use single source of truth from contracts/config.ts
 * 
 * IMPORTANT: All contract addresses come from src/lib/contracts/config.ts
 * Environment is controlled by NEXT_PUBLIC_CHAIN_ENV ('production' | 'development')
 */

import { createThirdwebClient, defineChain } from 'thirdweb'
import { base, baseSepolia } from 'thirdweb/chains'
import { getCurrentConfig, SEPOLIA, MAINNET } from './contracts/config'

// Re-export chains for use in other files
export { base, baseSepolia }

// Custom Base Sepolia with public RPC to avoid Thirdweb rate limits
export const baseSepoliaCustom = defineChain({
  ...baseSepolia,
  rpc: 'https://sepolia.base.org', // Base's official free RPC
})

// Custom Base mainnet with public RPC
export const baseCustom = defineChain({
  ...base,
  rpc: 'https://mainnet.base.org', // Base's official free RPC  
})

// Create the Thirdweb client
// Client ID is required for client-side usage
export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '',
})

// Supported chains - use custom chains with public RPCs
export const supportedChains = [baseCustom, baseSepoliaCustom]

// Default chain based on environment (for initial connection)
// Uses custom chains with public RPCs to avoid Thirdweb rate limits
export const defaultChain = process.env.NEXT_PUBLIC_CHAIN_ENV === 'production' 
  ? baseCustom 
  : baseSepoliaCustom

// USDC addresses - sourced from contracts/config.ts (single source of truth)
export const USDC_ADDRESSES = {
  [base.id]: MAINNET.contracts.usdc,
  [baseSepolia.id]: SEPOLIA.contracts.usdc,
} as const

// Get USDC address for a specific chain (defaults to current environment)
export function getUsdcAddress(chainId?: number) {
  if (chainId) {
    return USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES]
  }
  return getCurrentConfig().contracts.usdc
}
