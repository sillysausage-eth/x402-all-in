/**
 * Poker Game Engine
 * Manages game state, betting rounds, and player actions
 * 
 * Created: Jan 5, 2026
 * Purpose: State machine for Texas Hold'em game flow
 */

import { 
  GameState, 
  PlayerState, 
  PlayerAction, 
  ActionType, 
  Round, 
  CardNotation,
  GameEvent,
  EvaluatedHand
} from '@/types/poker'
import { 
  createShuffledDeck, 
  dealHoleCards, 
  dealFlop, 
  dealTurn, 
  dealRiver 
} from './deck'
import { evaluateHand, determineWinners } from './hand-evaluator'

// Type for winner result
type WinnerResult = { playerId: string; hand: EvaluatedHand }

// Game configuration
export interface GameConfig {
  smallBlind: number
  bigBlind: number
  startingChips: number
  bettingWindowSeconds: number
}

const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 10,
  bigBlind: 20,
  startingChips: 1000,
  bettingWindowSeconds: 20,
}

/**
 * Initialize a new hand
 */
export function initializeHand(
  handId: string,
  players: { id: string; name: string }[],
  dealerIndex: number = 0,
  config: GameConfig = DEFAULT_CONFIG
): GameState {
  const deck = createShuffledDeck()
  const [holeCards, remainingDeck] = dealHoleCards(deck, players.length)
  
  // Create player states
  const playerStates: PlayerState[] = players.map((player, index) => ({
    agentId: player.id,
    name: player.name,
    seatPosition: index,
    holeCards: holeCards[index],
    chipCount: config.startingChips,
    currentBet: 0,
    isFolded: false,
    isAllIn: false,
    hasActed: false,
  }))
  
  // Post blinds
  const smallBlindIndex = (dealerIndex + 1) % players.length
  const bigBlindIndex = (dealerIndex + 2) % players.length
  
  playerStates[smallBlindIndex].currentBet = config.smallBlind
  playerStates[smallBlindIndex].chipCount -= config.smallBlind
  
  playerStates[bigBlindIndex].currentBet = config.bigBlind
  playerStates[bigBlindIndex].chipCount -= config.bigBlind
  
  // First to act is after big blind
  const activeIndex = (bigBlindIndex + 1) % players.length
  
  return {
    handId,
    round: 'preflop',
    pot: config.smallBlind + config.bigBlind,
    communityCards: [],
    currentBet: config.bigBlind,
    activePlayerIndex: activeIndex,
    players: playerStates,
    deck: remainingDeck,
    isComplete: false,
  }
}

/**
 * Get valid actions for the current player
 */
export function getValidActions(state: GameState): ActionType[] {
  const player = state.players[state.activePlayerIndex]
  
  if (player.isFolded || player.isAllIn) {
    return []
  }
  
  const actions: ActionType[] = ['fold']
  const toCall = state.currentBet - player.currentBet
  
  if (toCall === 0) {
    actions.push('check')
  } else if (toCall <= player.chipCount) {
    actions.push('call')
  }
  
  // Can raise if has chips beyond call amount
  if (player.chipCount > toCall) {
    actions.push('raise')
  }
  
  // Can always go all-in if has chips
  if (player.chipCount > 0) {
    actions.push('all_in')
  }
  
  return actions
}

/**
 * Apply a player action to the game state
 */
export function applyAction(
  state: GameState, 
  action: PlayerAction
): { newState: GameState; event: GameEvent } {
  const newState = structuredClone(state)
  const player = newState.players[newState.activePlayerIndex]
  const toCall = newState.currentBet - player.currentBet
  
  switch (action.type) {
    case 'fold':
      player.isFolded = true
      break
      
    case 'check':
      // No money movement
      break
      
    case 'call':
      const callAmount = Math.min(toCall, player.chipCount)
      player.chipCount -= callAmount
      player.currentBet += callAmount
      newState.pot += callAmount
      if (player.chipCount === 0) {
        player.isAllIn = true
      }
      break
      
    case 'raise':
      const raiseAmount = action.amount || (newState.currentBet * 2)
      const totalBet = raiseAmount
      const additionalBet = totalBet - player.currentBet
      player.chipCount -= additionalBet
      player.currentBet = totalBet
      newState.currentBet = totalBet
      newState.pot += additionalBet
      // Reset hasActed for other players since we raised
      newState.players.forEach((p, i) => {
        if (i !== newState.activePlayerIndex && !p.isFolded && !p.isAllIn) {
          p.hasActed = false
        }
      })
      if (player.chipCount === 0) {
        player.isAllIn = true
      }
      break
      
    case 'all_in':
      const allInAmount = player.chipCount
      player.currentBet += allInAmount
      newState.pot += allInAmount
      player.chipCount = 0
      player.isAllIn = true
      if (player.currentBet > newState.currentBet) {
        newState.currentBet = player.currentBet
        // Reset hasActed for others
        newState.players.forEach((p, i) => {
          if (i !== newState.activePlayerIndex && !p.isFolded && !p.isAllIn) {
            p.hasActed = false
          }
        })
      }
      break
  }
  
  player.hasActed = true
  
  // Move to next player
  advanceToNextPlayer(newState)
  
  // Check if round is complete
  if (isRoundComplete(newState)) {
    advanceRound(newState)
  }
  
  // Check if only one player remains
  const activePlayers = newState.players.filter(p => !p.isFolded)
  if (activePlayers.length === 1) {
    newState.isComplete = true
    newState.winnerId = activePlayers[0].agentId
  }
  
  return {
    newState,
    event: {
      type: 'PLAYER_ACTION',
      agentId: player.agentId,
      action,
    }
  }
}

