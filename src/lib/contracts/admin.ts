/**
 * Backend Admin Functions for PokerBetting Contract
 * 
 * Created: January 12, 2026
 * Updated: January 22, 2026 - Migrated to Thirdweb Transactions API
 *                           - Uses api.thirdweb.com/v1/transactions (no Engine required!)
 *                           - Uses "x402 Wallet" server wallet for all operations
 *                           - Only requires THIRDWEB_SECRET_KEY
 * Updated: January 23, 2026 - Fixed polling bug (API returns UPPERCASE status: CONFIRMED, FAILED)
 *                           - Added logging for poll progress
 *                           - Reduced timeout to 60 polls @ 2s = 2 minutes
 * Updated: January 23, 2026 - Added placeBetOnChain for x402 bet placement
 *                           - After x402 payment settles USDC to platform wallet,
 *                           - this function places the bet on the smart contract
 * Updated: January 23, 2026 - BUGFIX: placeBetOnChain now uses placeBetFor when bettor provided
 *                           - Bets are now attributed to the actual user's wallet, not server wallet
 *                           - Requires contract upgrade to add placeBetFor function
 * Updated: January 26, 2026 - Added getOnChainGameStatus() and OnChainGameStatus enum
 *                           - Allows checking current on-chain status before state transitions
 *                           - Fixes bug where double closeBetting calls caused resolution to fail
 * Updated: January 26, 2026 - CRITICAL FIX: OnChainGameStatus enum was off by one!
 *                           - Contract has: BETTING_OPEN=0, BETTING_CLOSED=1, RESOLVED=2, CANCELLED=3
 *                           - Old code had: None=0, Open=1, Closed=2, Resolved=3, Cancelled=4
 *                           - This caused status checks to fail (thought open games were "None")
 * 
 * Server-side functions for contract owner operations:
 * - createGame: Create a new betting game on-chain (OWNER ONLY)
 * - seedAgentPools: Seed each agent with 25¢ USDC (public - anyone can call)
 * - closeBetting: Close betting for a game (OWNER ONLY)
 * - resolveGame: Resolve game with winner (OWNER ONLY)
 * - cancelGame: Cancel game (refunds enabled) (OWNER ONLY)
 * - placeBetOnChain: Place a bet for a user via x402 relay (OWNER ONLY - uses placeBetFor)
 * 
 * SECURITY: Uses Thirdweb Transactions API with Server Wallets - no private keys
 * Wallet: "x402 Wallet" (owner of V2 contract on Base Sepolia)
 */

import { 
  getContract, 
  readContract,
  encode,
  prepareContractCall,
} from "thirdweb";
import { createThirdwebClient, defineChain } from "thirdweb";
import { baseSepolia, base } from "thirdweb/chains";
import { SEPOLIA, MAINNET } from "./config";
import { parseUSDC, USDC_DECIMALS } from "./index";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Server wallet address - owner of PokerBettingV2 on Base Sepolia
// This is the "x402 Wallet" in Thirdweb dashboard
const SERVER_WALLET_ADDRESS = "0xd38Fecd44cEcBa7f8EE51Fd5f7B35981D8Ebd01D";

// Thirdweb API base URL for transactions
const THIRDWEB_API_BASE = "https://api.thirdweb.com/v1";

// Seed amount per agent: 25 cents = 250,000 raw units
const SEED_AMOUNT_PER_AGENT = parseUSDC(0.25); // 250,000n

// Custom chains with public RPCs to avoid Thirdweb rate limits
const baseSepoliaCustom = defineChain({
  ...baseSepolia,
  rpc: 'https://sepolia.base.org',
});

const baseCustom = defineChain({
  ...base,
  rpc: 'https://mainnet.base.org',
});

// Create a server-side thirdweb client
const serverClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY || "",
});

// ═══════════════════════════════════════════════════════════════════════════
// THIRDWEB TRANSACTIONS API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the secret key for API authentication
 */
function getSecretKey(): string {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (!secretKey) {
    throw new Error("THIRDWEB_SECRET_KEY not configured");
  }
  return secretKey;
}

/**
 * Get headers for Thirdweb API requests
 */
function getApiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-secret-key": getSecretKey(),
  };
}

interface TransactionsApiResponse {
  result?: {
    transactionIds: string[];
  };
  error?: {
    message: string;
    code?: string;
  };
}

