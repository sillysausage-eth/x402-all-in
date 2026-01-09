/**
 * Hooks Index
 * Central export for all custom hooks
 * 
 * Created: Jan 6, 2026
 * Updated: Jan 9, 2026 - Added useWalletBalance hook for USDC balance display
 * Purpose: Barrel export for clean imports
 */

export { useGameState } from './useGameState'
export type { GameState, PlayerState, GameAction } from './useGameState'

export { useAgents } from './useAgents'

export { useWalletBalance } from './useWalletBalance'

