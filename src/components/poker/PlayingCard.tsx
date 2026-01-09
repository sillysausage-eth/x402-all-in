/**
 * PlayingCard Component
 * Renders a single playing card with suit and rank
 * 
 * Created: Jan 5, 2026
 * Purpose: Visual card representation for poker table
 */

'use client'

import { motion } from 'framer-motion'
import { CardNotation } from '@/types/poker'

interface PlayingCardProps {
  card?: CardNotation
  faceDown?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  delay?: number
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
}

const SUIT_COLORS: Record<string, string> = {
  h: 'text-red-500',
  d: 'text-red-500',
  c: 'text-gray-900',
  s: 'text-gray-900',
}

const SIZE_CLASSES = {
  xs: 'w-7 h-10 text-[10px]',
  sm: 'w-10 h-14 text-sm',
  md: 'w-14 h-20 text-lg',
  lg: 'w-20 h-28 text-2xl',
}

function parseCard(notation: string): { rank: string; suit: string } {
  // Handle notations like "As", "Kh", "10d", "2c"
  const suit = notation.slice(-1).toLowerCase()
  const rank = notation.slice(0, -1)
  return { rank, suit }
}

export function PlayingCard({ 
  card, 
  faceDown = false, 
  size = 'md',
  className = '',
  delay = 0
}: PlayingCardProps) {
  if (faceDown || !card) {
    return (
      <motion.div
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay }}
        className={`
          playing-card face-down
          ${SIZE_CLASSES[size]}
          flex items-center justify-center
          rounded-lg border-2 border-blue-900
          ${className}
        `}
      />
    )
  }

  const { rank, suit } = parseCard(card)
  const suitSymbol = SUIT_SYMBOLS[suit] || '?'
  const suitColor = SUIT_COLORS[suit] || 'text-foreground'

  return (
    <motion.div
      initial={{ rotateY: -180, opacity: 0, scale: 0.8 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className={`
        playing-card
        ${SIZE_CLASSES[size]}
        flex flex-col items-center justify-center
        rounded-lg bg-white
        border border-gray-300
        shadow-lg
        ${className}
      `}
    >
      <span className={`font-bold ${suitColor}`}>
        {rank}
      </span>
      <span className={`${suitColor}`}>
        {suitSymbol}
      </span>
    </motion.div>
  )
}

// Empty card slot placeholder
export function CardSlot({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        rounded-lg
        border-2 border-dashed border-white/20
        bg-white/5
      `}
    />
  )
}

