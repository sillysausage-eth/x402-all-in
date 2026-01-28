/**
 * Verifiable Games - Commit-Reveal Scheme
 * 
 * Implements cryptographic verification for fair game outcomes.
 * 
 * Created: January 20, 2026
 * 
 * Flow:
 * 1. Before game: Generate random master salt → compute commitment = hash(salt)
 * 2. Publish commitment hash (players can see it before betting)
 * 3. During game: Each hand's deck = seededShuffle(salt + hand_number)
 * 4. After game: Reveal salt, anyone can recompute all shuffles and verify
 * 
 * Security: SHA-256 hash is computationally infeasible to reverse.
 * The master salt determines all shuffles deterministically.
 */

import { createHash, randomBytes } from 'crypto';
import type { CardNotation } from '@/types/poker';
import { createSeededDeck } from './deck';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GameCommitment {
  /** SHA-256 hash of the master salt */
  commitment: string;
  /** Random 32-byte master salt as hex string (kept secret until game ends) */
  salt: string;
}

export interface VerificationResult {
  /** Whether the commitment matches */
  valid: boolean;
  /** The commitment hash from the game */
  commitment: string;
  /** The computed hash from salt */
  computedHash: string;
  /** Error message if invalid */
  error?: string;
}

export interface ActionLogEntry {
  /** Hand number (1-25) */
  hand: number;
  /** Agent slug (chamath, sacks, jason, friedberg) */
  agent: string;
  /** Action type (fold, check, call, raise, bet, all_in) */
  action: string;
  /** Amount for bet/raise/call actions */
  amount?: number;
  /** Betting round (preflop, flop, turn, river) */
  round: string;
  /** ISO8601 timestamp */
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMITMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a random 32-byte salt as hex string.
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of the master salt.
 * This commitment is published before the game starts.
 */
export function computeCommitmentHash(salt: string): string {
  return createHash('sha256').update(salt).digest('hex');
}

/**
 * Generate the seed for a specific hand's shuffle.
 * Combines master salt with hand number for deterministic shuffle.
 */
export function getHandSeed(masterSalt: string, handNumber: number): string {
  return `${masterSalt}:hand:${handNumber}`;
}

/**
 * Get the deterministic deck for a specific hand.
 * Given the same salt and hand number, always produces the same shuffle.
 */
export function getDeckForHand(masterSalt: string, handNumber: number): CardNotation[] {
  const seed = getHandSeed(masterSalt, handNumber);
  return createSeededDeck(seed);
}

/**
 * Generate a complete game commitment.
 * This should be called when creating a new game.
 * 
 * Returns:
 * - commitment: The hash to publish (can be shown to players)
 * - salt: The master salt (keep secret until game ends)
 * 
 * Note: We don't store the deck anymore - it's computed on-the-fly
 * from the salt + hand number, making it deterministic and verifiable.
 */
export function generateGameCommitment(): GameCommitment {
  // Generate random master salt
  const salt = generateSalt();
  
  // Compute commitment hash
  const commitment = computeCommitmentHash(salt);
  
  return {
    commitment,
    salt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify that a salt matches the original commitment.
 * Anyone can call this to verify the game's random seed.
 */
export function verifyGameCommitment(
  commitment: string,
  salt: string
): VerificationResult {
  // Validate inputs
  if (!commitment || commitment.length !== 64) {
    return {
      valid: false,
      commitment,
      computedHash: '',
      error: 'Invalid commitment hash format (expected 64-char hex string)',
    };
  }

  if (!salt || salt.length !== 64) {
    return {
      valid: false,
      commitment,
      computedHash: '',
      error: 'Invalid salt format (expected 64-char hex string)',
    };
  }

  // Recompute the hash
  const computedHash = computeCommitmentHash(salt);

  // Compare
  const valid = computedHash.toLowerCase() === commitment.toLowerCase();

  return {
    valid,
    commitment,
    computedHash,
    error: valid ? undefined : 'Hash mismatch - commitment does not match salt',
  };
}

/**
 * Verify that cards dealt in a hand match the expected deck.
 * 
 * @param salt - The revealed master salt
 * @param handNumber - The hand number (1-25)
 * @param holeCards - 2D array of hole cards [player0: [card1, card2], ...]
 * @param communityCards - Array of community cards [flop1, flop2, flop3, turn, river]
 * @returns Whether all dealt cards match the seeded deck
 */
export function verifyHandCards(
  salt: string,
  handNumber: number,
  holeCards: CardNotation[][],
  communityCards: CardNotation[]
): { valid: boolean; error?: string; expectedDeck?: CardNotation[] } {
  // Get the deterministic deck for this hand
  const expectedDeck = getDeckForHand(salt, handNumber);
  
  // Reconstruct dealt cards in order
  // In Texas Hold'em: deal 2 cards to each player, then burn + 3 flop, burn + turn, burn + river
  const dealtCards: CardNotation[] = [];
  
  // Hole cards (2 per player)
  for (const playerCards of holeCards) {
    dealtCards.push(...playerCards);
  }
  
  // Verify hole cards
  for (let i = 0; i < dealtCards.length; i++) {
    if (expectedDeck[i] !== dealtCards[i]) {
      return {
        valid: false,
        error: `Hole card mismatch at position ${i}: expected ${expectedDeck[i]}, got ${dealtCards[i]}`,
        expectedDeck,
      };
    }
  }
  
  // For community cards, account for burn cards
  // Position after hole cards
  let deckPos = dealtCards.length;
  
  // Flop: burn 1, deal 3
  deckPos += 1; // burn
  for (let i = 0; i < 3 && i < communityCards.length; i++) {
    if (expectedDeck[deckPos] !== communityCards[i]) {
      return {
        valid: false,
        error: `Flop card ${i + 1} mismatch: expected ${expectedDeck[deckPos]}, got ${communityCards[i]}`,
        expectedDeck,
      };
    }
    deckPos++;
  }
  
  // Turn: burn 1, deal 1
  if (communityCards.length >= 4) {
    deckPos += 1; // burn
    if (expectedDeck[deckPos] !== communityCards[3]) {
      return {
        valid: false,
        error: `Turn card mismatch: expected ${expectedDeck[deckPos]}, got ${communityCards[3]}`,
        expectedDeck,
      };
    }
    deckPos++;
  }
  
  // River: burn 1, deal 1
  if (communityCards.length >= 5) {
    deckPos += 1; // burn
    if (expectedDeck[deckPos] !== communityCards[4]) {
      return {
        valid: false,
        error: `River card mismatch: expected ${expectedDeck[deckPos]}, got ${communityCards[4]}`,
        expectedDeck,
      };
    }
  }
  
  return { valid: true, expectedDeck };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an action log entry.
 */
export function createActionLogEntry(
  hand: number,
  agent: string,
  action: string,
  round: string,
  amount?: number
): ActionLogEntry {
  return {
    hand,
    agent,
    action,
    round,
    amount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse action log from JSONB string.
 */
export function parseActionLog(logJson: string | null): ActionLogEntry[] {
  if (!logJson) return [];
  try {
    const parsed = JSON.parse(logJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format commitment for display (shortened).
 */
export function formatCommitment(commitment: string): string {
  if (!commitment || commitment.length < 16) return commitment;
  return `${commitment.slice(0, 8)}...${commitment.slice(-8)}`;
}

/**
 * Check if a game has verification data.
 */
export function hasVerificationData(game: {
  deck_commitment?: string | null;
  deck_reveal?: string | null;
  salt_reveal?: string | null;
}): boolean {
  return !!(game.deck_commitment && game.deck_reveal && game.salt_reveal);
}
