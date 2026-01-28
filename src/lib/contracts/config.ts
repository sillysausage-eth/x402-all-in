/**
 * Contract Configuration
 * Network-specific contract addresses and settings
 * 
 * Created: January 12, 2026
 * Updated: January 20, 2026 - Added PokerBettingV2 (UUPS upgradeable)
 * Updated: January 22, 2026 - V2 contracts verified on Basescan, V1 deprecated
 * Updated: January 26, 2026 - Reverted to MockUSDC (contract was deployed with this token)
 * 
 * Networks:
 * - Base Sepolia (testnet): V2 deployed and verified
 * - Base Mainnet: TODO - deploy before production launch
 */

import { baseSepolia, base } from "thirdweb/chains";

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base Sepolia (Testnet) Configuration
 * V1 Deployed: January 12, 2026 (deprecated)
 * V2 Deployed: January 20, 2026 (UUPS Upgradeable)
 * V2 Verified: January 22, 2026 on Basescan
 */
export const SEPOLIA = {
  chainId: baseSepolia.id,
  chain: baseSepolia,
  name: "Base Sepolia",
  isTestnet: true,
  contracts: {
    // V2 (UUPS Upgradeable) - verified on Basescan Jan 22, 2026
    pokerBetting: "0x313A6ABd0555A2A0E358de535833b406543Cc14c" as `0x${string}`,
    pokerBettingImplementation: "0xDEDda864eF09BC93E1F3D78fa655f3d7E6C104CD" as `0x${string}`,
    usdc: "0xf56873A99B2E5F83562F01996f46C42AFAEc9f84" as `0x${string}`, // MockUSDC - contract was deployed with this token
  },
  explorer: "https://sepolia.basescan.org",
} as const;

/**
 * Base Mainnet Configuration
 * TODO: Deploy contracts before production launch
 */
export const MAINNET = {
  chainId: base.id,
  chain: base,
  name: "Base",
  isTestnet: false,
  contracts: {
    pokerBetting: "0x0000000000000000000000000000000000000000" as `0x${string}`, // TODO: Deploy
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // Official Base USDC
  },
  explorer: "https://basescan.org",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get configuration for current environment
 */
export function getCurrentConfig() {
  return process.env.NEXT_PUBLIC_CHAIN_ENV === "production" ? MAINNET : SEPOLIA;
}

/**
 * Get configuration by chain ID
 */
export function getConfigByChainId(chainId: number) {
  if (chainId === baseSepolia.id) return SEPOLIA;
  if (chainId === base.id) return MAINNET;
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, chainId?: number) {
  const config = chainId ? getConfigByChainId(chainId) : getCurrentConfig();
  return `${config.explorer}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(address: string, chainId?: number) {
  const config = chainId ? getConfigByChainId(chainId) : getCurrentConfig();
  return `${config.explorer}/address/${address}`;
}
