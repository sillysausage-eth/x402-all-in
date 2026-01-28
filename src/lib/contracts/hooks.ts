/**
 * React Hooks for PokerBetting Contract
 * 
 * Created: January 10, 2026
 * Updated: January 12, 2026 - Fixed multi-bet system method signatures to match deployed contract
 *                           - Added useBettingData hook for real-time contract data
 *                           - Added transaction status tracking
 * Updated: January 13, 2026 - Improved error handling for multi-bet transactions
 *                           - Better decoding of contract revert errors
 *                           - Pre-check game status before placing bet to give immediate feedback
 *                           - Handle Thirdweb/Viem error objects with nested causes
 * Updated: January 13, 2026 - RATE LIMIT FIX: Memoized contract instances to prevent loops
 *                           - usePokerBettingContract/useUSDCContract now use useMemo
 *                           - Without memoization, getContract returned new ref each render,
 *                             causing useCallback/useEffect deps to change → infinite loops
 *                           - Reduced polling interval from 10s to 30s
 *                           - Added rate limit detection to suppress error spam
 *                           - Removed excessive debug logging from BettingPanel
 * Updated: January 26, 2026 - CRITICAL FIX: Public reads no longer require wallet connection
 *                           - usePokerBettingContract now uses default chain when no wallet
 *                           - This allows pool data to display for ALL users (not just connected)
 *                           - Uses baseSepolia as default (TODO: switch to base for production)
 * 
 * These hooks integrate with Thirdweb for wallet connection and contract calls.
 * Contract methods are specified as strings to avoid ABI typing issues.
 */

"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { 
  getContract, 
  readContract, 
  prepareContractCall,
  waitForReceipt,
  defineChain,
} from "thirdweb";
import { useActiveAccount, useActiveWalletChain, useSendTransaction } from "thirdweb/react";
import { approve, allowance } from "thirdweb/extensions/erc20";

import { thirdwebClient as client } from "@/lib/thirdweb-client";
import { 
  getContractAddresses,
  parseUSDC,
  formatUSDC,
  type Game,
  type UserBets,
  type ClaimableAmount,
  type Odds,
  GameStatus,
  USDC_DECIMALS,
  BASIS_POINTS,
} from "./index";

// Default chain for public reads when no wallet is connected
// Uses environment variable to determine production vs testnet
const DEFAULT_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ENV === "production" ? 8453 : 84532;
const defaultChain = defineChain(DEFAULT_CHAIN_ID);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TransactionStatus = 'idle' | 'approving' | 'confirming' | 'success' | 'error';