interface TransactionStatusResponse {
  result?: {
    // Thirdweb API returns UPPERCASE status values
    status: 'QUEUED' | 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
    transactionHash?: string;
    errorMessage?: string;
    executionResult?: {
      transactionHash?: string;
      onchainStatus?: 'SUCCESS' | 'REVERTED';
    };
    receipt?: {
      transactionHash: string;
      status: string;
    };
  };
  error?: {
    message: string;
  };
}

/**
 * Send a transaction via Thirdweb Transactions API
 * Uses POST /v1/transactions endpoint
 */
async function sendTransaction(
  chainId: number,
  toAddress: string,
  encodedData: string,
  value: string = "0"
): Promise<string> {
  const url = `${THIRDWEB_API_BASE}/transactions`;
  
  console.log(`[Thirdweb] Sending transaction to ${toAddress} on chain ${chainId}...`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: getApiHeaders(),
    body: JSON.stringify({
      chainId,
      from: SERVER_WALLET_ADDRESS,
      transactions: [
        {
          to: toAddress,
          data: encodedData,
          value,
        }
      ],
    }),
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`[Thirdweb] API error:`, responseText);
    throw new Error(`Thirdweb API error: ${response.status} - ${responseText}`);
  }
  
  let result: TransactionsApiResponse;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid API response: ${responseText}`);
  }
  
  if (result.error) {
    throw new Error(`Thirdweb error: ${result.error.message}`);
  }
  
  if (!result.result?.transactionIds?.length) {
    throw new Error("No transaction ID returned from API");
  }
  
  const transactionId = result.result.transactionIds[0];
  console.log(`[Thirdweb] Transaction submitted: ${transactionId}`);
  
  // Poll for transaction hash
  const txHash = await waitForTransaction(transactionId);
  console.log(`[Thirdweb] Transaction confirmed: ${txHash}`);
  
  return txHash;
}

/**
 * Poll for transaction status until confirmed
 * Note: Thirdweb API returns UPPERCASE status values (CONFIRMED, FAILED, etc.)
 */
async function waitForTransaction(transactionId: string, maxAttempts = 60): Promise<string> {
  const url = `${THIRDWEB_API_BASE}/transactions/${transactionId}`;
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url, {
      method: "GET",
      headers: getApiHeaders(),
    });
    
    if (!response.ok) {
      // Transaction might not be indexed yet, keep polling
      if (response.status === 404 && i < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw new Error(`Failed to get transaction status: ${response.status}`);
    }
    
    const result: TransactionStatusResponse = await response.json();
    
    if (result.error) {
      throw new Error(`Transaction status error: ${result.error.message}`);
    }
    
    const status = result.result?.status;
    // Transaction hash can come from multiple places in the response
    const txHash = result.result?.transactionHash 
      || result.result?.executionResult?.transactionHash
      || result.result?.receipt?.transactionHash;
    
    console.log(`[Thirdweb] Poll ${i + 1}: status=${status}, txHash=${txHash ? txHash.slice(0, 10) + '...' : 'none'}`);
    
    // Thirdweb returns UPPERCASE status
    if (status === 'CONFIRMED' && txHash) {
      return txHash;
    }
    
    if (status === 'FAILED') {
      throw new Error(`Transaction failed: ${result.result?.errorMessage || 'Unknown error'}`);
    }
    
    if (status === 'CANCELLED') {
      throw new Error("Transaction was cancelled");
    }
    
    // Wait 2 seconds before next poll (transactions typically confirm in 2-4 seconds on Base)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Transaction timed out after ${maxAttempts * 2} seconds`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAIN & CONTRACT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current chain based on environment
 */
function getChain() {
  const isProduction = process.env.NEXT_PUBLIC_CHAIN_ENV === "production";
  return isProduction ? baseCustom : baseSepoliaCustom;
}

/**
 * Get the chain ID
 */
function getChainId(): number {
  const chain = getChain();
  return chain.id;
}

/**
 * Get the contract addresses for the current chain
 */
function getConfig() {
  const chain = getChain();
  const isProduction = chain.id === base.id;
  return isProduction ? MAINNET : SEPOLIA;
}

/**
 * Get the PokerBetting contract instance (for reads)
 */
function getPokerBettingContract() {
  const config = getConfig();
  return getContract({
    client: serverClient,
    chain: getChain(),
    address: config.contracts.pokerBetting,
  });
}

/**
 * Get the USDC contract instance (for reads)
 */