/**
 * Advance to the next active player
 */
function advanceToNextPlayer(state: GameState): void {
  const playerCount = state.players.length
  let nextIndex = (state.activePlayerIndex + 1) % playerCount
  let attempts = 0
  
  while (attempts < playerCount) {
    const player = state.players[nextIndex]
    if (!player.isFolded && !player.isAllIn) {
      state.activePlayerIndex = nextIndex
      return
    }
    nextIndex = (nextIndex + 1) % playerCount
    attempts++
  }
  
  // If we get here, everyone is folded or all-in
  state.activePlayerIndex = -1
}

/**
 * Check if the current betting round is complete
 */
function isRoundComplete(state: GameState): boolean {
  const activePlayers = state.players.filter(p => !p.isFolded && !p.isAllIn)
  
  // If only one active player, round is complete
  if (activePlayers.length <= 1) {
    return true
  }
  
  // Check if all active players have acted and bets are equal
  return activePlayers.every(p => 
    p.hasActed && p.currentBet === state.currentBet
  )
}

/**
 * Advance to the next round (flop, turn, river, showdown)
 */
function advanceRound(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isFolded)
  
  // Reset for new round
  state.players.forEach(p => {
    p.hasActed = false
    p.currentBet = 0
  })
  state.currentBet = 0
  
  // Find first active player after dealer
  const dealerIndex = 0 // Simplified - always position 0 is dealer
  let firstActive = (dealerIndex + 1) % state.players.length
  while (state.players[firstActive].isFolded || state.players[firstActive].isAllIn) {
    firstActive = (firstActive + 1) % state.players.length
    if (firstActive === dealerIndex) break
  }
  state.activePlayerIndex = firstActive
  
  switch (state.round) {
    case 'preflop':
      const [flopCards, deckAfterFlop] = dealFlop(state.deck)
      state.communityCards = flopCards
      state.deck = deckAfterFlop
      state.round = 'flop'
      break
      
    case 'flop':
      const [turnCard, deckAfterTurn] = dealTurn(state.deck)
      state.communityCards.push(turnCard)
      state.deck = deckAfterTurn
      state.round = 'turn'
      break
      
    case 'turn':
      const [riverCard, deckAfterRiver] = dealRiver(state.deck)
      state.communityCards.push(riverCard)
      state.deck = deckAfterRiver
      state.round = 'river'
      break
      
    case 'river':
      // Showdown
      resolveShowdown(state)
      break
  }
}

/**
 * Resolve the showdown and determine winner(s)
 */
function resolveShowdown(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isFolded)
  
  if (activePlayers.length === 1) {
    state.winnerId = activePlayers[0].agentId
    state.isComplete = true
    return
  }
  
  const playerHands = activePlayers.map(p => ({
    playerId: p.agentId,
    holeCards: p.holeCards
  }))
  
  const winners: WinnerResult[] = determineWinners(playerHands, state.communityCards)
  
  // For now, just take first winner (TODO: handle split pots)
  if (winners.length > 0) {
    const winner = winners[0]
    state.winnerId = winner.playerId
    // Store winning hand description in a type-safe way
    const extended = state as GameState & { winningHand?: string }
    extended.winningHand = winner.hand.description
  }
  
  state.isComplete = true
}

/**
 * Get the current game status for display
 */
export function getGameStatus(state: GameState): {
  round: Round
  pot: number
  activePlayer: string | null
  communityCards: CardNotation[]
  isComplete: boolean
  winnerId?: string
} {
  const activePlayer = state.activePlayerIndex >= 0 
    ? state.players[state.activePlayerIndex]?.name 
    : null
    
  return {
    round: state.round,
    pot: state.pot,
    activePlayer,
    communityCards: state.communityCards,
    isComplete: state.isComplete,
    winnerId: state.winnerId,
  }
}

/**
 * Calculate betting odds for each player based on hand strength
 * This is used for spectator betting
 */
export function calculateOdds(state: GameState): { agentId: string; winProbability: number }[] {
  const activePlayers = state.players.filter(p => !p.isFolded)
  
  if (state.communityCards.length === 0) {
    // Preflop - simplified equity based on starting hands
    // In reality, we'd use Monte Carlo simulation
    return activePlayers.map(p => ({
      agentId: p.agentId,
      winProbability: 1 / activePlayers.length
    }))
  }
  
  // With community cards, evaluate current hands
  const evaluatedHands = activePlayers.map(p => ({
    agentId: p.agentId,
    hand: evaluateHand(p.holeCards, state.communityCards)
  }))
  
  // Calculate relative strengths
  const totalStrength = evaluatedHands.reduce(
    (sum, e) => sum + e.hand.rankValue, 0
  )
  
  return evaluatedHands.map(e => ({
    agentId: e.agentId,
    winProbability: e.hand.rankValue / totalStrength
  }))
}

/**
 * Convert win probability to betting odds (e.g., 0.5 -> 2.0x)
 */
export function probabilityToOdds(probability: number): number {
  if (probability <= 0) return 99.9
  const odds = 1 / probability
  return Math.min(99.9, Math.round(odds * 10) / 10)
}

