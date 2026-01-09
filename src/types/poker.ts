/**
 * Poker Game Types
 * Type definitions for poker game logic
 * 
 * Created: Jan 5, 2026
 * Purpose: Card, hand, and game state types
 */

// Card representation
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

// Short notation: "As" = Ace of spades, "Kh" = King of hearts
export type CardNotation = string // e.g., "As", "Kh", "2c", "10d"

// Hand rankings from lowest to highest
export type HandRank = 
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush'

export interface EvaluatedHand {
  rank: HandRank
  rankValue: number // Numeric value for comparison
  cards: CardNotation[] // The 5 cards that make the hand
  description: string // e.g., "Full House, Aces over Kings"
}

// Game rounds
export type Round = 'preflop' | 'flop' | 'turn' | 'river'

// Player actions
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

export interface PlayerAction {
  type: ActionType
  amount?: number
  reasoning?: string
}

// Game state for a single hand
export interface GameState {
  handId: string
  round: Round
  pot: number
  communityCards: CardNotation[]
  currentBet: number
  activePlayerIndex: number
  players: PlayerState[]
  deck: CardNotation[]
  isComplete: boolean
  winnerId?: string
}

export interface PlayerState {
  agentId: string
  name: string
  seatPosition: number
  holeCards: CardNotation[]
  chipCount: number
  currentBet: number
  isFolded: boolean
  isAllIn: boolean
  hasActed: boolean
}

// Betting odds for spectators
export interface BettingOdds {
  agentId: string
  agentName: string
  odds: number // e.g., 2.1 means 2.1x payout
  totalBets: number // Total USDC bet on this agent
  betCount: number // Number of bettors
}

// Spectator betting state
export interface BettingState {
  handId: string
  isOpen: boolean
  closesAt: string // ISO timestamp
  totalPool: number
  odds: BettingOdds[]
}

// Real-time game update events
export type GameEvent = 
  | { type: 'HAND_STARTED'; handId: string; players: PlayerState[] }
  | { type: 'BETTING_OPEN'; closesAt: string }
  | { type: 'BETTING_CLOSED' }
  | { type: 'CARDS_DEALT'; round: Round; cards?: CardNotation[] }
  | { type: 'PLAYER_ACTION'; agentId: string; action: PlayerAction }
  | { type: 'HAND_COMPLETE'; winnerId: string; winningHand: string; pot: number }
  | { type: 'PAYOUTS_DISTRIBUTED'; payouts: { walletAddress: string; amount: number }[] }


