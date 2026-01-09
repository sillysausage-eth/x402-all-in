/**
 * AI Agent Decision Making
 * Uses Claude to generate poker decisions for AI agents
 * 
 * Created: Jan 6, 2026
 * Purpose: Generate intelligent poker decisions with personality-driven reasoning
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { DecisionContext, AgentDecision, OpponentState, RecentAction } from '@/types/agents'
import { AGENT_PERSONALITIES, POKER_BASE_PROMPT } from '@/types/agents'
import type { PlayerAction, ActionType } from '@/types/poker'

// Build the decision prompt for Claude
function buildDecisionPrompt(context: DecisionContext, agentSlug: string): string {
  const personality = AGENT_PERSONALITIES[agentSlug]
  if (!personality) {
    throw new Error(`Unknown agent: ${agentSlug}`)
  }

  const positionDescription = getPositionDescription(context.position)
  const handStrength = describeHoleCards(context.holeCards)
  const boardDescription = describeCommunityCards(context.communityCards, context.round)
  const opponentsDescription = describeOpponents(context.opponents)
  const potOdds = calculatePotOdds(context)

  return `You are playing Texas Hold'em poker. Here's the current situation:

## Your Cards
${handStrength}
Hole cards: ${context.holeCards.join(', ')}

## Board
${boardDescription}
${context.communityCards.length > 0 ? `Community cards: ${context.communityCards.join(', ')}` : 'No community cards yet (preflop)'}

## Position & Betting
- Your position: ${positionDescription}
- Current round: ${context.round.toUpperCase()}
- Pot size: $${context.pot}
- Bet to call: $${context.betToCall}
- Minimum raise: $${context.minRaise}
- Your chip stack: $${context.chipCount}
- Your current bet this round: $${context.currentBet}
- Pot odds: ${potOdds}

## Opponents
${opponentsDescription}

## Recent Actions
${context.recentActions.length > 0 
  ? context.recentActions.map(a => `- ${a.agentName}: ${a.action.type}${a.action.amount ? ` $${a.action.amount}` : ''}`).join('\n')
  : 'No actions yet this round.'}

## Your Decision
What's your play?

${context.betToCall > 0 && context.betToCall <= context.chipCount 
  ? `NOTE: To stay in the hand, you only need to CALL $${context.betToCall}. You do NOT need to go all-in unless you want to put maximum pressure.`
  : ''}

Respond in JSON:
{
  "action": "fold" | "check" | "call" | "raise" | "all_in",
  "amount": <number if raising, otherwise null>,
  "reasoning": "<your thought process>",
  "confidence": <0.0 to 1.0>
}

Available actions:
${context.betToCall === 0 ? '- check (no cost to see more cards)' : ''}
${context.betToCall > 0 && context.betToCall <= context.chipCount ? `- call $${context.betToCall} (match the bet to stay in, leaves you with $${context.chipCount - context.betToCall})` : ''}
${context.chipCount > context.betToCall ? `- raise ($${context.minRaise} to $${context.chipCount})` : ''}
- fold (exit the hand)
${context.betToCall > context.chipCount ? `- all_in $${context.chipCount} (bet everything - required to stay in since you can't afford the full call)` : ''}`
}

function getPositionDescription(position: DecisionContext['position']): string {
  const descriptions: Record<string, string> = {
    'small_blind': 'Small Blind (early position, forced bet)',
    'big_blind': 'Big Blind (early position, forced bet)',
    'early': 'Early Position (act first, disadvantage)',
    'middle': 'Middle Position (moderate information)',
    'late': 'Late Position (good information)',
    'button': 'Button/Dealer (best position, act last)',
  }
  return descriptions[position] || position
}

function describeHoleCards(cards: string[]): string {
  if (cards.length !== 2) return 'Unknown hand'
  
  const [card1, card2] = cards
  const rank1 = card1.slice(0, -1)
  const rank2 = card2.slice(0, -1)
  const suit1 = card1.slice(-1)
  const suit2 = card2.slice(-1)
  
  const isPair = rank1 === rank2
  const isSuited = suit1 === suit2
  const isConnected = Math.abs(getRankValue(rank1) - getRankValue(rank2)) === 1
  
  let strength = ''
  if (isPair) {
    if (['A', 'K', 'Q', 'J'].includes(rank1)) strength = 'Premium pair'
    else if (['10', '9', '8'].includes(rank1)) strength = 'Medium pair'
    else strength = 'Small pair'
  } else if (['A', 'K'].includes(rank1) && ['A', 'K'].includes(rank2)) {
    strength = 'Premium high cards'
  } else if (isSuited && isConnected) {
    strength = 'Suited connector'
  } else if (isSuited) {
    strength = 'Suited cards'
  } else if (isConnected) {
    strength = 'Connected cards'
  } else {
    strength = 'Mixed hand'
  }
  
  return `${strength}${isSuited ? ' (suited)' : ''}${isPair ? '' : isConnected ? ' (connected)' : ''}`
}

function getRankValue(rank: string): number {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  }
  return values[rank] || 0
}

function describeCommunityCards(cards: string[], round: string): string {
  if (cards.length === 0) return 'Preflop - no community cards yet.'
  
  const suits = cards.map(c => c.slice(-1))
  const ranks = cards.map(c => c.slice(0, -1))
  
  const flushDraw = new Set(suits).size <= 2 && suits.length >= 3
  const straightPossible = hasSequentialRanks(ranks)
  const paired = ranks.length !== new Set(ranks).size
  
  let description = `${round.charAt(0).toUpperCase() + round.slice(1)} board: `
  if (paired) description += 'Paired board (full house/trips possible). '
  if (flushDraw) description += 'Flush draw possible. '
  if (straightPossible) description += 'Straight possibilities on board. '
  
  return description || `${round.charAt(0).toUpperCase() + round.slice(1)} board with mixed cards.`
}

function hasSequentialRanks(ranks: string[]): boolean {
  const values = ranks.map(getRankValue).sort((a, b) => a - b)
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] <= 2) return true
  }
  return false
}

function describeOpponents(opponents: DecisionContext['opponents']): string {
  if (opponents.length === 0) return 'No opponents remaining.'
  
  const active = opponents.filter(o => !o.isFolded)
  const allIn = opponents.filter(o => o.isAllIn)
  
  let description = `${active.length} opponent(s) still in hand:\n`
  for (const opp of active) {
    description += `- ${opp.name}: $${opp.chipCount} stack`
    if (opp.currentBet > 0) description += `, $${opp.currentBet} bet`
    if (opp.isAllIn) description += ' (ALL IN)'
    description += '\n'
  }
  
  return description
}

function calculatePotOdds(context: DecisionContext): string {
  if (context.betToCall === 0) return 'N/A (no bet to call)'
  
  const potOdds = context.betToCall / (context.pot + context.betToCall)
  const percentage = (potOdds * 100).toFixed(1)
  const ratio = (1 / potOdds).toFixed(1)
  
  return `${percentage}% (${ratio}:1)`
}

// Parse Claude's response into a structured decision
function parseDecision(response: string, validActions: ActionType[]): AgentDecision {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    // Clean up common AI mistakes in JSON (like $600 instead of 600)
    let jsonStr = jsonMatch[0]
    jsonStr = jsonStr.replace(/"amount":\s*\$(\d+)/g, '"amount": $1') // Fix $600 → 600
    jsonStr = jsonStr.replace(/"amount":\s*"?\$?(\d+)"?/g, '"amount": $1') // Fix "$600" → 600
    
    const parsed = JSON.parse(jsonStr)
    
    // Validate action
    let action: PlayerAction = { type: 'fold' }
    const actionType = parsed.action?.toLowerCase() as ActionType
    
    if (!validActions.includes(actionType)) {
      // Smart fallback: if AI said "call" but there's nothing to call, convert to "check"
      if (actionType === 'call' && validActions.includes('check')) {
        console.info(`Converting invalid "call" to "check" (no bet to call)`)
        action = { type: 'check', reasoning: parsed.reasoning }
      } else {
        console.warn(`Invalid action ${actionType}, defaulting to fold`)
        action = { type: 'fold' }
      }
    } else {
      action = {
        type: actionType,
        amount: actionType === 'raise' ? parsed.amount : undefined,
        reasoning: parsed.reasoning,
      }
    }
    
    return {
      action,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      internalThoughts: parsed.reasoning || 'Thinking...',
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error, response)
    // Return a safe default
    return {
      action: { type: 'fold', reasoning: 'Error processing decision' },
      confidence: 0,
      internalThoughts: 'Something went wrong with my analysis...',
    }
  }
}

/**
 * Get a poker decision from an AI agent
 */
