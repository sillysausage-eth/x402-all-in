/**
 * API v1 - Games List
 * 
 * GET /api/v1/games
 * 
 * Returns list of active, upcoming, and recent games.
 * FREE endpoint - no x402 payment required.
 * 
 * Created: January 20, 2026
 * Updated: January 20, 2026 - Added rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface GameListItem {
  id: string;
  gameNumber: number;
  status: "waiting" | "betting_open" | "betting_closed" | "resolved";
  currentHand: number;
  maxHands: number;
  scheduledStartAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  winnerAgentId: string | null;
  winnerName: string | null;
  onChainGameId: number | null;
  bettingPool: number;
  deckCommitment: string | null;
  isVerifiable: boolean;
}

interface GamesListResponse {
  games: GameListItem[];
  total: number;
  hasMore: boolean;
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

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(`games-list:${clientId}`, RATE_LIMITS.FREE);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rateLimit) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // waiting, betting_open, betting_closed, resolved
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from("games")
      .select(`
        id,
        game_number,
        status,
        current_hand_number,
        max_hands,
        scheduled_start_at,
        started_at,
        resolved_at,
        winner_agent_id,
        on_chain_game_id,
        deck_commitment,
        agents!games_winner_agent_id_fkey (name)
      `)
      .order("game_number", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data: games, error: gamesError } = await query;

    if (gamesError) {
      console.error("[API v1] Games query error:", gamesError);
      return NextResponse.json(
        { error: "Failed to fetch games" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Get betting pools for each game
    const gameIds = (games || []).map((g: { id: string }) => g.id);
    
    let poolMap = new Map<string, number>();
    if (gameIds.length > 0) {
      const { data: bets } = await supabase
        .from("spectator_bets")
        .select("game_id, amount")
        .in("game_id", gameIds);
      
      if (bets) {
        for (const bet of bets) {
          const current = poolMap.get(bet.game_id) || 0;
          poolMap.set(bet.game_id, current + Number(bet.amount));
        }
      }
    }

    // Format response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gamesList: GameListItem[] = (games || []).map((game: any) => {
      // Handle agents being array or single object from join
      const agentData = game.agents;
      let winnerName: string | null = null;
      if (agentData) {
        if (Array.isArray(agentData)) {
          winnerName = agentData[0]?.name || null;
        } else {
          winnerName = agentData.name || null;
        }
      }
      return {
        id: game.id,
        gameNumber: game.game_number,
        status: game.status as GameListItem["status"],
        currentHand: game.current_hand_number,
        maxHands: game.max_hands,
        scheduledStartAt: game.scheduled_start_at,
        startedAt: game.started_at,
        resolvedAt: game.resolved_at,
        winnerAgentId: game.winner_agent_id,
        winnerName,
        onChainGameId: game.on_chain_game_id,
        bettingPool: poolMap.get(game.id) || 0,
        deckCommitment: game.deck_commitment,
        isVerifiable: !!game.deck_commitment,
      };
    });

    // Get total count
    const { count } = await supabase
      .from("games")
      .select("*", { count: "exact", head: true });

    const response: GamesListResponse = {
      games: gamesList,
      total: count || 0,
      hasMore: offset + gamesList.length < (count || 0),
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
