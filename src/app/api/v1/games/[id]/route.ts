/**
 * API v1 - Game Details
 * 
 * GET /api/v1/games/:id
 * 
 * Returns detailed game information matching what humans see in the UI.
 * FREE endpoint - no x402 payment required.
 * 
 * Created: January 20, 2026
 * Updated: January 20, 2026 - Aligned with UI (pool + poolSharePercent)
 *                           - Added live hand state for active games
 *                           - poolSharePercent = % of bets on this agent (NOT win probability!)
 *                           - Added rate limiting
 * Updated: January 23, 2026 - Fixed chip counts for resolved/active games
 *                           - Now pulls from hand_agents (per-game) instead of agents (global)
 *                           - Added hole cards to liveHand.players (parity with human UI)
 * Updated: January 26, 2026 - CRITICAL: Betting pool data now from on-chain (source of truth)
 *                           - Removed spectator_bets DB reads - contract is source of truth
 *                           - Uses viem to read getGame() from PokerBettingV2 contract
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { baseSepolia, base } from "viem/chains";
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { SEPOLIA, MAINNET } from "@/lib/contracts/config";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AgentBettingInfo {
  agentId: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  chipCount: number;
  isEliminated: boolean;
  // Betting pool info (matches UI exactly)
  pool: number;           // Dollar amount bet on this agent
  poolSharePercent: number;  // % of total pool on this agent (NOT win probability!)
}

interface RecentAction {
  agentName: string;
  action: string;      // "fold", "call", "raise", "check", "all_in", "blind"
  amount: number | null;
  round: string;
  timestamp: string;
}

interface HandPlayer {
  agentId: string;
  name: string;
  holeCards: string[];   // e.g., ["Ah", "Kd"] - same as humans see
  chipCount: number;
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  seatPosition: number;
}

interface LiveHandState {
  handNumber: number;
  round: "preflop" | "flop" | "turn" | "river";
  communityCards: string[];  // Cards revealed so far (e.g., ["Ah", "Kd", "Qs"])
  potSize: number;
  activeAgentId: string | null;
  activeAgentName: string | null;
  players: HandPlayer[];     // All players with their hole cards
  recentActions: RecentAction[];
}

interface GameDetails {
  id: string;
  gameNumber: number;
  status: "waiting" | "betting_open" | "betting_closed" | "resolved";
  currentHand: number;
  maxHands: number;
  bettingClosesAfterHand: number;
  scheduledStartAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  winnerAgentId: string | null;
  winnerAgentName: string | null;
  onChainGameId: number | null;
  // Betting (matches UI exactly)
  totalPool: number;
  isBettingOpen: boolean;
  agents: AgentBettingInfo[];
  // Live hand state (when game is active)
  liveHand: LiveHandState | null;
  // Verification
  deckCommitment: string | null;
  isVerifiable: boolean;
  verificationUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
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
// ON-CHAIN CLIENT (Source of truth for betting data)
// ═══════════════════════════════════════════════════════════════════════════

const POKER_BETTING_ABI = parseAbi([
  "function getGame(uint256 gameId) view returns ((uint256 totalPool, uint256[4] agentPools, uint8 winnerAgentId, uint8 status, uint48 createdAt, uint48 resolvedAt))"
]);

// Agent index mapping: 0=Chamath, 1=Sacks, 2=Jason, 3=Friedberg
const AGENT_INDEX_TO_SLUG: Record<number, string> = {
  0: "chamath",
  1: "sacks", 
  2: "jason",
  3: "friedberg"
};

function getOnChainClient() {
  const isProduction = process.env.NEXT_PUBLIC_CHAIN_ENV === "production";
  const chain = isProduction ? base : baseSepolia;
  const rpcUrl = isProduction ? "https://mainnet.base.org" : "https://sepolia.base.org";
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
}

function getContractAddress(): `0x${string}` {
  const isProduction = process.env.NEXT_PUBLIC_CHAIN_ENV === "production";
  return isProduction ? MAINNET.contracts.pokerBetting : SEPOLIA.contracts.pokerBetting;
}

interface OnChainGame {
  totalPool: bigint;
  agentPools: readonly [bigint, bigint, bigint, bigint];
  winnerAgentId: number;
  status: number;
  createdAt: number;
  resolvedAt: number;
}

/**
 * Fetch betting pool data from on-chain contract (source of truth)
 */