export interface TransactionState {
  status: TransactionStatus;
  error?: string;
  txHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT INSTANCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the PokerBetting contract instance for the current chain
 * IMPORTANT: Memoized to prevent infinite re-render loops
 * 
 * Updated: Jan 26, 2026 - Uses default chain when no wallet connected
 * This allows public reads (pool data) to work without wallet connection
 */
export function usePokerBettingContract() {
  const walletChain = useActiveWalletChain();
  
  // Use wallet chain if connected, otherwise use default chain for public reads
  const chain = walletChain || defaultChain;
  
  // Memoize contract to prevent new reference on every render
  // This is critical - without memo, getContract returns new object each time,
  // which causes useCallback/useEffect dependencies to change, creating loops
  const contract = useMemo(() => {
    try {
      const addresses = getContractAddresses(chain.id);
      return getContract({
        client,
        chain,
        address: addresses.pokerBetting,
      });
    } catch {
      return null;
    }
  }, [chain.id]); // Only recreate when chain ID changes
  
  return contract;
}

/**
 * Get the USDC contract instance for approvals
 * IMPORTANT: Memoized to prevent infinite re-render loops
 */
export function useUSDCContract() {
  const chain = useActiveWalletChain();
  
  // Memoize contract to prevent new reference on every render
  const contract = useMemo(() => {
    if (!chain) return null;
    
    try {
      const addresses = getContractAddresses(chain.id);
      return getContract({
        client,
        chain,
        address: addresses.usdc,
      });
    } catch {
      return null;
    }
  }, [chain?.id]); // Only recreate when chain ID changes
  
  return contract;
}

// ═══════════════════════════════════════════════════════════════════════════
// READ FUNCTIONS (Standalone - for use outside React components)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch game data
 */
export async function fetchGame(
  contract: ReturnType<typeof getContract>,
  gameId: bigint
): Promise<Game> {
  const result = await readContract({
    contract,
    method: "function getGame(uint256 gameId) view returns ((uint256 totalPool, uint256[4] agentPools, uint8 winnerAgentId, uint8 status, uint48 createdAt, uint48 resolvedAt))",
    params: [gameId],
  });
  
  return {
    totalPool: result.totalPool,
    agentPools: result.agentPools as [bigint, bigint, bigint, bigint],
    winnerAgentId: result.winnerAgentId,
    status: result.status as GameStatus,
    createdAt: Number(result.createdAt),
    resolvedAt: Number(result.resolvedAt),
  };
}

/**
 * Fetch user's bets for a game (multi-bet system)
 * Returns amounts bet on each agent and total bet
 */
export async function fetchUserBets(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  userAddress: string
): Promise<UserBets> {
  const result = await readContract({
    contract,
    method: "function getUserBets(uint256 gameId, address user) view returns ((uint256[4] agentBets, uint256 totalBet))",
    params: [gameId, userAddress],
  });
  
  return {
    agentBets: result.agentBets as [bigint, bigint, bigint, bigint],
    totalBet: result.totalBet,
  };
}

/**
 * Fetch user's bet on a specific agent
 */
export async function fetchUserBetOnAgent(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  userAddress: string,
  agentId: number
): Promise<bigint> {
  return await readContract({
    contract,
    method: "function getUserBetOnAgent(uint256 gameId, address user, uint8 agentId) view returns (uint256 amount)",
    params: [gameId, userAddress, agentId],
  });
}

/**
 * Fetch refundable amount for a cancelled game
 */
export async function fetchRefundableAmount(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  userAddress: string
): Promise<bigint> {
  return await readContract({
    contract,
    method: "function getRefundableAmount(uint256 gameId, address user) view returns (uint256 amount)",
    params: [gameId, userAddress],
  });
}

/**
 * Fetch odds for all agents in a game
 */
export async function fetchOdds(
  contract: ReturnType<typeof getContract>,
  gameId: bigint
): Promise<Odds> {
  const result = await readContract({
    contract,
    method: "function getOdds(uint256 gameId) view returns (uint256[4] odds)",
    params: [gameId],
  });
  
  return result as Odds;
}

/**
 * Fetch potential payout for a bet
 */
export async function fetchPotentialPayout(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  agentId: number,
  amount: bigint
): Promise<ClaimableAmount> {
  const result = await readContract({
    contract,
    method: "function getPotentialPayout(uint256 gameId, uint8 agentId, uint256 amount) view returns (uint256 gross, uint256 fee, uint256 net)",
    params: [gameId, agentId, amount],
  });
  
  return {
    gross: result[0],
    fee: result[1],
    net: result[2],
  };
}

/**
 * Fetch claimable amount for a user
 */
export async function fetchClaimableAmount(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  userAddress: string
): Promise<ClaimableAmount> {
  const result = await readContract({
    contract,
    method: "function getClaimableAmount(uint256 gameId, address user) view returns (uint256 gross, uint256 fee, uint256 net)",
    params: [gameId, userAddress],
  });
  
  return {
    gross: result[0],
    fee: result[1],
    net: result[2],
  };
}

/**
 * Check if user has claimed
 */
export async function fetchHasClaimed(
  contract: ReturnType<typeof getContract>,
  gameId: bigint,
  userAddress: string
): Promise<boolean> {
  return await readContract({
    contract,
    method: "function hasClaimed(uint256 gameId, address user) view returns (bool)",
    params: [gameId, userAddress],
  });
}

/**
 * Fetch total games count
 */
export async function fetchTotalGames(
  contract: ReturnType<typeof getContract>
): Promise<bigint> {
  return await readContract({
    contract,
    method: "function getTotalGames() view returns (uint256)",
    params: [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BETTING DATA HOOK - Combines all reads for a game
// ═══════════════════════════════════════════════════════════════════════════

export interface BettingData {
  game: Game | null;
  odds: Odds | null;
  userBets: UserBets | null;
  claimable: ClaimableAmount | null;
  hasClaimed: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch all betting data for a game
 */
export function useBettingData(gameId: bigint | null): BettingData {
  const contract = usePokerBettingContract();
  const account = useActiveAccount();
  
  const [game, setGame] = useState<Game | null>(null);
  const [odds, setOdds] = useState<Odds | null>(null);
  const [userBets, setUserBets] = useState<UserBets | null>(null);
  const [claimable, setClaimable] = useState<ClaimableAmount | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshRef = useRef(0);
  
  const fetchData = useCallback(async () => {
    if (!contract || gameId === null) {
      setGame(null);
      setOdds(null);
      setUserBets(null);
      setClaimable(null);
      setHasClaimed(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch game data and odds in parallel
      const [gameData, oddsData] = await Promise.all([
        fetchGame(contract, gameId),
        fetchOdds(contract, gameId),
      ]);
      
      setGame(gameData);
      setOdds(oddsData);
      
      // If user is connected, fetch their bets
      if (account?.address) {
        const [betsData, claimableData, claimed] = await Promise.all([
          fetchUserBets(contract, gameId, account.address),
          gameData.status === GameStatus.Resolved
            ? fetchClaimableAmount(contract, gameId, account.address)
            : Promise.resolve({ gross: 0n, fee: 0n, net: 0n }),
          fetchHasClaimed(contract, gameId, account.address),
        ]);
        
        setUserBets(betsData);
        setClaimable(claimableData);
        setHasClaimed(claimed);
      } else {
        setUserBets(null);
        setClaimable(null);
        setHasClaimed(false);
      }
    } catch (err) {
      // Check for rate limit errors
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errorMsg.includes('rate limit') || 
                          (typeof err === 'object' && err !== null && 
                           (err as Record<string, unknown>).code === -32016);
      
      if (isRateLimit) {
        console.warn('[useBettingData] Rate limited, will retry on next interval');
        // Don't set error state for rate limits - just warn and wait for next interval
      } else {
        console.error('[useBettingData] Error fetching data:', err);
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contract, gameId, account?.address]);
  
  // Initial fetch and refresh on dependencies change
  // Use a ref to track if we've done initial fetch to avoid double-fetching
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    // Only fetch if we have a contract and gameId
    if (contract && gameId !== null) {
      // Avoid fetching if we already have data and deps haven't changed
      if (!hasFetchedRef.current || refreshRef.current > 0) {
        hasFetchedRef.current = true;
        fetchData();
      }
    }
  }, [fetchData, contract, gameId]);
  
  // Auto-refresh every 30 seconds when game is open (increased from 10s to reduce rate limits)
  useEffect(() => {
    if (game?.status === GameStatus.Open && contract && gameId !== null) {
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // 30 seconds instead of 10
      return () => clearInterval(interval);
    }
  }, [game?.status, fetchData, contract, gameId]);
  
  const refresh = useCallback(() => {
    refreshRef.current += 1;
    fetchData();
  }, [fetchData]);
  
  return {
    game,
    odds,
    userBets,
    claimable,
    hasClaimed,
    isLoading,
    error,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to place a bet with transaction status tracking
 */
export function usePlaceBet() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const bettingContract = usePokerBettingContract();
  const usdcContract = useUSDCContract();
  const { mutateAsync: sendTx } = useSendTransaction();
  
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

  const placeBet = useCallback(
    async (gameId: bigint, agentId: number, amount: bigint): Promise<string | null> => {
      console.log(`[Bet] Placing bet - gameId: ${gameId}, agentId: ${agentId}, amount: ${amount}`);
      
      if (!account || !chain || !bettingContract || !usdcContract) {
        setTxState({ status: 'error', error: 'Wallet not connected' });
        return null;
      }

      try {
        // First check if betting is still open on-chain
        const gameData = await fetchGame(bettingContract, gameId);
        if (gameData.status !== GameStatus.Open) {
          const statusMsg = gameData.status === GameStatus.Closed 
            ? 'Betting is closed for this game.'
            : gameData.status === GameStatus.Resolved
              ? 'This game has already ended.'
              : gameData.status === GameStatus.Cancelled
                ? 'This game was cancelled.'
                : 'Betting is not available for this game.';
          setTxState({ status: 'error', error: statusMsg });
          return null;
        }
        
        const addresses = getContractAddresses(chain.id);
        
        // Check current allowance
        setTxState({ status: 'approving' });
        const currentAllowance = await allowance({
          contract: usdcContract,
          owner: account.address,
          spender: addresses.pokerBetting,
        });
        
        console.log(`[Bet] Current allowance: ${currentAllowance}, needed: ${amount}`);
        
        // Only approve if needed
        if (currentAllowance < amount) {
          // Approve 10x the bet amount (or at least 1000 USDC worth) to reduce future approval needs
          // But cap it to avoid Thirdweb's "insufficient funds" UI issue when approval > balance
          const minApproval = BigInt(1_000_000_000); // 1000 USDC minimum
          const tenXBet = amount * 10n;
          const approvalAmount = tenXBet > minApproval ? tenXBet : minApproval;
          
          const approveTx = approve({
            contract: usdcContract,
            spender: addresses.pokerBetting,
            amountWei: approvalAmount,
          });
          
          console.log(`[Bet] Approving ${Number(approvalAmount) / 1_000_000} USDC for PokerBetting contract...`);
          const approveReceipt = await sendTx(approveTx);
          await waitForReceipt({
            client,
            chain,
            transactionHash: approveReceipt.transactionHash,
          });
          console.log(`[Bet] Approval complete: ${approveReceipt.transactionHash}`);
        }

        // Place bet
        setTxState({ status: 'confirming' });
        const betTx = prepareContractCall({
          contract: bettingContract,
          method: "function placeBet(uint256 gameId, uint8 agentId, uint256 amount)",
          params: [gameId, agentId, amount],
        });

        const betReceipt = await sendTx(betTx);
        const receipt = await waitForReceipt({
          client,
          chain,
          transactionHash: betReceipt.transactionHash,
        });
        
        setTxState({ status: 'success', txHash: receipt.transactionHash });
        return receipt.transactionHash;
      } catch (err) {
        console.error('[Bet] Transaction failed:', err);
        let errorMsg = 'Transaction failed';
        
        // Try to extract error message from various error formats
        if (err instanceof Error) {
          errorMsg = err.message;
        } else if (typeof err === 'object' && err !== null) {
          // Handle Thirdweb/Viem error objects
          const errObj = err as Record<string, unknown>;
          if (errObj.message) {
            errorMsg = String(errObj.message);
          } else if (errObj.shortMessage) {
            errorMsg = String(errObj.shortMessage);
          } else if (errObj.reason) {
            errorMsg = String(errObj.reason);
          } else if (errObj.cause && typeof errObj.cause === 'object') {
            const cause = errObj.cause as Record<string, unknown>;
            if (cause.message) {
              errorMsg = String(cause.message);
            } else if (cause.shortMessage) {
              errorMsg = String(cause.shortMessage);
            }
          }
        }
        
        // Decode common contract errors for better UX
        if (errorMsg.includes('0xfb8f41b2') || errorMsg.includes('InsufficientAllowance')) {
          errorMsg = 'USDC approval needed. Please approve the transaction and try again.';
        } else if (errorMsg.includes('user rejected') || errorMsg.includes('User rejected')) {
          errorMsg = 'Transaction cancelled by user';
        } else if (errorMsg.includes('0x0') || errorMsg.includes('InvalidGameStatus') || errorMsg.includes('BETTING_OPEN')) {
          errorMsg = 'Betting is closed for this game. The betting window may have ended.';
        } else if (errorMsg.includes('GameNotFound')) {
          errorMsg = 'Game not found on-chain. Please refresh and try again.';
        } else if (errorMsg.includes('BetBelowMinimum')) {
          errorMsg = 'Bet amount is below the minimum ($0.10).';
        } else if (errorMsg.includes('InvalidAgentId')) {
          errorMsg = 'Invalid player selection. Please try again.';
        } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('exceeds balance')) {
          errorMsg = 'Insufficient USDC balance for this bet.';
        } else if (errorMsg === 'Transaction failed' || errorMsg === '{}' || errorMsg === '[object Object]') {
          // Generic fallback - likely a contract revert
          errorMsg = 'Transaction failed. Betting may be closed or the game state has changed. Please refresh and try again.';
        }
        
        setTxState({ status: 'error', error: errorMsg });
        return null;
      }
    },
    [account, chain, bettingContract, usdcContract, sendTx]
  );

  const reset = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return { placeBet, txState, reset, isConnected: !!account };
}

/**
 * Hook to claim winnings with transaction status tracking
 */
export function useClaimWinnings() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const contract = usePokerBettingContract();
  const { mutateAsync: sendTx } = useSendTransaction();
  
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

  const claimWinnings = useCallback(
    async (gameId: bigint): Promise<string | null> => {
      if (!account || !chain || !contract) {
        setTxState({ status: 'error', error: 'Wallet not connected' });
        return null;
      }

      try {
        setTxState({ status: 'confirming' });
        
        const tx = prepareContractCall({
          contract,
          method: "function claimWinnings(uint256 gameId)",
          params: [gameId],
        });

        const receipt = await sendTx(tx);
        const finalReceipt = await waitForReceipt({
          client,
          chain,
          transactionHash: receipt.transactionHash,
        });
        
        setTxState({ status: 'success', txHash: finalReceipt.transactionHash });
        return finalReceipt.transactionHash;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
        setTxState({ status: 'error', error: errorMsg });
        return null;
      }
    },
    [account, chain, contract, sendTx]
  );

  const reset = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return { claimWinnings, txState, reset, isConnected: !!account };
}

/**
 * Hook to claim refund with transaction status tracking
 */
export function useClaimRefund() {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const contract = usePokerBettingContract();
  const { mutateAsync: sendTx } = useSendTransaction();
  
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });

  const claimRefund = useCallback(
    async (gameId: bigint): Promise<string | null> => {
      if (!account || !chain || !contract) {
        setTxState({ status: 'error', error: 'Wallet not connected' });
        return null;
      }

      try {
        setTxState({ status: 'confirming' });
        
        const tx = prepareContractCall({
          contract,
          method: "function claimRefund(uint256 gameId)",
          params: [gameId],
        });

        const receipt = await sendTx(tx);
        const finalReceipt = await waitForReceipt({
          client,
          chain,
          transactionHash: receipt.transactionHash,
        });
        
        setTxState({ status: 'success', txHash: finalReceipt.transactionHash });
        return finalReceipt.transactionHash;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
        setTxState({ status: 'error', error: errorMsg });
        return null;
      }
    },
    [account, chain, contract, sendTx]
  );

  const reset = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return { claimRefund, txState, reset, isConnected: !!account };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to get formatted betting data for UI
 * Updated: Jan 14, 2026 - Added userBetOnWinner for ClaimWinnings component
 */
export function useFormattedBettingData(gameId: bigint | null) {
  const { game, odds, userBets, claimable, hasClaimed, isLoading, error, refresh } = useBettingData(gameId);
  
  // Calculate user's bet on the winning agent specifically
  const winnerAgentId = game?.winnerAgentId ?? null;
  const userAgentBetsFormatted = userBets?.agentBets.map(b => Number(b) / (10 ** USDC_DECIMALS)) || [0, 0, 0, 0];
  const userBetOnWinner = winnerAgentId !== null && winnerAgentId >= 0 && winnerAgentId < 4
    ? userAgentBetsFormatted[winnerAgentId]
    : 0;
  
  // Format data for UI consumption
  const formattedData = {
    // Pool info
    totalPool: game ? Number(game.totalPool) / (10 ** USDC_DECIMALS) : 0,
    agentPools: game?.agentPools.map(p => Number(p) / (10 ** USDC_DECIMALS)) || [0, 0, 0, 0],
    
    // Odds as multipliers (e.g., 2.5x)
    oddsMultipliers: odds?.map(o => o === 0n ? 0 : Number(o) / Number(BASIS_POINTS)) || [0, 0, 0, 0],
    
    // User bets
    userAgentBets: userAgentBetsFormatted,
    userTotalBet: userBets ? Number(userBets.totalBet) / (10 ** USDC_DECIMALS) : 0,
    userBetOnWinner, // Bet specifically on the winning agent
    
    // Claimable
    claimableGross: claimable ? Number(claimable.gross) / (10 ** USDC_DECIMALS) : 0,
    claimableFee: claimable ? Number(claimable.fee) / (10 ** USDC_DECIMALS) : 0,
    claimableNet: claimable ? Number(claimable.net) / (10 ** USDC_DECIMALS) : 0,
    
    // Status
    gameStatus: game?.status ?? null,
    winnerAgentId,
    hasClaimed,
    isLoading,
    error,
  };
  
  return { ...formattedData, refresh, raw: { game, odds, userBets, claimable } };
}
