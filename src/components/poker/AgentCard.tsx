/**
 * AgentCard / PlayerBox Component
 * Displays AI agent info in horizontal corner layout
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 10, 2026 - MAJOR REDESIGN: All-In Podcast theme
 *                       - Unified neutral color scheme (no distinct player colors)
 *                       - Larger headshots (w-14 h-14) with full face + shoulders
 *                       - Larger cards (sm size instead of xs)
 *                       - Monochrome action badges
 *                       - Gold accents only for winner name/title
 *                       - Classy, premium aesthetic
 * Updated: Jan 10, 2026 - Added isEliminated prop for 25-hand game support
 *                       - Eliminated agents show grayscale effect
 * Updated: Jan 10, 2026 - Moved eliminated indicator to action pill
 *                       - Removed floating eliminated badge above player box
 * Updated: Jan 10, 2026 - Eliminated players show no cards (not even face-down)
 *                       - Clear ELIMINATED badge always visible for bust players
 * Updated: Jan 12, 2026 - Simplified BUST badge (removed skull emoji)
 * Updated: Jan 23, 2026 - Made component 25% larger for better card visibility
 *                       - Avatar: w-14 → w-[72px]
 *                       - Cards: sm → md size
 *                       - Text: text-base → text-lg for name
 *                       - Padding: px-4 py-3 → px-5 py-4
 * Updated: Jan 26, 2026 - Enhanced action pill visibility
 *                       - Larger pills (text-[10px] → text-xs)
 *                       - Pop animation on appear (scale 1.3 → 1)
 *                       - Pulse glow effect after appearing
 *                       - Better visual emphasis on player decisions
 * Updated: Jan 26, 2026 - Added handResolved prop for winner display
 *                       - Hides action badges when hand has a winner
 *                       - Greys out losers (like folded players) to highlight winner
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { PlayingCard } from './PlayingCard'
import { CardNotation, Round } from '@/types/poker'

// Unified neutral styling for all players (no distinct colors)
const PLAYER_STYLE = {
  bg: 'bg-neutral-900/95',
  border: 'border-neutral-700',
  activeBorder: 'border-emerald-500',
  winnerBorder: 'border-emerald-400',
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
  isEliminated?: boolean   // Player has 0 chips - out of the game
  handResolved?: boolean   // True when hand has a winner - hides badges, greys out losers
  winningHand?: string
  lastActionType?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
  lastActionRound?: Round  // Which round the action was from
  currentRound?: Round     // Current betting round (for resetting badges)
  showCards?: boolean
  dealDelay?: number
  position?: 'top' | 'bottom'  // Optional, not used now that cards are inside box
  potWon?: number  // Amount won from the pot (for animation)
}

// Action badges - bolder design for better visibility
const ACTION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; glow?: string }> = {
  fold: { label: 'FOLD', bg: 'bg-neutral-600', text: 'text-neutral-300', border: 'border-neutral-500', glow: 'shadow-neutral-500/30' },
  check: { label: 'CHECK', bg: 'bg-emerald-700/90', text: 'text-emerald-100', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/40' },
  call: { label: 'CALL', bg: 'bg-blue-600/90', text: 'text-white', border: 'border-blue-400/50', glow: 'shadow-blue-500/40' },
  raise: { label: 'RAISE', bg: 'bg-amber-600/90', text: 'text-white', border: 'border-amber-400/50', glow: 'shadow-amber-500/50' },
  all_in: { label: 'ALL-IN', bg: 'bg-red-600/90', text: 'text-white', border: 'border-red-400/50', glow: 'shadow-red-500/50' },
  blind: { label: 'BLIND', bg: 'bg-neutral-700/90', text: 'text-neutral-300', border: 'border-neutral-600' },
  eliminated: { label: 'BUST', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
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
  isEliminated = false,
  handResolved = false,
  winningHand,
  lastActionType,
  lastActionRound,
  currentRound,
  showCards = true,
  dealDelay = 0,
  position,
  potWon = 0,
}: PlayerBoxProps) {
  // Derived state: eliminated takes precedence over everything
  const isOutOfGame = isEliminated || chipCount <= 0
  
  // For eliminated players, always show eliminated badge
  const actionConfig = isOutOfGame && !isWinner 
    ? ACTION_CONFIG.eliminated 
    : (lastActionType ? ACTION_CONFIG[lastActionType] : null)
  
  // Smart action display logic - badges reflect CURRENT STATE, not history:
  // - HAND RESOLVED: Hide all action badges (winner is shown separately)
  // - ELIMINATED: Always show for eliminated players
  // - BLIND: Never show
  // - FOLD/ALL-IN: Always show (terminal states)
  // - RAISE: Only if player has the betting lead (playerBet === tableBet AND tableBet > 0)
  // - CALL: Only if player matched the current bet (playerBet === tableBet AND they called)
  // - CHECK: Only if no one has bet (tableBet === 0)
  const shouldShowAction = (() => {
    // When hand is resolved, hide all action badges (except eliminated)
    if (handResolved && !(isOutOfGame && !isWinner)) return false
    
    // Eliminated players always show eliminated badge
    if (isOutOfGame && !isWinner) return true
    
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
  
  // Determine if this player should be dimmed (folded, eliminated, or loser when hand resolved)
  const shouldDim = !isWinner && (isFolded || isOutOfGame || handResolved)
  
  return (
    <div className="flex flex-col">
      {/* Player info box - premium design with larger elements (25% bigger Jan 23, 2026) */}
      <motion.div
        animate={{
          boxShadow: isActive 
            ? '0 0 24px rgba(251, 191, 36, 0.4)' 
            : isWinner 
              ? '0 0 30px rgba(251, 191, 36, 0.5)'
              : '0 4px 20px rgba(0, 0, 0, 0.4)',
          opacity: shouldDim ? 0.4 : 1,
          filter: shouldDim ? 'grayscale(0.8)' : 'grayscale(0)',
        }}
        transition={{ duration: 0.3 }}
        className={`
          relative flex items-center gap-5 px-5 py-4 rounded-2xl
          ${PLAYER_STYLE.bg} border-2 
          ${isActive ? PLAYER_STYLE.activeBorder : isWinner ? PLAYER_STYLE.winnerBorder : shouldDim ? 'border-neutral-800' : PLAYER_STYLE.border}
          backdrop-blur-md
        `}
      >
        {/* Winner badge - elegant gold text */}
        {isWinner && !isOutOfGame && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 z-30"
          >
            <motion.span
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs font-bold tracking-widest text-emerald-400"
            >
              ♠ WINNER ♠
            </motion.span>
          </motion.div>
        )}

        {/* Thinking indicator */}
        {isActive && !isWinner && !isOutOfGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2"
          >
            <span className="text-[10px] font-bold tracking-wider text-neutral-400">
              THINKING...
            </span>
          </motion.div>
        )}

        {/* Avatar - larger with subtle ring (scaled up 25%) */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <div className={`relative w-[72px] h-[72px] rounded-full overflow-hidden ring-2 ${isWinner ? 'ring-emerald-400' : isActive ? 'ring-emerald-500/50' : 'ring-neutral-600'}`}>
              <Image 
                src={avatarUrl} 
                alt={name} 
                fill
                className="object-cover object-top"
                sizes="72px"
              />
            </div>
          ) : (
            <div className={`w-[72px] h-[72px] rounded-full bg-neutral-800 flex items-center justify-center ring-2 ${isWinner ? 'ring-emerald-400' : 'ring-neutral-600'}`}>
              <span className="text-xl font-bold text-neutral-400">{getInitials(name)}</span>
            </div>
          )}
        </div>

        {/* Name, chips, and action pill */}
        <div className="flex flex-col min-w-0 gap-1.5">
          {/* Name - green accent for winner only (scaled up) */}
          <span className={`text-lg font-bold truncate ${isWinner ? 'text-emerald-400' : isFolded ? 'text-neutral-500' : 'text-white'}`}>
            {name}
          </span>
          <div className="flex items-center gap-2">
            {/* Chip count (scaled up) */}
            <motion.span 
              animate={{
                scale: isChipAnimating ? [1, 1.1, 1] : 1,
              }}
              transition={{
                scale: { duration: 0.3, repeat: isChipAnimating ? 3 : 0 },
              }}
              className={`text-base font-semibold ${
                isChipAnimating ? 'text-emerald-400' : 
                displayedChipCount === 0 ? 'text-red-400' : 
                isFolded ? 'text-neutral-500' : 'text-emerald-400'
              }`}
            >
              ${displayedChipCount.toLocaleString()}
            </motion.span>
            
            {/* Chip delta indicator (shows +amount when winning) */}
            {isChipAnimating && chipDelta > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-2, -8, -8, -12], scale: 1 }}
                transition={{ duration: 1.5 }}
                className="text-xs font-bold text-emerald-300"
              >
                +${chipDelta.toLocaleString()}
              </motion.span>
            )}
            
            {/* Action pill - enhanced visibility with pop animation and glow */}
            <AnimatePresence>
              {shouldShowAction && actionConfig && (
                <motion.span
                  initial={{ opacity: 0, scale: 1.3, y: -4 }}
                  animate={{ 
                    opacity: 1, 
                    scale: [1.3, 0.95, 1.05, 1],
                    y: 0,
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 4 }}
                  transition={{ 
                    duration: 0.4,
                    scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }, // Bouncy spring
                  }}
                  className={`
                    px-2.5 py-1 rounded-md text-xs font-bold tracking-wide
                    ${actionConfig.bg} ${actionConfig.text} border ${actionConfig.border}
                    ${actionConfig.glow ? `shadow-lg ${actionConfig.glow}` : ''}
                    animate-action-pulse
                  `}
                >
                  {actionConfig.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hole Cards - medium size for better readability (scaled up 25%) */}
        {/* Eliminated players show no cards at all */}
        <div className="flex gap-2 ml-auto">
          {isOutOfGame ? (
            /* No cards for eliminated players - empty space */
            <div className="w-[116px] h-[80px]" /> /* Placeholder to maintain layout (md card size) */
          ) : showCards && holeCards && holeCards.length > 0 ? (
            holeCards.map((card, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: isFolded ? 0.35 : 1 }}
                transition={{ 
                  delay: dealDelay + i * 0.15,
                  duration: 0.4,
                  type: "spring",
                  stiffness: 200
                }}
                className="relative"
              >
                <PlayingCard card={card} faceDown={false} size="md" />
                {isFolded && i === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    <span className="text-xs font-bold text-neutral-400">FOLD</span>
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
                <PlayingCard faceDown size="md" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: dealDelay + 0.15, duration: 0.4, type: "spring" }}
              >
                <PlayingCard faceDown size="md" />
              </motion.div>
            </>
          ) : null}
        </div>
      </motion.div>
      
      {/* Winning hand description - elegant gold text below box */}
      <AnimatePresence>
        {isWinner && winningHand && (
          <motion.div
            key="winning-hand"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="mt-2 text-center"
          >
            <span className="text-sm font-semibold text-emerald-400/90">
              {winningHand}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Bet chip to show on the table - classy casino aesthetic
export function BetChip({ amount }: { amount: number }) {
  if (!amount || amount <= 0) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 rounded-full shadow-xl border border-neutral-700"
    >
      {/* Chip stack - classy casino colors (ivory, burgundy, navy) */}
      <div className="flex -space-x-1.5">
        <div className="w-4 h-4 rounded-full bg-[#8B0000] border border-[#A52A2A] shadow-sm" /> {/* Burgundy */}
        <div className="w-4 h-4 rounded-full bg-[#F5F5DC] border border-[#D4C896] shadow-sm" /> {/* Ivory */}
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