function getUSDCContract() {
  const config = getConfig();
  return getContract({
    client: serverClient,
    chain: getChain(),
    address: config.contracts.usdc,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// OWNER-ONLY OPERATIONS (via Thirdweb Transactions API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new game on-chain
 * @returns The new game ID and transaction hash
 */
export async function createOnChainGame(): Promise<{ gameId: bigint; txHash: string }> {
  const contract = getPokerBettingContract();
  const config = getConfig();
  const chainId = getChainId();
  
  // Get current totalGames BEFORE creating - new game ID will be this value
  const totalGamesBefore = await readContract({
    contract,
    method: "function getTotalGames() view returns (uint256)",
    params: [],
  });
  const expectedGameId = totalGamesBefore;
  
  console.log(`[Contract] Creating on-chain game ${expectedGameId}...`);
  
  // Encode the function call
  const tx = prepareContractCall({
    contract,
    method: "function createGame() returns (uint256 gameId)",
    params: [],
  });
  
  const encodedData = await encode(tx);
  
  // Send via Thirdweb API
  const txHash = await sendTransaction(
    chainId,
    config.contracts.pokerBetting,
    encodedData
  );
  
  console.log(`[Contract] Created on-chain game ${expectedGameId}. Tx: ${txHash}`);
  
  return {
    gameId: expectedGameId,
    txHash,
  };
}

/**
 * Seed agent pools with initial bets (25¢ per agent = $1 total per game)
 * This ensures all agents start at 25% chance instead of 0%
 * 
 * @param gameId The on-chain game ID to seed
 * @returns Transaction hashes for the seeding bets
 */
export async function seedAgentPools(gameId: bigint): Promise<{ txHashes: string[]; totalSeeded: string }> {
  const pokerContract = getPokerBettingContract();
  const usdcContract = getUSDCContract();
  const config = getConfig();
  const chainId = getChainId();
  
  const txHashes: string[] = [];
  const totalNeeded = SEED_AMOUNT_PER_AGENT * 4n; // $1 total
  
  // Check USDC allowance for the PokerBetting contract
  const currentAllowance = await readContract({
    contract: usdcContract,
    method: "function allowance(address owner, address spender) view returns (uint256)",
    params: [SERVER_WALLET_ADDRESS, config.contracts.pokerBetting],
  });
  
  // If allowance is insufficient, approve a large amount (one-time)
  if (currentAllowance < totalNeeded) {
    console.log(`[Seed] Approving USDC for PokerBetting contract...`);
    
    // Approve 1000 USDC to cover many games
    const approveAmount = parseUSDC(1000);
    
    const approveTx = prepareContractCall({
      contract: usdcContract,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [config.contracts.pokerBetting, approveAmount],
    });
    
    const encodedApprove = await encode(approveTx);
    const approveTxHash = await sendTransaction(
      chainId,
      config.contracts.usdc,
      encodedApprove
    );
    
    txHashes.push(approveTxHash);
    console.log(`[Seed] USDC approved. Tx: ${approveTxHash}`);
  }
  
  // Place seed bets on all 4 agents
  for (let agentId = 0; agentId < 4; agentId++) {
    console.log(`[Seed] Placing seed bet on agent ${agentId} (${['Chamath', 'Sacks', 'Jason', 'Friedberg'][agentId]})...`);
    
    const betTx = prepareContractCall({
      contract: pokerContract,
      method: "function placeBet(uint256 gameId, uint8 agentId, uint256 amount)",
      params: [gameId, agentId, SEED_AMOUNT_PER_AGENT],
    });
    
    const encodedBet = await encode(betTx);
    const betTxHash = await sendTransaction(
      chainId,
      config.contracts.pokerBetting,
      encodedBet
    );
    
    txHashes.push(betTxHash);
    console.log(`[Seed] Agent ${agentId} seeded. Tx: ${betTxHash}`);
  }
  
  const totalSeededFormatted = `$${(Number(totalNeeded) / 10 ** USDC_DECIMALS).toFixed(2)}`;
  console.log(`[Seed] All agents seeded for game ${gameId}. Total: ${totalSeededFormatted}`);
  
  return {
    txHashes,
    totalSeeded: totalSeededFormatted,
  };
}

/**
 * Create a new game AND seed all agent pools
 * This is the main function to call when starting a new game
 * @returns The new game ID and all transaction hashes
 */
export async function createAndSeedGame(): Promise<{ 
  gameId: bigint; 
  txHashes: string[];
  totalSeeded: string;
}> {
  // Step 1: Create the game on-chain
  const { gameId, txHash: createTxHash } = await createOnChainGame();
  
  // Step 2: Seed all agent pools
  const { txHashes: seedTxHashes, totalSeeded } = await seedAgentPools(gameId);
  
  return {
    gameId,
    txHashes: [createTxHash, ...seedTxHashes],
    totalSeeded,
  };
}

/**
 * Close betting for a game on-chain
 * @param gameId The on-chain game ID
 * @returns Transaction hash
 */
export async function closeOnChainBetting(gameId: bigint): Promise<string> {
  const contract = getPokerBettingContract();
  const config = getConfig();
  const chainId = getChainId();
  
  console.log(`[Contract] Closing betting for game ${gameId}...`);
  
  const tx = prepareContractCall({
    contract,
    method: "function closeBetting(uint256 gameId)",
    params: [gameId],
  });
  
  const encodedData = await encode(tx);
  const txHash = await sendTransaction(
    chainId,
    config.contracts.pokerBetting,
    encodedData
  );
  
  console.log(`[Contract] Closed betting for game ${gameId}. Tx: ${txHash}`);
  
  return txHash;
}

/**
 * Resolve a game with the winning agent
 * @param gameId The on-chain game ID
 * @param winnerAgentId The winning agent ID (0-3: Chamath, Sacks, Jason, Friedberg)
 * @returns Transaction hash
 */
export async function resolveOnChainGame(gameId: bigint, winnerAgentId: number): Promise<string> {
  if (winnerAgentId < 0 || winnerAgentId > 3) {
    throw new Error(`Invalid winnerAgentId: ${winnerAgentId}. Must be 0-3.`);
  }
  
  const contract = getPokerBettingContract();
  const config = getConfig();
  const chainId = getChainId();
  
  console.log(`[Contract] Resolving game ${gameId} with winner ${winnerAgentId}...`);
  
  const tx = prepareContractCall({
    contract,
    method: "function resolveGame(uint256 gameId, uint8 winnerAgentId)",
    params: [gameId, winnerAgentId],
  });
  
  const encodedData = await encode(tx);
  const txHash = await sendTransaction(
    chainId,
    config.contracts.pokerBetting,
    encodedData
  );
  
  console.log(`[Contract] Resolved game ${gameId} with winner ${winnerAgentId}. Tx: ${txHash}`);
  
  return txHash;
}

/**
 * Cancel a game on-chain (enables refunds)
 * @param gameId The on-chain game ID
 * @returns Transaction hash
 */
export async function cancelOnChainGame(gameId: bigint): Promise<string> {
  const contract = getPokerBettingContract();
  const config = getConfig();
  const chainId = getChainId();
  
  console.log(`[Contract] Cancelling game ${gameId}...`);
  
  const tx = prepareContractCall({
    contract,
    method: "function cancelGame(uint256 gameId)",
    params: [gameId],
  });
  
  const encodedData = await encode(tx);
  const txHash = await sendTransaction(
    chainId,
    config.contracts.pokerBetting,
    encodedData
  );
  
  console.log(`[Contract] Cancelled game ${gameId}. Tx: ${txHash}`);
  
  return txHash;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * On-chain game status enum (matches contract IPokerBettingV2.GameStatus)
 * CRITICAL: Must match contract exactly!
 * Contract enum: BETTING_OPEN=0, BETTING_CLOSED=1, RESOLVED=2, CANCELLED=3
 */
export enum OnChainGameStatus {
  BettingOpen = 0,   // Accepting bets (contract: BETTING_OPEN)
  BettingClosed = 1, // Bets locked, game in progress (contract: BETTING_CLOSED)
  Resolved = 2,      // Winner determined, claims open (contract: RESOLVED)
  Cancelled = 3,     // Game cancelled, refunds available (contract: CANCELLED)
}

/**
 * Get the on-chain status of a game
 * Use this to check current state before making state transitions
 */
export async function getOnChainGameStatus(gameId: bigint): Promise<OnChainGameStatus> {
  const contract = getPokerBettingContract();
  
  const result = await readContract({
    contract,
    method: "function getGame(uint256 gameId) view returns ((uint256 totalPool, uint256[4] agentPools, uint8 winnerAgentId, uint8 status, uint48 createdAt, uint48 resolvedAt))",
    params: [gameId],
  });
  
  return result.status as OnChainGameStatus;
}

/**
 * Map Supabase agent ID to on-chain agent index
 * On-chain: 0=Chamath, 1=Sacks, 2=Jason, 3=Friedberg
 */
export function agentIdToContractIndex(agentName: string): number {
  const mapping: Record<string, number> = {
    'Chamath': 0,
    'chamath': 0,
    'Sacks': 1,
    'sacks': 1,
    'Jason': 2,
    'jason': 2,
    'Friedberg': 3,
    'friedberg': 3,
  };
  
  const index = mapping[agentName];
  if (index === undefined) {
    throw new Error(`Unknown agent name: ${agentName}`);
  }
  return index;
}

/**
 * Get the current chain configuration
 */
export function getCurrentConfig() {
  return {
    chain: getChain(),
    config: getConfig(),
    isTestnet: process.env.NEXT_PUBLIC_CHAIN_ENV !== "production",
  };
}

/**
 * Check if server wallet is configured (THIRDWEB_SECRET_KEY exists)
 */
export function isServerWalletConfigured(): boolean {
  return !!process.env.THIRDWEB_SECRET_KEY;
}

/**
 * Get the server wallet address (for display/verification)
 */
export function getServerWalletAddress(): string {
  return SERVER_WALLET_ADDRESS;
}

// ═══════════════════════════════════════════════════════════════════════════
// X402 BET PLACEMENT (Place bet on-chain on behalf of x402 payer)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Place a bet on-chain using the server wallet, attributed to the bettor
 * This is called after an x402 payment is settled.
 * 
 * The flow is:
 * 1. x402 payment transfers USDC from bettor to platform wallet
 * 2. Platform wallet approves USDC to betting contract
 * 3. Platform wallet calls placeBetFor (bet attributed to bettor, not relayer)
 * 
 * @param onChainGameId The on-chain game ID (not Supabase ID)
 * @param agentId The agent index (0-3: Chamath, Sacks, Jason, Friedberg)
 * @param amount The bet amount in USDC (human readable, e.g., 1.00)
 * @param bettor The wallet address to attribute the bet to (from x402 payment)
 * @returns Transaction hash of the placeBetFor call
 */
export async function placeBetOnChain(
  onChainGameId: bigint,
  agentId: number,
  amount: number,
  bettor?: string
): Promise<{ txHash: string }> {
  const config = getConfig();
  const chainId = getChainId();
  const pokerContract = getPokerBettingContract();
  const usdcContract = getUSDCContract();
  
  // Convert amount to raw USDC units
  const amountRaw = parseUSDC(amount);
  
  console.log(`[x402 Bet] Placing bet on-chain: game=${onChainGameId}, agent=${agentId}, amount=${amount} USDC, bettor=${bettor || 'server'}`);
  
  // Step 1: Check current allowance
  const currentAllowance = await readContract({
    contract: usdcContract,
    method: "function allowance(address owner, address spender) view returns (uint256)",
    params: [SERVER_WALLET_ADDRESS, config.contracts.pokerBetting],
  }) as bigint;
  
  console.log(`[x402 Bet] Current USDC allowance: ${currentAllowance}`);
  
  // Step 2: Approve USDC if needed
  if (currentAllowance < amountRaw) {
    console.log(`[x402 Bet] Approving USDC...`);
    
    const approveTx = prepareContractCall({
      contract: usdcContract,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [config.contracts.pokerBetting, amountRaw * 10n], // Approve 10x for future bets
    });
    
    const encodedApprove = await encode(approveTx);
    const approveTxHash = await sendTransaction(
      chainId,
      config.contracts.usdc,
      encodedApprove
    );
    
    console.log(`[x402 Bet] USDC approved. Tx: ${approveTxHash}`);
  }
  
  // Step 3: Place the bet
  // If bettor is provided, use placeBetFor to attribute bet to them
  // Otherwise, use placeBet (bet attributed to server wallet)
  let betTxHash: string;
  
  if (bettor) {
    console.log(`[x402 Bet] Calling placeBetFor (attributing to ${bettor})...`);
    
    const betTx = prepareContractCall({
      contract: pokerContract,
      method: "function placeBetFor(uint256 gameId, uint8 agentId, uint256 amount, address bettor)",
      params: [onChainGameId, agentId, amountRaw, bettor],
    });
    
    const encodedBet = await encode(betTx);
    betTxHash = await sendTransaction(
      chainId,
      config.contracts.pokerBetting,
      encodedBet
    );
  } else {
    console.log(`[x402 Bet] Calling placeBet (server wallet)...`);
    
    const betTx = prepareContractCall({
      contract: pokerContract,
      method: "function placeBet(uint256 gameId, uint8 agentId, uint256 amount)",
      params: [onChainGameId, agentId, amountRaw],
    });
    
    const encodedBet = await encode(betTx);
    betTxHash = await sendTransaction(
      chainId,
      config.contracts.pokerBetting,
      encodedBet
    );
  }
  
  console.log(`[x402 Bet] Bet placed on-chain. Tx: ${betTxHash}`);
  
  return { txHash: betTxHash };
}