export async function getAgentDecision(
  context: DecisionContext,
  agentSlug: string
): Promise<AgentDecision> {
  const personality = AGENT_PERSONALITIES[agentSlug]
  if (!personality) {
    throw new Error(`Unknown agent: ${agentSlug}`)
  }

  // Determine valid actions based on current situation
  const validActions: ActionType[] = ['fold']
  
  // Check is only valid if no bet to call
  if (context.betToCall === 0) validActions.push('check')
  
  // Call is valid if there's a bet and you can afford it
  if (context.betToCall > 0 && context.betToCall <= context.chipCount) validActions.push('call')
  
  // Raise is valid if you have more chips than needed to call
  if (context.chipCount > context.betToCall) validActions.push('raise')
  
  // All-in is valid but should only be used when necessary or strategically appropriate
  // Don't offer all_in if call is available and would leave significant chips
  const chipsAfterCall = context.chipCount - context.betToCall
  const shouldOfferAllIn = context.chipCount > 0 && (
    context.betToCall > context.chipCount ||  // Can't afford to call, must all-in
    chipsAfterCall <= 50 ||  // Very short-stacked after call
    context.chipCount <= context.betToCall * 1.5  // All-in is close to calling anyway
  )
  if (shouldOfferAllIn) validActions.push('all_in')

  const prompt = buildDecisionPrompt(context, agentSlug)

  try {
    // Combine base poker rules with personality
    const systemPrompt = `${POKER_BASE_PROMPT}\n\nYour personality:\n${personality.systemPrompt}`
    
    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      system: systemPrompt,
      prompt,
    })

    return parseDecision(text, validActions)
  } catch (error) {
    console.error(`AI decision error for ${agentSlug}:`, error)
    
    // Fallback: make a simple decision based on play style
    return makeFallbackDecision(context, personality.playStyle, validActions)
  }
}

