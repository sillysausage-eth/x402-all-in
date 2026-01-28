/**
 * Agent Module
 * 
 * Configuration and types for the 4 AI poker agents.
 * Agents play with VIRTUAL chips - no real token transfers between them.
 * 
 * Created: January 16, 2026
 * Updated: January 19, 2026 - Simplified: removed wallet/payment code (virtual chips only)
 */

export {
  // Types
  type AgentId,
  AGENT_IDS,
  AGENT_NAMES,
  AGENT_CONTRACT_INDICES,
  INDEX_TO_AGENT_ID,
  STARTING_CHIP_COUNT,
  
  // Helpers
  isValidAgentId,
  getAgentName,
  getAgentContractIndex,
  getAgentIdFromIndex,
} from "./wallets";
