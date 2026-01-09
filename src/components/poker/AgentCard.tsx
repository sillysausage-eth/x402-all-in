/**
 * AgentCard / PlayerBox Component
 * Displays AI agent info in horizontal corner layout
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 6, 2026 - Horizontal corner layout, separate action/bet indicators
 * Updated: Jan 6, 2026 - Added winner chip count animation with counting effect
 * Updated: Jan 6, 2026 - Fixed chip animation to use potWon prop, starts from pre-win amount
 * Updated: Jan 6, 2026 - Moved action pill inside player box with smart display logic
 *                       - Added folded/all-in visual states (dimmed box for folded)
 * Updated: Jan 7, 2026 - Moved winning hand description below player box for better visibility
 * Updated: Jan 9, 2026 - Removed D/SB/BB chips from avatar (moved to table)
 * Updated: Jan 9, 2026 - Removed BLIND from action badges (no need to show)
 *                       - Action badges now reset each betting round (except fold/all-in)
 * Updated: Jan 9, 2026 - Badges now reflect CURRENT STATE (Option B):
 *                       - RAISE only shows if player has betting lead
 *                       - CALL only shows if player matched current bet
 *                       - CHECK only shows if no one has bet
 *                       - Automatically resets when someone re-raises
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { PlayingCard } from './PlayingCard'
import { CardNotation, Round } from '@/types/poker'

// Agent colors by slug
const AGENT_COLORS: Record<string, { bg: string; border: string; active: string }> = {
  chamath: { bg: 'bg-purple-900/90', border: 'border-purple-500', active: 'ring-purple-400' },
  sacks: { bg: 'bg-blue-900/90', border: 'border-blue-500', active: 'ring-blue-400' },
  jason: { bg: 'bg-orange-900/90', border: 'border-orange-500', active: 'ring-orange-400' },
  friedberg: { bg: 'bg-teal-900/90', border: 'border-teal-500', active: 'ring-teal-400' },
}

interface PlayerBoxProps {
  name: string
  slug: string
  avatarUrl?: string
  chipCount: number
  playerBet?: number       // This player's current bet this round
  tableBet?: number        // The highest bet on the table this round
  holeCards?: CardNotation[]
  isFolded?: boolean
  isAllIn?: boolean
  isActive?: boolean
  isDealer?: boolean
  isSmallBlind?: boolean
  isBigBlind?: boolean
  isWinner?: boolean
  winningHand?: string
  lastActionType?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
  lastActionRound?: Round  // Which round the action was from
  currentRound?: Round     // Current betting round (for resetting badges)
  showCards?: boolean
  dealDelay?: number
  position?: 'top' | 'bottom'  // Optional, not used now that cards are inside box
  potWon?: number  // Amount won from the pot (for animation)
}

// Action indicator colors and labels - now includes compact styling for inside-box display
const ACTION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  fold: { label: 'FOLD', bg: 'bg-gray-600/90', text: 'text-gray-100', border: 'border-gray-500' },
  check: { label: 'CHECK', bg: 'bg-blue-600/90', text: 'text-blue-100', border: 'border-blue-400' },
  call: { label: 'CALL', bg: 'bg-green-600/90', text: 'text-green-100', border: 'border-green-400' },
  raise: { label: 'RAISE', bg: 'bg-orange-500/90', text: 'text-orange-100', border: 'border-orange-400' },
  all_in: { label: 'ALL-IN', bg: 'bg-red-500/90', text: 'text-white', border: 'border-red-400' },
  blind: { label: 'BLIND', bg: 'bg-amber-500/90', text: 'text-amber-100', border: 'border-amber-400' },
}

// Initials fallback
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function PlayerBox({
  name,
  slug,
  avatarUrl,
  chipCount,
  playerBet = 0,
  tableBet = 0,
  holeCards,
  isFolded = false,
  isAllIn = false,
  isActive = false,
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  isWinner = false,
  winningHand,
  lastActionType,
  lastActionRound,
  currentRound,
  showCards = true,
  dealDelay = 0,
  position,
  potWon = 0,
}: PlayerBoxProps) {
  const colors = AGENT_COLORS[slug] || AGENT_COLORS.chamath
  const actionConfig = lastActionType ? ACTION_CONFIG[lastActionType] : null
  
  // Smart action display logic - badges reflect CURRENT STATE, not history:
  // - BLIND: Never show
  // - FOLD/ALL-IN: Always show (terminal states)
  // - RAISE: Only if player has the betting lead (playerBet === tableBet AND tableBet > 0)
  // - CALL: Only if player matched the current bet (playerBet === tableBet AND they called)
  // - CHECK: Only if no one has bet (tableBet === 0)
  const shouldShowAction = (() => {
    if (!lastActionType) return false
    
    // Never show blind as an action
    if (lastActionType === 'blind') {
      return false
    }
    
    // Terminal states - always show
    if (lastActionType === 'fold' || lastActionType === 'all_in') {
      return true
    }
    
    // Must be from current round
    const isFromCurrentRound = lastActionRound === currentRound
    if (!isFromCurrentRound) return false
    
    // Don't show if it's their turn (they need to act)
    if (isActive) return false
    
    // RAISE: Only show if they still have the betting lead
    if (lastActionType === 'raise') {
      return playerBet === tableBet && tableBet > 0
    }
    
    // CALL: Only show if they've matched the current bet
    if (lastActionType === 'call') {
      return playerBet === tableBet
    }
    
    // CHECK: Only show if no one has bet this round
    if (lastActionType === 'check') {
      return tableBet === 0
    }
    
    return false
  })()
  
  // Track chip count animation
  const [displayedChipCount, setDisplayedChipCount] = useState(chipCount)
  const [isChipAnimating, setIsChipAnimating] = useState(false)
  const [chipDelta, setChipDelta] = useState(0)
  const prevIsWinner = useRef(false)
  const animationStartedRef = useRef(false)
  
  // Animated spring for smooth chip count transitions
  const animatedChips = useSpring(displayedChipCount, {
    stiffness: 50,
    damping: 20,
    mass: 1,
  })
  
  // Round the spring value for display
  const roundedChips = useTransform(animatedChips, (value) => Math.round(value))
  
  // Subscribe to rounded chip changes for display
  useEffect(() => {
    const unsubscribe = roundedChips.on('change', (value) => {
      setDisplayedChipCount(value)
    })
    return () => unsubscribe()
  }, [roundedChips])
  
  // Detect when player becomes winner and animate chip count
  useEffect(() => {
    // Player just became winner and potWon is set
    if (isWinner && !prevIsWinner.current && potWon > 0 && !animationStartedRef.current) {
      animationStartedRef.current = true
      
      // Calculate what chips were before winning - ensure it's not negative
      const startChips = Math.max(0, chipCount - potWon)
      // Only animate if the delta makes sense (positive and reasonable)
      const actualDelta = chipCount - startChips
      
      if (actualDelta > 0 && startChips >= 0) {
        setDisplayedChipCount(startChips)
        animatedChips.jump(startChips)
        setChipDelta(actualDelta)
        
        // Start animation after pot-to-winner animation completes (~1.5s)
        const animationTimer = setTimeout(() => {
          setIsChipAnimating(true)
          animatedChips.set(chipCount)
          
          // End the animation glow after counting completes
          const glowTimer = setTimeout(() => {
            setIsChipAnimating(false)
            setChipDelta(0)
          }, 1500)
          
          return () => clearTimeout(glowTimer)
        }, 1500)
        
        return () => clearTimeout(animationTimer)
      } else {
        // Invalid values - just show current chips without animation
        setDisplayedChipCount(chipCount)
        animatedChips.jump(chipCount)
      }
    }
    
    // Reset when no longer winner (new hand started)
    if (!isWinner && prevIsWinner.current) {
      animationStartedRef.current = false
      setIsChipAnimating(false)
      setChipDelta(0)
      // Also sync chip count when resetting
      setDisplayedChipCount(chipCount)
      animatedChips.jump(chipCount)
    }
    
    prevIsWinner.current = isWinner
  }, [isWinner, potWon, chipCount, animatedChips])
  
  // Sync chip count when not winner (instant update)
  useEffect(() => {
    if (!isWinner && !isChipAnimating) {
      animatedChips.jump(chipCount)
      setDisplayedChipCount(chipCount)
    }
  }, [chipCount, isWinner, isChipAnimating, animatedChips])
  
  return (
    <div className="flex flex-col">
      {/* Player info box - horizontal layout with cards inside */}
      <motion.div
        animate={{
          boxShadow: isActive 
            ? '0 0 20px rgba(234, 179, 8, 0.6)' 
            : isWinner 
              ? '0 0 25px rgba(234, 179, 8, 0.8)'
              : 'none',
          opacity: isFolded && !isWinner ? 0.6 : 1,
          filter: isFolded && !isWinner ? 'grayscale(0.5)' : 'grayscale(0)',
        }}
        transition={{ duration: 0.3 }}
        className={`
          relative flex items-center gap-3 px-3 py-2 rounded-xl
          ${colors.bg} border-2 ${isActive ? 'border-yellow-400' : isWinner ? 'border-yellow-400' : isFolded ? 'border-gray-600' : colors.border}
          backdrop-blur-sm shadow-lg
        `}
      >
        {/* Winner badge */}
        {isWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: [1, 1.1, 1] }}
            transition={{ scale: { repeat: Infinity, duration: 1.5 } }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded text-xs font-bold text-black whitespace-nowrap z-30"
          >
            WINNER!
          </motion.div>
        )}

        {/* Thinking indicator */}
        {isActive && !isWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-yellow-500/90 rounded text-[10px] font-bold text-black"
          >
            THINKING...
          </motion.div>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-white/20">
              <span className="text-sm font-bold text-white">{getInitials(name)}</span>
            </div>
          )}
        </div>

        {/* Name, chips, and action pill */}
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className={`text-sm font-semibold truncate ${isFolded ? 'text-gray-400' : 'text-white'}`}>{name}</span>
          <div className="flex items-center gap-1.5">
            <motion.span 
              animate={{
                scale: isChipAnimating ? [1, 1.15, 1] : 1,
                color: isChipAnimating 
                  ? ['#4ade80', '#86efac', '#4ade80'] 
                  : displayedChipCount === 0 ? '#f87171' : isFolded ? '#9ca3af' : '#4ade80',
              }}
              transition={{
                scale: { duration: 0.3, repeat: isChipAnimating ? 3 : 0 },
                color: { duration: 0.5, repeat: isChipAnimating ? 3 : 0 },
              }}
              className="text-sm font-bold"
            >
              ${displayedChipCount.toLocaleString()}
            </motion.span>
            
            {/* Chip delta indicator (shows +amount when winning) */}
            {isChipAnimating && chipDelta > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-5, -10, -10, -15], scale: 1 }}
                transition={{ duration: 1.5 }}
                className="text-xs font-bold text-green-300"
              >
                +${chipDelta.toLocaleString()}
              </motion.span>
            )}
            
            {/* Action pill - inside the box */}
            <AnimatePresence>
              {shouldShowAction && actionConfig && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: -5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -5 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    px-1.5 py-0.5 rounded text-[10px] font-bold uppercase
                    ${actionConfig.bg} ${actionConfig.text} border ${actionConfig.border}
                  `}
                >
                  {actionConfig.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hole Cards - inside the box */}
        <div className="flex gap-1 ml-auto">
          {showCards && holeCards && holeCards.length > 0 ? (
            holeCards.map((card, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: isFolded ? 0.4 : 1 }}
                transition={{ 
                  delay: dealDelay + i * 0.15,
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200
                }}
                className="relative"
              >
                <PlayingCard card={card} faceDown={false} size="xs" />
                {isFolded && i === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-red-400 bg-black/60 px-0.5 rounded">FOLD</span>
                  </div>
                )}
              </motion.div>
            ))
          ) : showCards ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: dealDelay, duration: 0.4, type: "spring" }}
              >
                <PlayingCard faceDown size="xs" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: dealDelay + 0.15, duration: 0.4, type: "spring" }}
              >
                <PlayingCard faceDown size="xs" />
              </motion.div>
            </>
          ) : null}
        </div>
      </motion.div>
      
      {/* Winning hand description - shown below the box for visibility */}
      <AnimatePresence>
        {isWinner && winningHand && (
          <motion.div
            key="winning-hand"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-600/90 to-amber-500/90 rounded-lg text-sm text-white font-bold text-center whitespace-nowrap shadow-lg"
          >
            {winningHand}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Bet chip to show on the table (current round bet amount)
export function BetChip({ amount }: { amount: number }) {
  if (!amount || amount <= 0) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 rounded-full shadow-xl border border-white/20"
    >
      {/* Chip stack visual */}
      <div className="flex -space-x-1">
        <div className="w-4 h-4 rounded-full bg-red-500 border border-red-300" />
        <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-300" />
      </div>
      <span className="text-sm font-bold text-white">${amount}</span>
    </motion.div>
  )
}

// Legacy export for compatibility
export { PlayerBox as AgentCard }

// Action chip export (kept for potential use elsewhere)
export function ActionChip({ 
  actionType, 
  amount 
}: { 
  actionType?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
  amount?: number 
}) {
  if (!actionType) return null
  
  const config = ACTION_CONFIG[actionType] || ACTION_CONFIG.check
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-3 py-1.5 rounded-lg ${config.bg} text-xs font-bold ${config.text} shadow-xl`}
    >
      {config.label}
      {amount && amount > 0 && ` $${amount}`}
    </motion.div>
  )
}
