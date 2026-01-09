/**
 * Poker Hand Evaluator
 * Evaluate and rank Texas Hold'em hands
 * 
 * Created: Jan 5, 2026
 * Reference: Standard poker hand rankings
 * 
 * Hand Rankings (low to high):
 * 1. High Card
 * 2. Pair
 * 3. Two Pair
 * 4. Three of a Kind
 * 5. Straight
 * 6. Flush
 * 7. Full House
 * 8. Four of a Kind
 * 9. Straight Flush
 * 10. Royal Flush
 */

import { CardNotation, EvaluatedHand, HandRank, Rank, Suit } from '@/types/poker'
import { notationToCard, getRankValue, sortByRank } from './deck'

// Hand rank values for comparison
const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high_card': 1,
  'pair': 2,
  'two_pair': 3,
  'three_of_a_kind': 4,
  'straight': 5,
  'flush': 6,
  'full_house': 7,
  'four_of_a_kind': 8,
  'straight_flush': 9,
  'royal_flush': 10,
}

// Rank names for descriptions
const RANK_NAMES: Record<Rank, string> = {
  '2': 'Twos', '3': 'Threes', '4': 'Fours', '5': 'Fives',
  '6': 'Sixes', '7': 'Sevens', '8': 'Eights', '9': 'Nines', '10': 'Tens',
  'J': 'Jacks', 'Q': 'Queens', 'K': 'Kings', 'A': 'Aces'
}

interface CardAnalysis {
  cards: CardNotation[]
  ranks: Rank[]
  suits: Suit[]
  rankCounts: Map<Rank, number>
  suitCounts: Map<Suit, number>
}

/**
 * Analyze a set of cards for evaluation
 */
function analyzeCards(cards: CardNotation[]): CardAnalysis {
  const ranks: Rank[] = []
  const suits: Suit[] = []
  const rankCounts = new Map<Rank, number>()
  const suitCounts = new Map<Suit, number>()

  for (const notation of cards) {
    const card = notationToCard(notation)
    ranks.push(card.rank)
    suits.push(card.suit)
    
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1)
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1)
  }

  return { cards, ranks, suits, rankCounts, suitCounts }
}

/**
 * Check if cards form a flush (5+ same suit)
 */
function findFlush(analysis: CardAnalysis): CardNotation[] | null {
  for (const [suit, count] of analysis.suitCounts) {
    if (count >= 5) {
      const flushCards = analysis.cards.filter(c => notationToCard(c).suit === suit)
      return sortByRank(flushCards).slice(0, 5)
    }
  }
  return null
}

/**
 * Check if cards form a straight (5 consecutive ranks)
 */
function findStraight(cards: CardNotation[]): CardNotation[] | null {
  const sorted = sortByRank(cards)
  const uniqueRanks = new Map<number, CardNotation>()
  
  // Get unique ranks
  for (const card of sorted) {
    const value = getRankValue(notationToCard(card).rank)
    if (!uniqueRanks.has(value)) {
      uniqueRanks.set(value, card)
    }
  }
  
  // Check for Ace-low straight (A-2-3-4-5)
  if (uniqueRanks.has(14) && uniqueRanks.has(2) && uniqueRanks.has(3) && 
      uniqueRanks.has(4) && uniqueRanks.has(5)) {
    return [
      uniqueRanks.get(5)!, uniqueRanks.get(4)!, uniqueRanks.get(3)!, 
      uniqueRanks.get(2)!, uniqueRanks.get(14)!
    ]
  }
  
  // Check for regular straights
  const values = Array.from(uniqueRanks.keys()).sort((a, b) => b - a)
  for (let i = 0; i <= values.length - 5; i++) {
    if (values[i] - values[i + 4] === 4) {
      return [
        uniqueRanks.get(values[i])!,
        uniqueRanks.get(values[i + 1])!,
        uniqueRanks.get(values[i + 2])!,
        uniqueRanks.get(values[i + 3])!,
        uniqueRanks.get(values[i + 4])!,
      ]
    }
  }
  
  return null
}

