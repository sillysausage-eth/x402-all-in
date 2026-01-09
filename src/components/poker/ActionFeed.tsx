/**
 * ActionFeed Component
 * Real-time feed of game actions and agent decisions
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 7, 2026 - Added winner display with cards and pot amount
 * Updated: Jan 9, 2026 - Cleaner design: removed emojis, expandable cards for full reasoning
 *                       - Reduced color palette, poker-themed minimal icons
 * Updated: Jan 9, 2026 - Consistent neutral icons (w-8 h-8), only winner gets gold
 *                       - All text white except winner (gold), using boldness for emphasis
 *                       - Constrained height (max-h-[320px]) to align with table
 * Purpose: Show live poker action with agent reasoning
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActionType, Round, CardNotation } from '@/types/poker'

interface ActionItem {
  id: string
  agentName: string
  agentSlug: string
  actionType: ActionType | 'deal' | 'win'
  amount?: number
  reasoning?: string
  round: Round
  timestamp: string
  // Winner-specific fields
  winningHand?: string      // e.g. "Full House, Sevens over Aces"
  holeCards?: CardNotation[] // Winner's hole cards
  potAmount?: number         // Total pot won
}

interface ActionFeedProps {
  actions: ActionItem[]
  maxItems?: number
}

// Minimal poker-themed icons - consistent neutral styling, only winner gets gold
const ActionIcon = ({ type }: { type: string }) => {
  const symbols: Record<string, string> = {
    fold: '×',
    check: '−',
    call: '=',
    raise: '↑',
    all_in: '★',
    deal: '•',
    win: '♠',
  }
  
  const symbol = symbols[type] || '•'
  const isWinner = type === 'win'
  
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
      isWinner ? 'bg-accent-gold' : 'bg-neutral-700/80'
    }`}>
      <span className={`text-base font-bold ${isWinner ? 'text-black' : 'text-white'}`}>
        {symbol}
      </span>
    </div>
  )
}

// All white text except winner - use boldness for emphasis instead of color
const ACTION_COLORS: Record<string, string> = {
  fold: 'text-neutral-400',           // Dimmed for fold (less important)
  check: 'text-white',
  call: 'text-white',
  raise: 'text-white font-semibold',  // Bold for raises
  all_in: 'text-white font-bold',     // Extra bold for all-in
  deal: 'text-neutral-500',
  win: 'text-accent-gold font-bold',  // Only winner gets color
}

// Agent names in white with varying weights for distinction
const AGENT_COLORS: Record<string, string> = {
  chamath: 'text-white',
  sacks: 'text-white',
  jason: 'text-white',
  friedberg: 'text-white',
}

// Format card notation for display (e.g., "7♠" from "7s")
function formatCard(card: CardNotation): string {
  const suitSymbols: Record<string, string> = {
    's': '♠', 'h': '♥', 'd': '♦', 'c': '♣'
  }
  const rank = card.slice(0, -1)
  const suit = card.slice(-1).toLowerCase()
  return `${rank}${suitSymbols[suit] || suit}`
}

function formatAction(action: ActionItem): string {
  switch (action.actionType) {
    case 'fold':
      return 'folds'
    case 'check':
      return 'checks'
    case 'call':
      return action.amount ? `calls $${action.amount}` : 'calls'
    case 'raise':
      return action.amount ? `raises to $${action.amount}` : 'raises'
    case 'all_in':
      return action.amount ? `goes ALL IN for $${action.amount}` : 'goes ALL IN'
    case 'deal':
      return 'cards dealt'
    case 'win':
      return action.potAmount ? `wins $${action.potAmount}!` : 'wins!'
    default:
      return action.actionType
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  })
}

export function ActionFeed({ actions, maxItems = 10 }: ActionFeedProps) {
  const visibleActions = actions.slice(0, maxItems)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="bg-background-card rounded-2xl border border-border p-4">
      <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
        LIVE ACTION
      </h2>

      <div className="space-y-2 overflow-y-auto max-h-[320px]">
        <AnimatePresence mode="popLayout">
          {visibleActions.map((action, index) => {
            const isExpanded = expandedId === action.id
            const hasReasoning = action.reasoning && action.actionType !== 'win'
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => hasReasoning && toggleExpand(action.id)}
                className={`
                  p-3 bg-background-secondary rounded-xl
                  ${hasReasoning ? 'cursor-pointer hover:bg-background-secondary/80' : ''}
                  transition-colors
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <ActionIcon type={action.actionType} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`font-semibold ${AGENT_COLORS[action.agentSlug] || 'text-white'}`}>
                        {action.agentName}
                      </span>
                      <span className={ACTION_COLORS[action.actionType] || 'text-white'}>
                        {formatAction(action)}
                      </span>
                    </div>

                    {/* Winner details: hand + cards */}
                    {action.actionType === 'win' && (action.winningHand || action.holeCards) && (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {action.winningHand && (
                          <span className="text-sm font-medium text-accent-gold">
                            {action.winningHand}
                          </span>
                        )}
                        {action.holeCards && action.holeCards.length > 0 && (
                          <span className="text-sm text-neutral-400">
                            [{action.holeCards.map(formatCard).join(' ')}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reasoning quote - expandable */}
                    {hasReasoning && (
                      <motion.div
                        initial={false}
                        animate={{ height: isExpanded ? 'auto' : '1.5rem' }}
                        className="overflow-hidden mt-1"
                      >
                        <p className={`text-sm text-neutral-300 italic ${!isExpanded ? 'truncate' : ''}`}>
                          &ldquo;{action.reasoning}&rdquo;
                        </p>
                      </motion.div>
                    )}
                    
                    {/* Expand hint */}
                    {hasReasoning && !isExpanded && action.reasoning && action.reasoning.length > 60 && (
                      <span className="text-xs text-neutral-500 mt-0.5 block">
                        Click to expand
                      </span>
                    )}

                    {/* Timestamp and round */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      <span>{formatTime(action.timestamp)}</span>
                      <span>•</span>
                      <span className="capitalize">{action.round}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {visibleActions.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            Waiting for game to start...
          </div>
        )}
      </div>
    </div>
  )
}

