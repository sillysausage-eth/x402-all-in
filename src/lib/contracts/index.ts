/**
 * PokerBetting Smart Contract TypeScript Integration
 * 
 * Created: January 10, 2026
 * Updated: January 26, 2026 - Single source of truth from config.ts
 * 
 * Network: Base (mainnet) & Base Sepolia (testnet)
 * 
 * IMPORTANT: All addresses are defined in config.ts - this file re-exports them
 * Environment controlled by: NEXT_PUBLIC_CHAIN_ENV ('production' | 'development')
 * 
 * This module provides:
 * - Contract addresses for different networks (via config.ts)
 * - ABI for contract interactions
 * - TypeScript types for contract structs
 * - Helper functions for formatting USDC amounts
 */

import { base, baseSepolia } from "thirdweb/chains";
import { SEPOLIA, MAINNET } from "./config";

/**
 * V2 ABI - Regenerated January 22, 2026
 */
import PokerBettingABI from "./PokerBetting.abi.json";

// Re-export config for easy access
export * from "./config";

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES (derived from config.ts - single source of truth)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deployed contract addresses - derived from config.ts
 * This is for backwards compatibility - prefer using getCurrentConfig() directly
 */
export const CONTRACT_ADDRESSES = {
  [baseSepolia.id]: {
    pokerBetting: SEPOLIA.contracts.pokerBetting,
    usdc: SEPOLIA.contracts.usdc,
  },
  [base.id]: {
    pokerBetting: MAINNET.contracts.pokerBetting,
    usdc: MAINNET.contracts.usdc,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ABI EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const POKER_BETTING_ABI = PokerBettingABI;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** USDC uses 6 decimal places */
export const USDC_DECIMALS = 6;

/** Minimum bet: 0.10 USDC = 100000 in raw units */
export const MIN_BET = 100_000n;

/** Basis points denominator (100% = 10000) */
export const BASIS_POINTS = 10_000n;

/** Maximum agents (4 AI players) */
export const MAX_AGENTS = 4;

/** Agent IDs map to these names */
export const AGENT_NAMES = ["Chamath", "Sacks", "Jason", "Friedberg"] as const;

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

/** Game status enum matching the contract */
export enum GameStatus {
  Open = 0,
  Closed = 1,
  Resolved = 2,
  Cancelled = 3,
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Game struct from contract */
export interface Game {
  totalPool: bigint;
  agentPools: [bigint, bigint, bigint, bigint];
  winnerAgentId: number;
  status: GameStatus;
  createdAt: number;
  resolvedAt: number;
}

/** 
 * User bets struct from contract (multi-bet system)
 * Users can bet on multiple agents, multiple times
 */
export interface UserBets {
  /** Amount bet on each agent [Chamath, Sacks, Jason, Friedberg] */
  agentBets: [bigint, bigint, bigint, bigint];
  /** Total amount bet across all agents */
  totalBet: bigint;
}

/** @deprecated Use UserBets instead - legacy single bet type */
export interface UserBet {
  agentId: number;
  amount: bigint;
}

/** Claimable amount breakdown */
export interface ClaimableAmount {
  gross: bigint;
  fee: bigint;
  net: bigint;
}

/** Potential payout calculation */
export interface PotentialPayout {
  gross: bigint;
  fee: bigint;
  net: bigint;
}

/** Odds array (4 agents) - values in basis points where 10000 = 1.0x */
export type Odds = [bigint, bigint, bigint, bigint];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert USDC human-readable amount to raw units
 * @param amount - Human readable amount (e.g., 10.50)
 * @returns Raw units for contract (e.g., 10500000n)
 */
export function parseUSDC(amount: number | string): bigint {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS));
}

/**
 * Convert raw USDC units to human-readable amount
 * @param rawAmount - Raw units from contract
 * @returns Human readable amount
 */
export function formatUSDC(rawAmount: bigint): string {
  const value = Number(rawAmount) / 10 ** USDC_DECIMALS;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format odds to human-readable multiplier
 * @param odds - Odds in basis points (10000 = 1.0x)
 * @returns Formatted string (e.g., "2.5x")
 */
export function formatOdds(odds: bigint): string {
  if (odds === 0n) return "—";
  const multiplier = Number(odds) / Number(BASIS_POINTS);
  return `${multiplier.toFixed(2)}x`;
}

/**
 * Get agent name from ID
 */
export function getAgentName(agentId: number): string {
  if (agentId >= 0 && agentId < MAX_AGENTS) {
    return AGENT_NAMES[agentId];
  }
  return "Unknown";
}

/**
 * Get game status label
 */
export function getGameStatusLabel(status: GameStatus): string {
  switch (status) {
    case GameStatus.Open:
      return "Betting Open";
    case GameStatus.Closed:
      return "Betting Closed";
    case GameStatus.Resolved:
      return "Resolved";
    case GameStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

/**
 * Check if betting is currently allowed for a game
 */
export function canPlaceBet(game: Game): boolean {
  return game.status === GameStatus.Open;
}

/**
 * Check if a user can claim winnings (multi-bet system)
 * User wins if they bet on the winning agent
 */
export function canClaimWinnings(game: Game, userBets: UserBets): boolean {
  if (game.status !== GameStatus.Resolved) return false;
  if (game.winnerAgentId >= MAX_AGENTS) return false;
  return userBets.agentBets[game.winnerAgentId] > 0n;
}

/**
 * Check if a user can claim a refund (multi-bet system)
 * Refund returns ALL bets on ALL agents
 */
export function canClaimRefund(game: Game, userBets: UserBets): boolean {
  return game.status === GameStatus.Cancelled && userBets.totalBet > 0n;
}

/**
 * Get user's winning bet amount (if they bet on the winner)
 */
export function getWinningBetAmount(game: Game, userBets: UserBets): bigint {
  if (game.status !== GameStatus.Resolved) return 0n;
  if (game.winnerAgentId >= MAX_AGENTS) return 0n;
  return userBets.agentBets[game.winnerAgentId];
}

/**
 * Calculate implied probability from odds
 * @param odds - Odds in basis points
 * @returns Probability as percentage (0-100)
 */
export function oddsToImpliedProbability(odds: bigint): number {
  if (odds === 0n) return 0;
  return (Number(BASIS_POINTS) / Number(odds)) * 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT GETTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return addresses;
}
