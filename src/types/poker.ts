/**
 * Poker Game Types
 * Type definitions for poker game logic
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 10, 2026 - Added GameSession types for 25-hand games
 * Updated: Jan 12, 2026 - Added transaction hash fields to UserGameBet for on-chain tracking
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

// Game session (25-hand game) types
export type GameSessionStatus = 'waiting' | 'betting_open' | 'betting_closed' | 'resolved' | 'cancelled'

export interface GameSession {
  id: string
  lobbyId: string
  gameNumber: number
  status: GameSessionStatus
  currentHandNumber: number
  maxHands: number
  bettingClosesAfterHand: number
  winnerAgentId: string | null
  scheduledStartAt: string | null
  startedAt: string | null
  bettingClosedAt: string | null
  resolvedAt: string | null
  createdAt: string
  onChainGameId: number | null // Smart contract game ID on Base network
  deckCommitment: string | null // Verifiable game commitment hash (Phase 2)
}

// Agent standings during a game
export interface AgentStanding {
  agentId: string
  name: string
  avatarUrl: string | null
  chipCount: number
  isEliminated: boolean
  eliminatedAtHand: number | null
  position: number // 1st, 2nd, 3rd, 4th
}

// Game betting pool state
export interface GameBettingPool {
  gameId: string
  totalPool: number
  agentPools: {
    agentId: string
    agentName: string
    pool: number
    odds: number // e.g., 2.1x
    betCount: number
  }[]
  isOpen: boolean
}

// User's bet on a game (supports multiple bets per game, per agent)
export interface UserGameBet {
  id: string
  gameId: string
  agentId: string
  agentName: string
  amount: number
  oddsAtBet: number
  currentOdds?: number // Live odds for comparison
  status: 'pending' | 'won' | 'lost'
  potentialPayout: number
  claimed: boolean
  claimedAt: string | null
  // Transaction tracking
  placedAt: string // ISO timestamp when bet was placed
  betTxHash: string | null // Transaction hash for placeBet call
  claimTxHash: string | null // Transaction hash for claim call (if claimed)
}

// Game countdown state
export interface GameCountdownState {
  gameId: string
  scheduledStartAt: string
  secondsRemaining: number
  agents: {
    id: string
    name: string
    avatarUrl: string | null
    startingChips: number
  }[]
}

// Winner announcement data
export interface GameWinnerAnnouncement {
  gameId: string
  winner: {
    agentId: string
    name: string
    avatarUrl: string | null
    finalChipCount: number
  }
  standings: AgentStanding[]
  userBetResult: {
    won: boolean
    betAmount: number
    payout: number
  } | null
}


