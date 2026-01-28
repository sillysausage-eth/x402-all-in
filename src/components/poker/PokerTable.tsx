/**
 * PokerTable Component
 * Main poker table visualization with agents, cards, and pot
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 6, 2026 - Corner layout, horizontal player boxes, separate action/bet indicators
 * Updated: Jan 7, 2026 - CRITICAL FIX: showWinAnimation stuck at true bug
 * Updated: Jan 7, 2026 - Chip display improvements:
 *                      - Bet chips positioned closer to each player's box
 *                      - Instant transition of bets to pot between rounds
 *                      - Pot animates to winner over 1s with chip trail
 *                      - Pot displays $0 after winner animation completes
 * Updated: Jan 9, 2026 - Moved D/SB/BB chips to table (in front of players)
 *                      - Removed round indicator (moved to page header)
 *                      - Increased table height by ~20% for better spacing
 * Updated: Jan 9, 2026 - Pass tableBet to PlayerBox for smart badge display
 * Updated: Jan 10, 2026 - Added isEliminated prop support for bust players
 *                       - Eliminated players still show at table but with ELIMINATED badge
 *                       - Skip eliminated players from active play (via game engine)
 * Updated: Jan 26, 2026 - Added round-ending pause before dealing next cards
 *                       - Shows "BETTING CLOSED" indicator during transition
 *                       - 1.5s delay allows viewers to see the last action
 *                       - Pass delayedRound to PlayerBox so badges stay visible during transition
 *                       - Pass handResolved to grey out losers and hide badges when winner shown
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayerBox, BetChip } from './AgentCard'
import { PlayingCard, CardSlot } from './PlayingCard'
import { CardNotation, Round } from '@/types/poker'

interface Agent {
  id: string
  name: string
  slug: string
  avatarUrl?: string
  chipCount: number
  currentBet: number
  holeCards?: CardNotation[]
  isFolded: boolean
  isAllIn: boolean
  isEliminated?: boolean  // Player has 0 chips - out of the game
  lastAction?: string
  lastActionType?: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'blind'
  lastActionRound?: Round  // Track which round the action was from
  seatPosition?: number  // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
}

interface SidePot {
  amount: number
  eligiblePlayerIds: string[]
}

interface PokerTableProps {
  agents: Agent[]
  communityCards: CardNotation[]
  pot: number
  sidePots?: SidePot[]
  round: Round
  activeAgentId?: string
  dealerAgentId?: string
  smallBlindAgentId?: string
  bigBlindAgentId?: string
  winnerId?: string
  winningHand?: string
  showAgentCards?: boolean
  handNumber?: number
}

export function PokerTable({
  agents,
  communityCards,
  pot,
  sidePots = [],
  round,
  activeAgentId,
  dealerAgentId,
  smallBlindAgentId,
  bigBlindAgentId,
  winnerId,
  winningHand,
  showAgentCards = false,
  handNumber = 0,
}: PokerTableProps) {
  // Track winner animation state
  const [showWinAnimation, setShowWinAnimation] = useState(false)
  const [animatingPot, setAnimatingPot] = useState(0)
  const [potWonByWinner, setPotWonByWinner] = useState(0)  // Track pot amount won for animation
  const prevWinnerId = useRef<string | null>(null)
  const peakPotThisHand = useRef<number>(0)  // Track max pot seen in current hand
  const winAnimationTimerRef = useRef<NodeJS.Timeout | null>(null)  // Timer ref survives re-renders
  
  // Track hand dealing phases: 'blinds' -> 'dealing' -> 'playing'
  const [dealPhase, setDealPhase] = useState<'blinds' | 'dealing' | 'playing'>('playing')
  const prevHandNumber = useRef<number>(handNumber)
  const isFirstRender = useRef(true)
  
  // Track round changes for transition pause
  const prevRound = useRef<Round>(round)
  const [isRoundTransition, setIsRoundTransition] = useState(false)
  const [delayedRound, setDelayedRound] = useState<Round>(round)  // Delayed round for card visibility
  const roundTransitionTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track pot-to-winner animation
  const [potFlowingToWinner, setPotFlowingToWinner] = useState(false)
  const [displayedPot, setDisplayedPot] = useState(pot)  // What to show in center (0 after win animation)
  const handHasEnded = useRef(false)  // Track if current hand has ended (winner determined)
  
  // Corner positions for players - fixed layout
  const cornerPositions = [
    { id: 'top-left', containerClass: 'absolute top-4 left-4', betPosition: 'bottom-right' },
    { id: 'top-right', containerClass: 'absolute top-4 right-4', betPosition: 'bottom-left' },
    { id: 'bottom-right', containerClass: 'absolute bottom-4 right-4', betPosition: 'top-left' },
    { id: 'bottom-left', containerClass: 'absolute bottom-4 left-4', betPosition: 'top-right' },
  ]
  
  // Bet chip positions on the table - between player and center (like real poker)
  const betPositions = [
    'absolute top-[22%] left-[18%]',      // Top-left player's bet
    'absolute top-[22%] right-[18%]',     // Top-right player's bet
    'absolute bottom-[22%] right-[18%]',  // Bottom-right player's bet
    'absolute bottom-[22%] left-[18%]',   // Bottom-left player's bet
  ]
  
  // Dealer/Blind chip positions on the table - between player box and bet chips
  const positionChipPositions = [
    'absolute top-[12%] left-[12%]',      // Top-left player's position chip
    'absolute top-[12%] right-[12%]',     // Top-right player's position chip
    'absolute bottom-[12%] right-[12%]',  // Bottom-right player's position chip
    'absolute bottom-[12%] left-[12%]',   // Bottom-left player's position chip
  ]
  
  // Create positioned agents array (4 corners) - defined BEFORE effects that use it
  const agentsByPosition: (Agent | null)[] = [null, null, null, null]
  agents.forEach(agent => {
    const seat = agent.seatPosition ?? agents.indexOf(agent)
    if (seat >= 0 && seat < 4) {
      agentsByPosition[seat] = agent
    }
  })
  
  let unpositionedAgents = agents.filter(a => a.seatPosition === undefined)
  agentsByPosition.forEach((agent, i) => {
    if (!agent && unpositionedAgents.length > 0) {
      agentsByPosition[i] = unpositionedAgents.shift()!
    }
  })
  
  const positionedAgents = agentsByPosition.filter((a): a is Agent => a !== null)
  
  // Calculate the current highest bet on the table (for badge display logic)
  const tableBet = Math.max(0, ...positionedAgents.map(a => a.currentBet))

  // Detect new hand and trigger phased animation + reset states
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevHandNumber.current = handNumber
      return
    }
    
    if (handNumber > prevHandNumber.current) {
      // New hand started - reset all states
      setShowWinAnimation(false)  // Critical: reset winner animation state
      setAnimatingPot(0)
      setPotWonByWinner(0)
      setPotFlowingToWinner(false)
      setDisplayedPot(0)  // Reset to 0, will update from pot prop
      peakPotThisHand.current = 0
      prevWinnerId.current = null
      handHasEnded.current = false  // New hand, reset ended flag
      
      // Reset round transition state
      setIsRoundTransition(false)
      setDelayedRound('preflop')
      if (roundTransitionTimerRef.current) {
        clearTimeout(roundTransitionTimerRef.current)
        roundTransitionTimerRef.current = null
      }
      
      // Clear any pending winner animation timer
      if (winAnimationTimerRef.current) {
        clearTimeout(winAnimationTimerRef.current)
        winAnimationTimerRef.current = null
      }
      
      prevHandNumber.current = handNumber
      
      if (round === 'preflop') {
        setDealPhase('blinds')
        
        const dealTimer = setTimeout(() => setDealPhase('dealing'), 1000)
        const playTimer = setTimeout(() => setDealPhase('playing'), 2500)
        
        return () => {
          clearTimeout(dealTimer)
          clearTimeout(playTimer)
        }
      } else {
        setDealPhase('playing')
      }
    }
  }, [handNumber, round])
  
  // Detect round changes - add transition pause before showing new cards
  useEffect(() => {
    // Skip transition on first render or if round hasn't actually changed
    if (isFirstRender.current || prevRound.current === round) {
      prevRound.current = round
      setDelayedRound(round)
      return
    }
    
    // Round has changed - show transition
    const roundOrder: Round[] = ['preflop', 'flop', 'turn', 'river']
    const prevIndex = roundOrder.indexOf(prevRound.current)
    const currIndex = roundOrder.indexOf(round)
    
    // Only show transition when advancing (not on new hand reset)
    if (currIndex > prevIndex && !winnerId) {
      // Clear any existing timer
      if (roundTransitionTimerRef.current) {
        clearTimeout(roundTransitionTimerRef.current)
      }
      
      // Show "BETTING CLOSED" transition
      setIsRoundTransition(true)
      
      // After 1.5s, hide transition and update delayed round to show new cards
      roundTransitionTimerRef.current = setTimeout(() => {
        setIsRoundTransition(false)
        setDelayedRound(round)
        roundTransitionTimerRef.current = null
      }, 1500)
    } else {
      // No transition needed (new hand or going backwards)
      setDelayedRound(round)
    }
    
    prevRound.current = round
  }, [round, winnerId])
  
  // Keep displayedPot in sync with pot (except after hand has ended)
  useEffect(() => {
    // Don't sync pot after hand has ended (winner determined) - keep at $0
    if (!handHasEnded.current) {
      setDisplayedPot(pot)
    }
  }, [pot])
  
  // Track peak pot for current hand (resets on new hand)
  useEffect(() => {
    // Update peak pot if current pot is higher
    if (pot > peakPotThisHand.current) {
      peakPotThisHand.current = pot
    }
  }, [pot])
  
  // Trigger winner animation - pot flows to winner over 1s, then pot shows $0
  // CRITICAL: Uses ref for timer so it survives re-renders from Supabase realtime updates
  useEffect(() => {
    if (winnerId && winnerId !== prevWinnerId.current) {
      // Clear any existing timer first
      if (winAnimationTimerRef.current) {
        clearTimeout(winAnimationTimerRef.current)
        winAnimationTimerRef.current = null
      }
      
      // Use peak pot value (maximum pot seen during this hand)
      const wonAmount = peakPotThisHand.current > 0 ? peakPotThisHand.current : pot
      if (wonAmount > 0) {
        setAnimatingPot(wonAmount)
        setPotWonByWinner(wonAmount)
        setShowWinAnimation(true)
        setPotFlowingToWinner(true)
        handHasEnded.current = true  // Mark hand as ended
        prevWinnerId.current = winnerId
        
        // After 1s animation, set displayed pot to $0 (chips have flowed to winner)
        setTimeout(() => {
          setDisplayedPot(0)
          setPotFlowingToWinner(false)
        }, 1000)
        
        // End the win animation state after 2.5s total
        winAnimationTimerRef.current = setTimeout(() => {
          setShowWinAnimation(false)
          setAnimatingPot(0)
          winAnimationTimerRef.current = null
        }, 2500)
      }
    }
    // NO cleanup function here - timer should always complete
    // Timer cleanup is handled in new hand reset and component unmount effect
  }, [winnerId, pot])
  
  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (winAnimationTimerRef.current) {
        clearTimeout(winAnimationTimerRef.current)
      }
      if (roundTransitionTimerRef.current) {
        clearTimeout(roundTransitionTimerRef.current)
      }
    }
  }, [])
  

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[16/12]">
      {/* Table Surface */}
      <div className="absolute inset-x-8 inset-y-24 poker-table-bg rounded-[60px] z-0 shadow-2xl">
        {/* Dealer/Blind position chips on table - classy casino aesthetic */}
        {positionedAgents.map((agent, index) => {
          const isDealer = dealerAgentId === agent.id
          const isSB = smallBlindAgentId === agent.id
          const isBB = bigBlindAgentId === agent.id
          
          if (!isDealer && !isSB && !isBB) return null
          
          return (
            <div key={`pos-${agent.id}`} className={positionChipPositions[index]}>
              {/* Dealer button - classic ivory/cream casino style */}
              {isDealer && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-7 h-7 rounded-full bg-[#F5F5DC] text-neutral-800 text-[10px] font-bold flex items-center justify-center border-2 border-[#D4C896] shadow-lg"
                >
                  D
                </motion.div>
              )}
              {/* Small blind - rich burgundy */}
              {isSB && !isDealer && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-7 h-7 rounded-full bg-[#8B0000] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#A52A2A] shadow-lg"
                >
                  SB
                </motion.div>
              )}
              {/* Big blind - deep navy */}
              {isBB && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-7 h-7 rounded-full bg-[#1a1a4e] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#2a2a6e] shadow-lg"
                >
                  BB
                </motion.div>
              )}
            </div>
          )
        })}

        {/* Community Cards Area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
          {/* Phase indicators */}
          <AnimatePresence>
            {dealPhase === 'blinds' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-10 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full shadow-lg"
              >
                <span className="text-sm font-bold text-black">POSTING BLINDS</span>
              </motion.div>
            )}
            {dealPhase === 'dealing' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-10 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-lg"
              >
                <span className="text-sm font-bold text-white">DEALING CARDS</span>
              </motion.div>
            )}
            {isRoundTransition && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -10 }}
                className="absolute -top-10 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 rounded-full shadow-lg"
              >
                <motion.span 
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-sm font-bold text-white"
                >
                  BETTING CLOSED
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Community Cards - uses delayedRound for transition pause */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((index) => {
              const card = communityCards[index]
              // Use delayedRound to hold off showing new cards during transition
              const visibleCount = 
                delayedRound === 'preflop' ? 0 :
                delayedRound === 'flop' ? 3 :
                delayedRound === 'turn' ? 4 :
                delayedRound === 'river' ? 5 : 0
              
              if (card && index < visibleCount) {
                return (
                  <PlayingCard
                    key={index}
                    card={card}
                    size="md"
                    delay={index * 0.15}
                  />
                )
              }
              return <CardSlot key={index} size="md" />
            })}
          </div>

          {/* Pot Display - classy casino aesthetic */}
          <div className="flex flex-col items-center gap-1 relative">
            {/* Main pot display */}
            <motion.div
              animate={{ 
                scale: potFlowingToWinner ? [1, 0.8, 0] : 1,
                opacity: potFlowingToWinner ? [1, 1, 0] : 1 
              }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-neutral-900/90 rounded-full backdrop-blur-sm shadow-xl border border-neutral-700"
            >
              {/* Chip stack - classy casino colors (ivory, burgundy, navy) */}
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full bg-[#F5F5DC] border-2 border-[#D4C896] shadow-sm" /> {/* Ivory */}
                <div className="w-5 h-5 rounded-full bg-[#8B0000] border-2 border-[#A52A2A] shadow-sm" /> {/* Burgundy */}
                <div className="w-5 h-5 rounded-full bg-[#1a1a4e] border-2 border-[#2a2a6e] shadow-sm" /> {/* Navy */}
              </div>
              <span className="text-xl font-bold text-white">
                ${displayedPot.toLocaleString()}
              </span>
            </motion.div>
            
            {/* Winner animation - chips and amount flowing to winner */}
            <AnimatePresence>
              {potFlowingToWinner && winnerId && (
                <>
                  {/* Chip trail flowing to winner - classy casino colors */}
                  {[...Array(12)].map((_, i) => {
                    const winnerIndex = positionedAgents.findIndex(a => a.id === winnerId)
                    // Calculate target position based on winner's corner
                    const targetX = winnerIndex === 0 ? -280 : winnerIndex === 1 ? 280 : winnerIndex === 2 ? 280 : -280
                    const targetY = winnerIndex < 2 ? -180 : 180
                    
                    // Classy casino chip colors: ivory, burgundy, navy
                    const chipStyles = [
                      'bg-[#F5F5DC] border-2 border-[#D4C896]',  // Ivory
                      'bg-[#8B0000] border-2 border-[#A52A2A]',  // Burgundy
                      'bg-[#1a1a4e] border-2 border-[#2a2a6e]',  // Navy
                    ]
                    
                    return (
                      <motion.div
                        key={`chip-${i}`}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ 
                          x: targetX,
                          y: targetY,
                          scale: 0.6,
                          opacity: 0,
                        }}
                        transition={{ 
                          duration: 1,
                          delay: i * 0.05,
                          ease: "easeOut"
                        }}
                        className={`absolute w-5 h-5 rounded-full ${chipStyles[i % 3]} shadow-lg z-40`}
                      />
                    )
                  })}
                  
                  {/* Pot amount label flowing to winner - elegant gold */}
                  <motion.div
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{ 
                      x: positionedAgents.findIndex(a => a.id === winnerId) === 0 ? -280 :
                         positionedAgents.findIndex(a => a.id === winnerId) === 1 ? 280 :
                         positionedAgents.findIndex(a => a.id === winnerId) === 2 ? 280 : -280,
                      y: positionedAgents.findIndex(a => a.id === winnerId) < 2 ? -180 : 180,
                      scale: 1.2,
                      opacity: 0,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute px-4 py-2 bg-emerald-500/90 rounded-full shadow-xl z-50"
                  >
                    <span className="text-xl font-bold text-neutral-900">
                      +${animatingPot.toLocaleString()}
                    </span>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bet chips on table for each player - positioned near their box */}
        {positionedAgents.map((agent, index) => (
          <div key={`bet-${agent.id}`} className={betPositions[index]}>
            <AnimatePresence>
              {agent.currentBet > 0 && !agent.isFolded && !showWinAnimation && (
                <BetChip amount={agent.currentBet} />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Player boxes at corners */}
      {positionedAgents.map((agent, index) => {
        // Determine if player is eliminated (explicit flag or chipCount <= 0)
        const isEliminated = agent.isEliminated ?? agent.chipCount <= 0
        
        return (
          <div key={agent.id} className={cornerPositions[index].containerClass + ' z-20'}>
            <PlayerBox
              name={agent.name}
              slug={agent.slug}
              avatarUrl={agent.avatarUrl}
              chipCount={agent.chipCount}
              playerBet={agent.currentBet}
              tableBet={tableBet}
              holeCards={isEliminated ? undefined : agent.holeCards}  // No cards for eliminated players
              isFolded={agent.isFolded}
              isAllIn={agent.isAllIn}
              isEliminated={isEliminated}
              isActive={!isEliminated && dealPhase === 'playing' && activeAgentId === agent.id}  // Never active if eliminated
              isDealer={dealerAgentId === agent.id}
              isSmallBlind={!isEliminated && smallBlindAgentId === agent.id}  // No blinds for eliminated
              isBigBlind={!isEliminated && bigBlindAgentId === agent.id}  // No blinds for eliminated
              isWinner={winnerId === agent.id}
              handResolved={!!winnerId}  // Grey out losers and hide badges when hand has a winner
              winningHand={winnerId === agent.id ? winningHand : undefined}
              potWon={winnerId === agent.id ? potWonByWinner : 0}
              lastActionType={agent.lastActionType}
              lastActionRound={agent.lastActionRound}
              currentRound={delayedRound}  // Use delayedRound so badges stay visible during transition
              showCards={!isEliminated && showAgentCards && dealPhase !== 'blinds'}  // No cards shown for eliminated
              dealDelay={dealPhase === 'dealing' ? index * 0.3 : 0}
              position={index < 2 ? 'top' : 'bottom'}
            />
          </div>
        )
      })}
    </div>
  )
}
