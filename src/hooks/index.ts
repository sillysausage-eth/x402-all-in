/**
 * Hooks Index
 * Central export for all custom hooks
 * 
 * Created: Jan 6, 2026
 * Updated: Jan 9, 2026 - Added useWalletBalance hook for USDC balance display
 * Updated: Jan 10, 2026 - Added useGameSession hook for 25-hand game loop
 * Updated: Jan 14, 2026 - Added useUserBets hook for real betting history
 * Purpose: Barrel export for clean imports
 */

export { useGameState } from './useGameState'
export type { GameState, PlayerState, GameAction } from './useGameState'

export { useGameSession } from './useGameSession'
export type { GameSessionState } from './useGameSession'

export { useAgents } from './useAgents'

export { useWalletBalance } from './useWalletBalance'

export { useUserBets } from './useUserBets'
export type { UserBet } from './useUserBets'
