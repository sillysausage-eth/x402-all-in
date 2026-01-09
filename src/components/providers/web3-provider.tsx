/**
 * Web3 Provider
 * Wraps the app with Thirdweb provider for wallet functionality
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 9, 2026 - Migrated from OnchainKit to Thirdweb for better wallet support
 *                        Now supports: Social login (Google, Apple, Discord, Email),
 *                        WalletConnect (350+ wallets), and proper extension detection
 * Purpose: Provide wallet connection and blockchain interaction capabilities
 */

'use client'

import { ReactNode } from 'react'
import { ThirdwebProvider } from 'thirdweb/react'

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  )
}
