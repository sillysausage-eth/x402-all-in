/**
 * Web3 Provider
 * Wraps the app with wagmi and OnchainKit providers for wallet functionality
 * 
 * Created: Jan 5, 2026
 * Purpose: Provide wallet connection and blockchain interaction capabilities
 */

'use client'

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { wagmiConfig, activeChain } from '@/lib/wagmi-config'

// Import OnchainKit styles
import '@coinbase/onchainkit/styles.css'

const queryClient = new QueryClient()

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={activeChain}
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          config={{
            appearance: {
              name: 'x402 All-In',
              logo: '/logo.png',
              mode: 'dark',
              theme: 'cyberpunk',
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}


