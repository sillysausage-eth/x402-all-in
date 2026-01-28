/**
 * Agent Configuration
 * 
 * Constants and types for the 4 AI poker agents.
 * Agents play with VIRTUAL chips only - no real token transfers.
 * 
 * Created: January 16, 2026
 * Updated: January 19, 2026 - Simplified: removed wallet management (virtual chips only)
 * 
 * The chip_count in the database is the source of truth for agent balances.
 * No blockchain wallets needed for internal agents.
 */

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Agent identifiers
export const AGENT_IDS = ["chamath", "sacks", "jason", "friedberg"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

// Agent display names
export const AGENT_NAMES: Record<AgentId, string> = {
  chamath: "Chamath",
  sacks: "Sacks",
  jason: "Jason",
  friedberg: "Friedberg",
};

// On-chain agent indices (for smart contract betting - spectator bets)
export const AGENT_CONTRACT_INDICES: Record<AgentId, number> = {
  chamath: 0,
  sacks: 1,
  jason: 2,
  friedberg: 3,
};

// Reverse mapping: index to agent ID
export const INDEX_TO_AGENT_ID: Record<number, AgentId> = {
  0: "chamath",
  1: "sacks",
  2: "jason",
  3: "friedberg",
};

// Starting chip count for each game
export const STARTING_CHIP_COUNT = 1000;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a string is a valid agent ID
 */
export function isValidAgentId(id: string): id is AgentId {
  return AGENT_IDS.includes(id as AgentId);
}

/**
 * Get agent display name from ID
 */
export function getAgentName(agentId: AgentId): string {
  return AGENT_NAMES[agentId];
}

/**
 * Get contract index from agent ID
 */
export function getAgentContractIndex(agentId: AgentId): number {
  return AGENT_CONTRACT_INDICES[agentId];
}

/**
 * Get agent ID from contract index
 */
export function getAgentIdFromIndex(index: number): AgentId | null {
  return INDEX_TO_AGENT_ID[index] || null;
}