/**
 * Find n-of-a-kind (pairs, trips, quads)
 */
function findOfAKind(analysis: CardAnalysis, count: number): Rank[] {
  const matches: Rank[] = []
  for (const [rank, c] of analysis.rankCounts) {
    if (c === count) {
      matches.push(rank)
    }
  }
  // Sort by rank value (high to low)
  return matches.sort((a, b) => getRankValue(b) - getRankValue(a))
}

/**
 * Get cards of a specific rank
 */
function getCardsOfRank(cards: CardNotation[], rank: Rank): CardNotation[] {
  return cards.filter(c => notationToCard(c).rank === rank)
}

/**
 * Get kickers (cards not used in the made hand)
 */
function getKickers(cards: CardNotation[], usedRanks: Rank[], count: number): CardNotation[] {
  const kickers = cards.filter(c => !usedRanks.includes(notationToCard(c).rank))
  return sortByRank(kickers).slice(0, count)
}

/**
 * Evaluate the best 5-card hand from available cards
 * @param holeCards Player's 2 hole cards
 * @param communityCards The 5 community cards (or fewer if not all dealt)
 */
export function evaluateHand(
  holeCards: CardNotation[], 
  communityCards: CardNotation[]
): EvaluatedHand {
  const allCards = [...holeCards, ...communityCards]
  const analysis = analyzeCards(allCards)
  
  // Check for flush first (needed for straight flush check)
  const flushCards = findFlush(analysis)
  
  // Check for straight flush / royal flush
  if (flushCards) {
    const straightFlush = findStraight(flushCards)
    if (straightFlush) {
      const highCard = notationToCard(straightFlush[0])
      if (highCard.rank === 'A') {
        return {
          rank: 'royal_flush',
          rankValue: HAND_RANK_VALUES['royal_flush'],
          cards: straightFlush,
          description: 'Royal Flush!'
        }
      }
      return {
        rank: 'straight_flush',
        rankValue: HAND_RANK_VALUES['straight_flush'],
        cards: straightFlush,
        description: `Straight Flush, ${highCard.rank} high`
      }
    }
  }
  
  // Four of a kind
  const quads = findOfAKind(analysis, 4)
  if (quads.length > 0) {
    const quadRank = quads[0]
    const quadCards = getCardsOfRank(allCards, quadRank)
    const kicker = getKickers(allCards, [quadRank], 1)
    return {
      rank: 'four_of_a_kind',
      rankValue: HAND_RANK_VALUES['four_of_a_kind'],
      cards: [...quadCards, ...kicker],
      description: `Four of a Kind, ${RANK_NAMES[quadRank]}`
    }
  }
  
  // Full house
  const trips = findOfAKind(analysis, 3)
  const pairs = findOfAKind(analysis, 2)
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const tripRank = trips[0]
    const pairRank = pairs.length > 0 ? pairs[0] : trips[1]
    const tripCards = getCardsOfRank(allCards, tripRank).slice(0, 3)
    const pairCards = getCardsOfRank(allCards, pairRank).slice(0, 2)
    return {
      rank: 'full_house',
      rankValue: HAND_RANK_VALUES['full_house'],
      cards: [...tripCards, ...pairCards],
      description: `Full House, ${RANK_NAMES[tripRank]} over ${RANK_NAMES[pairRank]}`
    }
  }
  
  // Flush
  if (flushCards) {
    const highCard = notationToCard(flushCards[0])
    return {
      rank: 'flush',
      rankValue: HAND_RANK_VALUES['flush'],
      cards: flushCards,
      description: `Flush, ${highCard.rank} high`
    }
  }
  
  // Straight
  const straight = findStraight(allCards)
  if (straight) {
    const highCard = notationToCard(straight[0])
    return {
      rank: 'straight',
      rankValue: HAND_RANK_VALUES['straight'],
      cards: straight,
      description: `Straight, ${highCard.rank} high`
    }
  }
  
  // Three of a kind
  if (trips.length > 0) {
    const tripRank = trips[0]
    const tripCards = getCardsOfRank(allCards, tripRank)
    const kickers = getKickers(allCards, [tripRank], 2)
    return {
      rank: 'three_of_a_kind',
      rankValue: HAND_RANK_VALUES['three_of_a_kind'],
      cards: [...tripCards, ...kickers],
      description: `Three of a Kind, ${RANK_NAMES[tripRank]}`
    }
  }
  
  // Two pair
  if (pairs.length >= 2) {
    const highPair = pairs[0]
    const lowPair = pairs[1]
    const highPairCards = getCardsOfRank(allCards, highPair)
    const lowPairCards = getCardsOfRank(allCards, lowPair)
    const kicker = getKickers(allCards, [highPair, lowPair], 1)
    return {
      rank: 'two_pair',
      rankValue: HAND_RANK_VALUES['two_pair'],
      cards: [...highPairCards, ...lowPairCards, ...kicker],
      description: `Two Pair, ${RANK_NAMES[highPair]} and ${RANK_NAMES[lowPair]}`
    }
  }
  
  // One pair
  if (pairs.length === 1) {
    const pairRank = pairs[0]
    const pairCards = getCardsOfRank(allCards, pairRank)
    const kickers = getKickers(allCards, [pairRank], 3)
    return {
      rank: 'pair',
      rankValue: HAND_RANK_VALUES['pair'],
      cards: [...pairCards, ...kickers],
      description: `Pair of ${RANK_NAMES[pairRank]}`
    }
  }
  
  // High card
  const highCards = sortByRank(allCards).slice(0, 5)
  const highCard = notationToCard(highCards[0])
  return {
    rank: 'high_card',
    rankValue: HAND_RANK_VALUES['high_card'],
    cards: highCards,
    description: `High Card, ${highCard.rank}`
  }
}