/**
 * Fallback decision when AI fails
 */
function makeFallbackDecision(
  context: DecisionContext,
  playStyle: { aggression: number; tightness: number; bluffFrequency: number },
  validActions: ActionType[]
): AgentDecision {
  const random = Math.random()
  
  // Simple heuristic based on play style
  if (context.betToCall === 0) {
    // Can check
    if (random < playStyle.aggression * 0.5) {
      return {
        action: { type: 'raise', amount: context.minRaise },
        confidence: 0.5,
        internalThoughts: 'Taking an aggressive line here.',
      }
    }
    return {
      action: { type: 'check' },
      confidence: 0.6,
      internalThoughts: 'Checking to see what develops.',
    }
  }
  
  // Must call or fold
  const callThreshold = 1 - playStyle.tightness
  if (random < callThreshold && validActions.includes('call')) {
    return {
      action: { type: 'call' },
      confidence: 0.5,
      internalThoughts: 'The price is right to continue.',
    }
  }
  
  return {
    action: { type: 'fold' },
    confidence: 0.4,
    internalThoughts: 'Not worth the risk this time.',
  }
}

/**
 * Get commentary from an agent about the current game state
 * Used for the action feed when an agent makes a move
 */
export async function getAgentCommentary(
  agentSlug: string,
  action: PlayerAction,
  context: Partial<DecisionContext>
): Promise<string> {
  const personality = AGENT_PERSONALITIES[agentSlug]
  if (!personality) return 'Making a move...'

  // If we already have reasoning, use it
  if (action.reasoning) return action.reasoning

  // Generate quick commentary
  try {
    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      system: personality.systemPrompt,
      prompt: `You just ${action.type}${action.amount ? `ed $${action.amount}` : 'ed'} in a poker hand. 
Give a brief, in-character one-liner comment (max 15 words) about this decision. 
Don't explain the poker strategy, just say something that fits your personality.
Respond with just the quote, no quotes or attribution.`,
    })

    return text.trim().replace(/^["']|["']$/g, '')
  } catch {
    // Fallback commentary
    const fallbacks: Record<ActionType, string[]> = {
      fold: ['Not my hand.', 'I\'ll wait for a better spot.', 'Discretion is the better part of valor.'],
      check: ['Let\'s see what happens.', 'I\'ll take a free card.', 'No need to build the pot yet.'],
      call: ['I\'m in.', 'Let\'s see where this goes.', 'The math works.'],
      raise: ['Time to apply pressure.', 'Let\'s make this interesting.', 'I like my hand here.'],
      all_in: ['All in. Let\'s go.', 'I\'m putting you to the test.', 'Ship it.'],
    }
    const options = fallbacks[action.type] || ['Making a move.']
    return options[Math.floor(Math.random() * options.length)]
  }
}

