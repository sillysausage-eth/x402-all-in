/**
 * Providers Index
 * Combines all providers into a single component
 * 
 * Created: Jan 5, 2026
 * Purpose: Single entry point for all app providers
 */

'use client'

import { ReactNode } from 'react'
import { Web3Provider } from './web3-provider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Web3Provider>
      {children}
    </Web3Provider>
  )
}