/**
 * Compare two evaluated hands
 * Returns: positive if hand1 wins, negative if hand2 wins, 0 if tie
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  // Compare hand ranks first
  if (hand1.rankValue !== hand2.rankValue) {
    return hand1.rankValue - hand2.rankValue
  }
  
  // Same hand rank - compare card values
  for (let i = 0; i < Math.min(hand1.cards.length, hand2.cards.length); i++) {
    const value1 = getRankValue(notationToCard(hand1.cards[i]).rank)
    const value2 = getRankValue(notationToCard(hand2.cards[i]).rank)
    if (value1 !== value2) {
      return value1 - value2
    }
  }
  
  return 0 // Perfect tie
}

/**
 * Determine winner(s) from multiple hands
 * Returns array of winning player indices (multiple for split pots)
 */
export function determineWinners(
  playerHands: { holeCards: CardNotation[]; playerId: string }[],
  communityCards: CardNotation[]
): { playerId: string; hand: EvaluatedHand }[] {
  // Evaluate all hands
  const evaluated = playerHands.map(p => ({
    playerId: p.playerId,
    hand: evaluateHand(p.holeCards, communityCards)
  }))
  
  // Find the best hand
  let bestHand = evaluated[0].hand
  for (const e of evaluated) {
    if (compareHands(e.hand, bestHand) > 0) {
      bestHand = e.hand
    }
  }
  
  // Return all players with the best hand (could be multiple for split pot)
  return evaluated.filter(e => compareHands(e.hand, bestHand) === 0)
}

/**
 * Calculate hand strength as a percentage (for display/betting odds)
 * This is a simplified estimation based on hand rank
 */
export function getHandStrengthPercent(hand: EvaluatedHand): number {
  const baseStrength: Record<HandRank, number> = {
    'high_card': 10,
    'pair': 25,
    'two_pair': 40,
    'three_of_a_kind': 55,
    'straight': 65,
    'flush': 75,
    'full_house': 85,
    'four_of_a_kind': 95,
    'straight_flush': 99,
    'royal_flush': 100,
  }
  return baseStrength[hand.rank]
}

