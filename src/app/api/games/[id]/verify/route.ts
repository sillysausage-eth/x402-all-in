/**
 * Game Verification API
 * 
 * GET /api/games/:id/verify
 * 
 * Verifies the fairness of a completed game by checking:
 * 1. The salt matches the pre-published commitment
 * 2. The dealt cards match the deterministic deck from the salt
 * 
 * Created: January 20, 2026
 * 
 * Note: This endpoint only returns verification data for RESOLVED games.
 * For active games, the salt is kept secret to prevent cheating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  verifyGameCommitment, 
  getDeckForHand,
  verifyHandCards 
} from '@/lib/poker/verifiable';
import type { CardNotation } from '@/types/poker';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HandVerificationResult {
  handNumber: number;
  valid: boolean;
  error?: string;
  holeCards?: CardNotation[][];
  communityCards?: CardNotation[];
  expectedDeck?: CardNotation[];
}

interface GameVerificationResponse {
  success: boolean;
  gameId: string;
  gameNumber: number;
  status: string;
  verification: {
    commitmentValid: boolean;
    commitment: string;
    computedHash: string;
    salt?: string;
    handsVerified?: number;
    handsTotal?: number;
    handResults?: HandVerificationResult[];
    error?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(url, key);
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const supabase = getSupabaseClient();

    // Fetch game with verification data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, game_number, status, deck_commitment, salt_reveal, action_log')
      .eq('id', gameId)
      .single() as { 
        data: { 
          id: string; 
          game_number: number; 
          status: string; 
          deck_commitment: string | null;
          salt_reveal: string | null;
          action_log: unknown[] | null;
        } | null; 
        error: unknown 
      };

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found', gameId },
        { status: 404 }
      );
    }

    // Check if game is resolved (we don't reveal salt for active games)
    if (game.status !== 'resolved') {
      return NextResponse.json({
        success: true,
        gameId: game.id,
        gameNumber: game.game_number,
        status: game.status,
        verification: {
          commitmentValid: false,
          commitment: game.deck_commitment || '',
          computedHash: '',
          error: 'Game not yet resolved. Salt will be revealed after the game ends.',
        },
      } satisfies GameVerificationResponse);
    }

    // Check if game has verification data
    if (!game.deck_commitment || !game.salt_reveal) {
      return NextResponse.json({
        success: true,
        gameId: game.id,
        gameNumber: game.game_number,
        status: game.status,
        verification: {
          commitmentValid: false,
          commitment: game.deck_commitment || '',
          computedHash: '',
          error: 'Game does not have verification data (created before verifiable games feature).',
        },
      } satisfies GameVerificationResponse);
    }

    // Verify the commitment matches the salt
    const commitmentResult = verifyGameCommitment(
      game.deck_commitment,
      game.salt_reveal
    );

    // If commitment doesn't match, something is wrong
    if (!commitmentResult.valid) {
      return NextResponse.json({
        success: true,
        gameId: game.id,
        gameNumber: game.game_number,
        status: game.status,
        verification: {
          commitmentValid: false,
          commitment: game.deck_commitment,
          computedHash: commitmentResult.computedHash,
          salt: game.salt_reveal,
          error: commitmentResult.error,
        },
      } satisfies GameVerificationResponse);
    }

    // Fetch all hands for this game to verify cards
    const { data: hands, error: handsError } = await supabase
      .from('hands')
      .select('id, hand_number, community_cards')
      .eq('game_id', gameId)
      .order('hand_number', { ascending: true }) as {
        data: Array<{ id: string; hand_number: number; community_cards: string[] | null }> | null;
        error: unknown;
      };

    if (handsError || !hands) {
      return NextResponse.json({
        success: true,
        gameId: game.id,
        gameNumber: game.game_number,
        status: game.status,
        verification: {
          commitmentValid: true,
          commitment: game.deck_commitment,
          computedHash: commitmentResult.computedHash,
          salt: game.salt_reveal,
          error: 'Could not fetch hands for verification.',
        },
      } satisfies GameVerificationResponse);
    }

    // Verify each hand's cards
    const handResults: HandVerificationResult[] = [];
    let handsVerified = 0;

    for (const hand of hands) {
      // Fetch hole cards for this hand
      const { data: handAgents } = await supabase
        .from('hand_agents')
        .select('hole_cards, seat_position')
        .eq('hand_id', hand.id)
        .order('seat_position', { ascending: true }) as {
          data: Array<{ hole_cards: string[] | null; seat_position: number }> | null;
        };

      const holeCards: CardNotation[][] = (handAgents || [])
        .map(ha => (ha.hole_cards || []) as CardNotation[]);
      
      const communityCards = (hand.community_cards || []) as CardNotation[];

      // Skip if no cards dealt (shouldn't happen)
      if (holeCards.length === 0) {
        handResults.push({
          handNumber: hand.hand_number,
          valid: false,
          error: 'No hole cards found',
        });
        continue;
      }

      // Verify the cards match the seeded deck
      const verification = verifyHandCards(
        game.salt_reveal,
        hand.hand_number,
        holeCards,
        communityCards
      );

      handResults.push({
        handNumber: hand.hand_number,
        valid: verification.valid,
        error: verification.error,
        holeCards: verification.valid ? undefined : holeCards,
        communityCards: verification.valid ? undefined : communityCards,
        expectedDeck: verification.valid ? undefined : verification.expectedDeck?.slice(0, 20),
      });

      if (verification.valid) {
        handsVerified++;
      }
    }

    return NextResponse.json({
      success: true,
      gameId: game.id,
      gameNumber: game.game_number,
      status: game.status,
      verification: {
        commitmentValid: true,
        commitment: game.deck_commitment,
        computedHash: commitmentResult.computedHash,
        salt: game.salt_reveal,
        handsVerified,
        handsTotal: hands.length,
        handResults,
      },
    } satisfies GameVerificationResponse);

  } catch (error) {
    console.error('[Verify API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
