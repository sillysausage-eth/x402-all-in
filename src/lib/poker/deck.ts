/**
 * Poker Deck Management
 * Create, shuffle, and deal cards
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 20, 2026 - Added seeded shuffle for verifiable games
 * Reference: Standard 52-card deck for Texas Hold'em
 */

import { createHash } from 'crypto'
import { Card, Suit, Rank, CardNotation } from '@/types/poker'

// All suits and ranks
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

// Suit notation mapping
const SUIT_NOTATION: Record<Suit, string> = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
}

const NOTATION_TO_SUIT: Record<string, Suit> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
}

/**
 * Convert a Card object to notation string (e.g., "Ah" for Ace of hearts)
 */
export function cardToNotation(card: Card): CardNotation {
  return `${card.rank}${SUIT_NOTATION[card.suit]}`
}

/**
 * Parse notation string to Card object
 */
export function notationToCard(notation: CardNotation): Card {
  const suit = notation.slice(-1).toLowerCase()
  const rank = notation.slice(0, -1) as Rank
  return { rank, suit: NOTATION_TO_SUIT[suit] }
}

/**
 * Create a fresh 52-card deck
 */
export function createDeck(): CardNotation[] {
  const deck: CardNotation[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(cardToNotation({ suit, rank }))
    }
  }
  return deck
}

/**
 * Simple seeded random number generator (mulberry32)
 * Deterministic given a seed - perfect for verifiable shuffles
 */
function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates shuffle algorithm
 * Uses Math.random() for non-deterministic shuffle
 */
export function shuffleDeck(deck: CardNotation[]): CardNotation[] {
  const shuffled = [...deck]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

/**
 * Fisher-Yates shuffle with a seed for deterministic results
 * Given the same seed, produces the exact same shuffle every time
 * 
 * @param deck - The deck to shuffle
 * @param seed - A string seed (will be hashed to create numeric seed)
 */
export function shuffleDeckSeeded(deck: CardNotation[], seed: string): CardNotation[] {
  // Hash the seed to get a numeric value
  const hash = createHash('sha256').update(seed).digest()
  const numericSeed = hash.readUInt32BE(0)
  const random = seededRandom(numericSeed)
  
  const shuffled = [...deck]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

/**
 * Create and shuffle a new deck (non-deterministic)
 */
export function createShuffledDeck(): CardNotation[] {
  return shuffleDeck(createDeck())
}

/**
 * Create and shuffle a new deck with a seed (deterministic)
 * Used for verifiable games - same seed always produces same shuffle
 * 
 * @param seed - String seed (e.g., "master_salt:hand_number")
 */
export function createSeededDeck(seed: string): CardNotation[] {
  return shuffleDeckSeeded(createDeck(), seed)
}

/**
 * Deal cards from deck
 * Returns [dealt cards, remaining deck]
 */
export function dealCards(
  deck: CardNotation[], 
  count: number
): [CardNotation[], CardNotation[]] {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck with ${deck.length} cards`)
  }
  const dealt = deck.slice(0, count)
  const remaining = deck.slice(count)
  return [dealt, remaining]
}

/**
 * Deal hole cards to multiple players
 * Returns [array of hole cards per player, remaining deck]
 */
export function dealHoleCards(
  deck: CardNotation[], 
  playerCount: number
): [CardNotation[][], CardNotation[]] {
  const holeCards: CardNotation[][] = []
  let remainingDeck = [...deck]
  
  // Deal 2 cards to each player (standard Texas Hold'em)
  for (let i = 0; i < playerCount; i++) {
    const [cards, newDeck] = dealCards(remainingDeck, 2)
    holeCards.push(cards)
    remainingDeck = newDeck
  }
  
  return [holeCards, remainingDeck]
}

/**
 * Deal community cards (flop, turn, river)
 */
export function dealFlop(deck: CardNotation[]): [CardNotation[], CardNotation[]] {
  // Burn one card, deal three
  const [, afterBurn] = dealCards(deck, 1)
  return dealCards(afterBurn, 3)
}

export function dealTurn(deck: CardNotation[]): [CardNotation, CardNotation[]] {
  // Burn one card, deal one
  const [, afterBurn] = dealCards(deck, 1)
  const [cards, remaining] = dealCards(afterBurn, 1)
  return [cards[0], remaining]
}

export function dealRiver(deck: CardNotation[]): [CardNotation, CardNotation[]] {
  // Same as turn
  return dealTurn(deck)
}

/**
 * Get numeric value of a rank for comparison
 * Ace is high (14) in this implementation
 */
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  }
  return values[rank]
}

/**
 * Sort cards by rank value (high to low)
 */
export function sortByRank(cards: CardNotation[]): CardNotation[] {
  return [...cards].sort((a, b) => {
    const rankA = getRankValue(notationToCard(a).rank)
    const rankB = getRankValue(notationToCard(b).rank)
    return rankB - rankA
  })
}

