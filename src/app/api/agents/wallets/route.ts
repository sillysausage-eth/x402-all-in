/**
 * Agent Info API
 * 
 * GET - Get all agent info including virtual chip counts from database
 * POST - Reset all agent chip counts to starting amount
 * 
 * Created: January 16, 2026
 * Updated: January 23, 2026 - Cleaned up: agents use virtual chips only, removed wallet references
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AGENT_IDS, AGENT_NAMES, AGENT_CONTRACT_INDICES, STARTING_CHIP_COUNT } from "@/lib/agents";

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
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/agents/wallets
 * 
 * Get all agent info including chip counts from database.
 * Note: Route path kept for backwards compatibility.
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch agents from database
    const { data: agents, error } = await supabase
      .from("agents")
      .select("id, name, slug, chip_count, avatar_url")
      .in("slug", AGENT_IDS);
    
    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch agents" },
        { status: 500 }
      );
    }
    
    // Map to response format
    const agentInfo = AGENT_IDS.map(agentId => {
      const dbAgent = agents?.find(a => a.slug === agentId);
      
      return {
        agentId,
        name: AGENT_NAMES[agentId],
        slug: agentId,
        contractIndex: AGENT_CONTRACT_INDICES[agentId],
        chipCount: dbAgent?.chip_count ?? STARTING_CHIP_COUNT,
        avatarUrl: dbAgent?.avatar_url ?? null,
      };
    });
    
    const totalChips = agentInfo.reduce((sum, a) => sum + a.chipCount, 0);
    
    return NextResponse.json({
      success: true,
      agents: agentInfo,
      summary: {
        totalAgents: agentInfo.length,
        totalChips,
        startingChipsPerAgent: STARTING_CHIP_COUNT,
      },
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/wallets
 * 
 * Reset all agent chip counts to starting amount.
 * Used when starting a new game.
 */
export async function POST() {
  try {
    const supabase = getSupabaseClient();
    
    // Reset all agent chip counts
    const { error } = await supabase
      .from("agents")
      .update({ chip_count: STARTING_CHIP_COUNT })
      .in("slug", AGENT_IDS);
    
    if (error) {
      console.error("[API] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to reset chip counts" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `All agents reset to ${STARTING_CHIP_COUNT} chips`,
      chipCount: STARTING_CHIP_COUNT,
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
