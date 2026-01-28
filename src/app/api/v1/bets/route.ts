/**
 * API v1 - List My Bets (On-Chain Source of Truth)
 * 
 * GET /api/v1/bets?wallet=0x...
 * 
 * Returns all bets placed by a wallet address, queried directly from the
 * smart contract on-chain. This is the single source of truth for bets.
 * 
 * Created: January 23, 2026
 * Updated: January 26, 2026 - MAJOR: Switched to on-chain as single source of truth
 *                           - Removed dependency on spectator_bets table
 *                           - Now queries getUserBets() directly from contract
 *                           - DB only used for game metadata (game_number mapping)
 * 
 * This endpoint allows AI agents and users to track their betting positions
 * and understand outcomes without needing database access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAddress, createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface BetInfo {
  onChainGameId: number;
  gameNumber: number;
  gameStatus: "betting_open" | "betting_closed" | "resolved" | "cancelled";
  agentId: number;
  agentName: string;
  amount: number;
  // Result (only for resolved games)
  gameWinner: string | null;
  result: "pending" | "won" | "lost";
  // Payout info
  potentialPayout: number | null;
  poolShare: number;
}

interface BetsSummary {
  totalBets: number;
  totalWagered: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
}

// On-chain game structure from contract
interface OnChainGame {
  totalPool: bigint;
  agentPools: readonly [bigint, bigint, bigint, bigint];
  winnerAgentId: number;
  status: number;
  createdAt: number;
  resolvedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Agent mapping (matches contract: 0=Chamath, 1=Sacks, 2=Jason, 3=Friedberg)
const AGENT_NAMES = ["Chamath", "Sacks", "Jason", "Friedberg"];

// Contract status enum
const STATUS_MAP: Record<number, BetInfo["gameStatus"]> = {
  0: "betting_open", // None maps to betting_open (game exists but not started)
  1: "betting_open", // BettingOpen
  2: "betting_closed", // BettingClosed
  3: "resolved", // Resolved
  4: "cancelled", // Cancelled
};

const CONTRACT_ADDRESS = "0x313A6ABd0555A2A0E358de535833b406543Cc14c";
const USDC_DECIMALS = 6;

// ═══════════════════════════════════════════════════════════════════════════
// ON-CHAIN CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const contractAbi = parseAbi([
  "function getGame(uint256 gameId) view returns ((uint256 totalPool, uint256[4] agentPools, uint8 winnerAgentId, uint8 status, uint48 createdAt, uint48 resolvedAt))",
  "function getUserBets(uint256 gameId, address user) view returns ((uint256[4] agentBets, uint256 totalBet))",
  "function getTotalGames() view returns (uint256)",
  "function getClaimableAmount(uint256 gameId, address user) view returns (uint256 gross, uint256 fee, uint256 net)",
]);

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT (for game metadata only)
// ═══════════════════════════════════════════════════════════════════════════

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(url, key);
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const gameIdFilter = searchParams.get("gameId"); // Optional: filter to specific game

    if (!wallet) {
      return NextResponse.json(
        { error: "wallet query parameter is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate and normalize address
    let normalizedWallet: string;
    try {
      normalizedWallet = getAddress(wallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Get total games from contract
    const totalGames = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: "getTotalGames",
    });

    console.log(`[Bets API] Querying ${totalGames} games for wallet ${normalizedWallet}`);

    // Get game number mapping from DB
    const supabase = getSupabaseClient();
    const { data: dbGames } = await supabase
      .from("games")
      .select("game_number, on_chain_game_id")
      .not("on_chain_game_id", "is", null);

    const gameNumberMap = new Map<number, number>();
    dbGames?.forEach((g) => {
      if (g.on_chain_game_id !== null) {
        gameNumberMap.set(g.on_chain_game_id, g.game_number);
      }
    });

    // Query user bets for all games (or specific game if filtered)
    const betInfos: BetInfo[] = [];
    
    const startGame = gameIdFilter ? parseInt(gameIdFilter) : 0;
    const endGame = gameIdFilter ? parseInt(gameIdFilter) + 1 : Number(totalGames);

    for (let gameId = startGame; gameId < endGame; gameId++) {
      try {
        // Get user's bets for this game
        const userBets = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractAbi,
          functionName: "getUserBets",
          args: [BigInt(gameId), normalizedWallet as `0x${string}`],
        });

        // Skip if no bets on this game
        if (userBets.totalBet === 0n) continue;

        // Get game data
        const game = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: contractAbi,
          functionName: "getGame",
          args: [BigInt(gameId)],
        }) as OnChainGame;

        const gameStatus = STATUS_MAP[game.status] || "betting_open";
        const isResolved = game.status === 3;
        const winnerAgentId = game.winnerAgentId;

        // Get claimable amount if resolved
        let claimableAmount = 0n;
        if (isResolved) {
          try {
            const claimable = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: contractAbi,
              functionName: "getClaimableAmount",
              args: [BigInt(gameId), normalizedWallet as `0x${string}`],
            });
            claimableAmount = claimable[2]; // net amount
          } catch {
            // User may not have won
          }
        }

        // Create bet info for each agent the user bet on
        for (let agentId = 0; agentId < 4; agentId++) {
          const betAmount = userBets.agentBets[agentId];
          if (betAmount === 0n) continue;

          const amount = Number(betAmount) / 10 ** USDC_DECIMALS;
          const agentPool = Number(game.agentPools[agentId]) / 10 ** USDC_DECIMALS;
          const totalPool = Number(game.totalPool) / 10 ** USDC_DECIMALS;
          
          // Calculate pool share percentage
          const poolShare = totalPool > 0 ? Math.round((agentPool / totalPool) * 100) : 25;
          
          // Determine result
          let result: BetInfo["result"] = "pending";
          let potentialPayout: number | null = null;
          
          if (isResolved) {
            const didWin = winnerAgentId === agentId;
            result = didWin ? "won" : "lost";
            
            if (didWin && claimableAmount > 0n) {
              potentialPayout = Number(claimableAmount) / 10 ** USDC_DECIMALS;
            }
          } else if (agentPool > 0) {
            // Calculate potential payout for pending bets
            const myShare = amount / agentPool;
            potentialPayout = Math.round(myShare * totalPool * 100) / 100;
          }

          betInfos.push({
            onChainGameId: gameId,
            gameNumber: gameNumberMap.get(gameId) || gameId + 1, // Fallback to gameId+1 if not in DB
            gameStatus,
            agentId,
            agentName: AGENT_NAMES[agentId],
            amount,
            gameWinner: isResolved ? AGENT_NAMES[winnerAgentId] : null,
            result,
            potentialPayout,
            poolShare,
          });
        }
      } catch (err) {
        // Skip games that fail to query (might not exist)
        console.warn(`[Bets API] Failed to query game ${gameId}:`, err);
      }
    }

    // Sort by game number descending (most recent first)
    betInfos.sort((a, b) => b.gameNumber - a.gameNumber);

    // Calculate summary
    const summary: BetsSummary = {
      totalBets: betInfos.length,
      totalWagered: betInfos.reduce((sum, b) => sum + b.amount, 0),
      pendingBets: betInfos.filter((b) => b.result === "pending").length,
      wonBets: betInfos.filter((b) => b.result === "won").length,
      lostBets: betInfos.filter((b) => b.result === "lost").length,
    };

    console.log(`[Bets API] Found ${betInfos.length} bets for ${normalizedWallet}`);

    return NextResponse.json(
      {
        wallet: normalizedWallet,
        source: "on-chain", // Indicate data comes from blockchain
        bets: betInfos,
        summary,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[Bets API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
