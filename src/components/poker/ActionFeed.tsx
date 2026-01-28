/**
 * ActionFeed Component
 * Real-time feed of game actions and agent decisions
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 10, 2026 - All-In Podcast theme: black & white informational design
 *                       - Consistent poker suit icons (♠ ♥ ♦ ♣)
 *                       - Clean, editorial aesthetic
 *                       - Gold accent only for winner
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

// Poker suit icons - all same size, consistent styling
const ActionIcon = ({ type }: { type: string }) => {
  // All poker suits for different actions
  const symbols: Record<string, string> = {
    fold: '♣',      // Clubs for fold (giving up)
    check: '♦',     // Diamonds for check (passive)
    call: '♥',      // Hearts for call (matching)
    raise: '♠',     // Spades for raise (aggressive)
    all_in: '♠',    // Spades for all-in (most aggressive)
    deal: '♦',      // Diamonds for deal
    win: '♠',       // Spades for winner
  }
  
  const symbol = symbols[type] || '♦'
  const isWinner = type === 'win'
  
  return (
    <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${
      isWinner ? 'text-emerald-400' : 'text-neutral-500'
    }`}>
      <span className="text-base">{symbol}</span>
    </div>
  )
}

// Monochrome text - gold accent only for winner name
const ACTION_COLORS: Record<string, string> = {
  fold: 'text-neutral-500',           // Dimmed for fold
  check: 'text-neutral-300',
  call: 'text-neutral-200',
  raise: 'text-white font-medium',    // Slightly emphasized
  all_in: 'text-white font-semibold', // More emphasized
  deal: 'text-neutral-500',
  win: 'text-emerald-400 font-semibold', // Green for winner
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
    <div className="bg-black rounded-xl border border-neutral-800 p-4">
      {/* Clean header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
        <h2 className="text-xs font-medium tracking-widest text-white uppercase">
          Live Action
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[320px]">
        <AnimatePresence mode="popLayout">
          {visibleActions.map((action, index) => {
            const isExpanded = expandedId === action.id
            const hasReasoning = action.reasoning && action.actionType !== 'win'
            const isWinner = action.actionType === 'win'
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                onClick={() => hasReasoning && toggleExpand(action.id)}
                className={`
                  py-2 border-b border-neutral-800/50 last:border-0
                  ${hasReasoning ? 'cursor-pointer hover:bg-neutral-900/50' : ''}
                  ${isWinner ? 'bg-neutral-900/30' : ''}
                `}
              >
                <div className="flex items-start gap-2">
                  {/* Icon */}
                  <ActionIcon type={action.actionType} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-sm font-medium ${isWinner ? 'text-emerald-400' : 'text-white'}`}>
                        {action.agentName}
                      </span>
                      <span className={`text-sm ${ACTION_COLORS[action.actionType] || 'text-neutral-500'}`}>
                        {formatAction(action)}
                      </span>
                    </div>

                    {/* Winner details */}
                    {isWinner && (action.winningHand || action.holeCards) && (
                      <div className="mt-1 flex items-center gap-2">
                        {action.winningHand && (
                          <span className="text-xs text-emerald-400/80">
                            {action.winningHand}
                          </span>
                        )}
                        {action.holeCards && action.holeCards.length > 0 && (
                          <span className="text-xs text-neutral-600">
                            [{action.holeCards.map(formatCard).join(' ')}]
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reasoning quote - expandable */}
                    {hasReasoning && (
                      <motion.div
                        initial={false}
                        animate={{ height: isExpanded ? 'auto' : '1.1rem' }}
                        className="overflow-hidden mt-1"
                      >
                        <p className={`text-xs text-neutral-500 italic ${!isExpanded ? 'truncate' : ''}`}>
                          &ldquo;{action.reasoning}&rdquo;
                        </p>
                      </motion.div>
                    )}
                    
                    {/* Expand hint */}
                    {hasReasoning && !isExpanded && action.reasoning && action.reasoning.length > 60 && (
                      <span className="text-[10px] text-neutral-600 mt-0.5 block">
                        more...
                      </span>
                    )}

                    {/* Timestamp and round */}
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-600">
                      <span>{formatTime(action.timestamp)}</span>
                      <span>·</span>
                      <span className="capitalize">{action.round}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {visibleActions.length === 0 && (
          <div className="text-center py-8">
            <div className="text-neutral-500 text-xs">Waiting for action...</div>
          </div>
        )}
      </div>
    </div>
  )
}

