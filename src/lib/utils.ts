/**
 * Utility Functions
 * Common helper functions used throughout the app
 * 
 * Created: Jan 5, 2026
 * Purpose: Shared utilities for styling, formatting, etc.
 */

import { type ClassValue, clsx } from 'clsx'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Format USDC amount for display
export function formatUsdc(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format odds for display (e.g., 2.1x)
export function formatOdds(odds: number): string {
  return `${odds.toFixed(1)}x`
}

// Shorten wallet address for display
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// Calculate time remaining until a timestamp
export function getTimeRemaining(targetTime: string): { 
  total: number
  seconds: number 
  isExpired: boolean 
} {
  const total = new Date(targetTime).getTime() - Date.now()
  const seconds = Math.max(0, Math.floor(total / 1000))
  return {
    total,
    seconds,
    isExpired: total <= 0,
  }
}

// Sleep utility for game timing
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate a random ID
export function generateId(): string {
  return crypto.randomUUID()
}