async function getOnChainBettingPools(onChainGameId: number): Promise<{
  totalPool: number;
  agentPools: Map<string, number>;
} | null> {
  try {
    const client = getOnChainClient();
    const contractAddress = getContractAddress();
    
    const game = await client.readContract({
      address: contractAddress,
      abi: POKER_BETTING_ABI,
      functionName: "getGame",
      args: [BigInt(onChainGameId)]
    }) as OnChainGame;
    
    // Convert from raw USDC (6 decimals) to human readable
    const totalPool = Number(formatUnits(game.totalPool, 6));
    const agentPools = new Map<string, number>();
    
    // Map agent pools by slug
    for (let i = 0; i < 4; i++) {
      const slug = AGENT_INDEX_TO_SLUG[i];
      const pool = Number(formatUnits(game.agentPools[i], 6));
      agentPools.set(slug, pool);
    }
    
    return { totalPool, agentPools };
  } catch (err) {
    console.error("[API v1] Failed to read on-chain betting pools:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORS HEADERS
// ═══════════════════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PAYMENT",
};

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`game-details:${clientId}`, RATE_LIMITS.FREE);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rateLimit) } }
    );
  }

  try {
    const { id: gameId } = await params;
    const supabase = getSupabaseClient();

    // Fetch game
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(`
        id,
        game_number,
        status,
        current_hand_number,
        max_hands,
        betting_closes_after_hand,
        scheduled_start_at,
        started_at,
        resolved_at,
        winner_agent_id,
        on_chain_game_id,
        deck_commitment
      `)
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Fetch all agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, slug, avatar_url, chip_count")
      .order("seat_position");

    if (agentsError || !agents) {
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Create agent lookup map
    const agentMap = new Map(agents.map((a: { id: string; name: string }) => [a.id, a.name]));

    // For resolved/active games, get chip counts from the final hand's hand_agents
    // This shows the actual game state, not the global agent chips
    let gameChipCounts: Map<string, number> | null = null;
    
    if (game.status === "resolved" || game.status === "betting_open" || game.status === "betting_closed") {
      const { data: finalHand } = await supabase
        .from("hands")
        .select("id")
        .eq("game_id", gameId)
        .order("hand_number", { ascending: false })
        .limit(1)
        .single();

      if (finalHand) {
        const { data: handAgents } = await supabase
          .from("hand_agents")
          .select("agent_id, chip_count")
          .eq("hand_id", finalHand.id);

        if (handAgents) {
          gameChipCounts = new Map(
            handAgents.map((ha: { agent_id: string; chip_count: number }) => [ha.agent_id, ha.chip_count])
          );
        }
      }
    }

    // Fetch betting pools from ON-CHAIN (source of truth)
    // The smart contract is the canonical source for all betting data
    let totalPool = 0;
    const agentPoolsBySlug = new Map<string, number>();
    
    if (game.on_chain_game_id !== null) {
      const onChainPools = await getOnChainBettingPools(game.on_chain_game_id);
      if (onChainPools) {
        totalPool = onChainPools.totalPool;
        // Copy pools by slug
        onChainPools.agentPools.forEach((pool, slug) => {
          agentPoolsBySlug.set(slug, pool);
        });
      }
    }

    // Build agent info (matching UI exactly: pool + % of pool)
    // Pool data comes from on-chain contract, keyed by agent slug
    const numAgents = agents.length;
    const agentInfo: AgentBettingInfo[] = agents.map((agent: {
      id: string;
      name: string;
      slug: string;
      avatar_url: string | null;
      chip_count: number;
    }) => {
      // Get pool by agent slug (from on-chain data)
      const pool = agentPoolsBySlug.get(agent.slug) || 0;
      // Use game-specific chip count if available (from hand_agents), else fall back to global
      const chipCount = gameChipCounts?.get(agent.id) ?? agent.chip_count ?? 1000;
      const isEliminated = chipCount <= 0;

      // Calculate % of betting pool (NOT win probability - just share of bets)
      const poolSharePercent = totalPool > 0 
        ? Math.round((pool / totalPool) * 100) 
        : Math.round(100 / numAgents);

      return {
        agentId: agent.id,
        name: agent.name,
        slug: agent.slug,
        avatarUrl: agent.avatar_url,
        chipCount,
        isEliminated,
        pool,
        poolSharePercent,
      };
    });

    // Determine if betting is open
    const status = game.status as GameDetails["status"];
    const isBettingOpen = status === "waiting" || status === "betting_open";

    // Fetch live hand state if game is active
    let liveHand: LiveHandState | null = null;
    
    if (status === "betting_open" || status === "betting_closed") {
      // Get the current hand
      const { data: hand } = await supabase
        .from("hands")
        .select(`
          id,
          hand_number,
          current_round,
          community_cards,
          pot_amount,
          active_agent_id
        `)
        .eq("game_id", gameId)
        .order("hand_number", { ascending: false })
        .limit(1)
        .single();

      if (hand) {
        // Get all players in this hand with their hole cards
        const { data: handAgents } = await supabase
          .from("hand_agents")
          .select("agent_id, hole_cards, chip_count, current_bet, is_folded, is_all_in, seat_position")
          .eq("hand_id", hand.id)
          .order("seat_position");

        // Build players array with hole cards (same data humans see)
        const players: HandPlayer[] = (handAgents || []).map((ha: {
          agent_id: string;
          hole_cards: string[] | null;
          chip_count: number;
          current_bet: number;
          is_folded: boolean;
          is_all_in: boolean;
          seat_position: number;
        }) => ({
          agentId: ha.agent_id,
          name: agentMap.get(ha.agent_id) || "Unknown",
          holeCards: (ha.hole_cards || []) as string[],
          chipCount: ha.chip_count,
          currentBet: ha.current_bet || 0,
          isFolded: ha.is_folded || false,
          isAllIn: ha.is_all_in || false,
          seatPosition: ha.seat_position,
        }));

        // Get recent actions for this hand
        const { data: actions } = await supabase
          .from("agent_actions")
          .select("agent_id, action_type, amount, round, created_at")
          .eq("hand_id", hand.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // Determine which community cards to show based on round
        const allCommunityCards = (hand.community_cards || []) as string[];
        const round = (hand.current_round || "preflop") as LiveHandState["round"];
        
        let visibleCards: string[] = [];
        switch (round) {
          case "flop":
            visibleCards = allCommunityCards.slice(0, 3);
            break;
          case "turn":
            visibleCards = allCommunityCards.slice(0, 4);
            break;
          case "river":
            visibleCards = allCommunityCards.slice(0, 5);
            break;
          default:
            visibleCards = [];
        }

        const recentActions: RecentAction[] = (actions || []).map((a: {
          agent_id: string;
          action_type: string;
          amount: number | null;
          round: string;
          created_at: string;
        }) => ({
          agentName: agentMap.get(a.agent_id) || "Unknown",
          action: a.action_type,
          amount: a.amount,
          round: a.round,
          timestamp: a.created_at,
        }));

        liveHand = {
          handNumber: hand.hand_number,
          round,
          communityCards: visibleCards,
          potSize: Number(hand.pot_amount) || 0,
          activeAgentId: hand.active_agent_id,
          activeAgentName: hand.active_agent_id ? agentMap.get(hand.active_agent_id) || null : null,
          players,
          recentActions,
        };
      }
    }

    // Get winner name if resolved
    let winnerAgentName: string | null = null;
    if (game.winner_agent_id) {
      winnerAgentName = agentMap.get(game.winner_agent_id) || null;
    }

    // Build response
    const response: GameDetails = {
      id: game.id,
      gameNumber: game.game_number,
      status,
      currentHand: game.current_hand_number,
      maxHands: game.max_hands,
      bettingClosesAfterHand: game.betting_closes_after_hand,
      scheduledStartAt: game.scheduled_start_at,
      startedAt: game.started_at,
      resolvedAt: game.resolved_at,
      winnerAgentId: game.winner_agent_id,
      winnerAgentName,
      onChainGameId: game.on_chain_game_id,
      totalPool,
      isBettingOpen,
      agents: agentInfo,
      liveHand,
      deckCommitment: game.deck_commitment,
      isVerifiable: !!game.deck_commitment,
      verificationUrl: game.deck_commitment && status === "resolved"
        ? `/api/games/${gameId}/verify`
        : null,
    };

    return NextResponse.json(response, { 
      headers: { ...CORS_HEADERS, ...rateLimitHeaders(rateLimit) } 
    });
  } catch (error) {
    console.error("[API v1] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
