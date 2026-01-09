/**
 * x402 All In - Main Spectator View
 * Watch AI agents (All-In Podcast hosts) play Texas Hold'em
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 6, 2026 - Wired up Supabase realtime via useGameState hook
 * Updated: Jan 6, 2026 - All-In Podcast branding, new header with nav tabs
 * Updated: Jan 6, 2026 - Footer styling (All-In style), natural document flow
 * Updated: Jan 7, 2026 - Action feed now shows winner with cards and pot amount
 * Updated: Jan 9, 2026 - Force refresh after hand resolves to update chip counts immediately
 * Updated: Jan 9, 2026 - Added round indicator to table header (next to hand number)
 * Updated: Jan 9, 2026 - UI cleanup: removed mono fonts, MAIN TABLE now white
 * Updated: Jan 9, 2026 - Fixed layout: min-h-screen flex for footer positioning,
 *                        sidebar aligns with table height (items-start)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { PokerTable, BettingPanel, ActionFeed } from '@/components/poker'
import { useGameState } from '@/hooks'
import type { Round, BettingOdds, ActionType } from '@/types/poker'

// Navigation tabs - ALL CAPS like All-In style
const NAV_TABS = [
  { name: 'HOME', href: '/', active: true },
  { name: 'METRICS', href: '/metrics', active: false },
  { name: 'ABOUT', href: '/about', active: false },
]

// Fallback mock data for when no game is active
const MOCK_AGENTS = [
  {
    id: '1',
    name: 'Chamath',
    slug: 'chamath',
    avatarUrl: '/avatars/chamath.svg',
    chipCount: 1000,
    currentBet: 0,
    holeCards: [] as string[],
    isFolded: false,
    isAllIn: false,
    lastAction: 'Waiting for game to start...',
    seatPosition: 0,  // Top
  },
  {
    id: '2',
    name: 'Sacks',
    slug: 'sacks',
    avatarUrl: '/avatars/sacks.svg',
    chipCount: 1000,
    currentBet: 0,
    holeCards: [] as string[],
    isFolded: false,
    isAllIn: false,
    lastAction: 'Waiting for game to start...',
    seatPosition: 1,  // Right
  },
  {
    id: '3',
    name: 'Jason',
    slug: 'jason',
    avatarUrl: '/avatars/jason.svg',
    chipCount: 1000,
    currentBet: 0,
    holeCards: [] as string[],
    isFolded: false,
    isAllIn: false,
    lastAction: 'Waiting for game to start...',
    seatPosition: 2,  // Bottom
  },
  {
    id: '4',
    name: 'Friedberg',
    slug: 'friedberg',
    avatarUrl: '/avatars/friedberg.svg',
    chipCount: 1000,
    currentBet: 0,
    holeCards: [] as string[],
    isFolded: false,
    isAllIn: false,
    lastAction: 'Waiting for game to start...',
    seatPosition: 3,  // Left
  },
]

const MOCK_ODDS: BettingOdds[] = [
  { agentId: '1', agentName: 'Chamath', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '2', agentName: 'Sacks', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '3', agentName: 'Jason', odds: 4.0, totalBets: 0, betCount: 0 },
  { agentId: '4', agentName: 'Friedberg', odds: 4.0, totalBets: 0, betCount: 0 },
]

export default function Home() {
  const { gameState, actions, isLoading, error, refresh } = useGameState()
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isRunningHand, setIsRunningHand] = useState(false)
  const [handResult, setHandResult] = useState<{ winner: string; hand: string; pot: number } | null>(null)

  // Run a hand step-by-step so actions play out in real-time
  const runHand = useCallback(async () => {
    setIsRunningHand(true)
    setHandResult(null)
    
    try {
      // Step 1: Start a new hand
      const startResponse = await fetch('/api/game/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_hand' }),
      })
      const startData = await startResponse.json()
      
      if (!startData.success || !startData.handId) {
        console.error('Failed to start hand:', startData)
        setIsRunningHand(false)
        return
      }
      
      const handId = startData.handId
      
      // Give time to see the initial deal (cards going to players)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 2: Process actions one at a time with delays
      // Each action triggers Supabase Realtime updates so UI updates live
      let handResolved = false
      let actionCount = 0
      const MAX_ACTIONS = 50 // Safety limit
      
      while (!handResolved && actionCount < MAX_ACTIONS) {
        actionCount++
        
        // Process next action
        const actionResponse = await fetch('/api/game/orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next_action', handId }),
        })
        const actionData = await actionResponse.json()
        
        // Small delay after each action so viewers can see it
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if hand needs to advance to next round
        if (actionData.message?.includes('advance')) {
          const advanceResponse = await fetch('/api/game/orchestrator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'advance_round', handId }),
          })
          const advanceData = await advanceResponse.json()
          
          // Longer delay to see new community cards
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Check if showdown/resolution happened
          if (advanceData.resolved) {
            handResolved = true
            setHandResult({
              winner: advanceData.winnerName || 'Unknown',
              hand: advanceData.winningHand || 'Winner',
              pot: advanceData.pot || 0,
            })
          }
        }
        
        // Check if we're running out the board (all-in showdown)
        if (actionData.runningOut) {
          // Keep calling next_action to deal remaining cards
          await new Promise(resolve => setTimeout(resolve, 1500)) // Delay to see cards
          continue // Loop will call next_action again
        }
        
        // Check if hand was resolved (all folded or showdown)
        if (actionData.resolved) {
          handResolved = true
          setHandResult({
            winner: actionData.winnerName || 'Unknown',
            hand: actionData.winningHand || 'Winner',
            pot: actionData.pot || 0,
          })
        }
      }
      
      // Force refresh to get updated chip counts from database
      await new Promise(resolve => setTimeout(resolve, 500))
      await refresh()
      
    } catch (err) {
      console.error('Failed to run hand:', err)
    } finally {
      setIsRunningHand(false)
    }
  }, [refresh])

  // Calculate time left for betting
  useEffect(() => {
    if (!gameState?.bettingClosesAt) {
      setTimeLeft(0)
      return
    }

    const updateTimer = () => {
      const now = new Date().getTime()
      const closes = new Date(gameState.bettingClosesAt!).getTime()
      const remaining = Math.max(0, Math.floor((closes - now) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [gameState?.bettingClosesAt])

  // Transform game state for components
  const agents = gameState?.players.length
    ? gameState.players.map(p => ({
        id: p.agentId,
        name: p.name,
        slug: p.slug,
        avatarUrl: p.avatarUrl || undefined,
        chipCount: p.chipCount,
        currentBet: p.currentBet,
        holeCards: p.holeCards,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        lastAction: p.lastAction,
        lastActionType: p.lastActionType,
        lastActionRound: p.lastActionRound,  // For resetting badges each round
        seatPosition: p.seatPosition,  // Fixed position at table
      }))
    : MOCK_AGENTS

  const odds = gameState?.odds.length ? gameState.odds : MOCK_ODDS
  const communityCards = gameState?.communityCards || []
  const pot = gameState?.pot || 0
  const sidePots = gameState?.sidePots || []
  const round = gameState?.round || 'preflop'
  const handNumber = gameState?.handNumber || 0
  const activeAgentId = gameState?.activePlayerId || undefined
  const dealerAgentId = gameState?.dealerPlayerId || undefined
  const smallBlindAgentId = gameState?.smallBlindPlayerId || undefined
  const bigBlindAgentId = gameState?.bigBlindPlayerId || undefined
  const isBettingOpen = gameState?.isBettingOpen || false
  const totalPool = gameState?.totalPool || 0

  // Transform actions for ActionFeed
  // The 'actions' from useGameState now includes a 'win' action when hand is resolved
  const transformedActions = actions.map(a => ({
    id: a.id,
    agentName: a.agentName,
    agentSlug: a.agentSlug,
    actionType: a.actionType as ActionType | 'win',
    amount: a.amount || undefined,
    reasoning: a.reasoning || undefined,
    round: a.round as Round,
    timestamp: a.timestamp,
    // Winner-specific fields (from useGameState)
    winningHand: a.winningHand,
    holeCards: a.holeCards,
    potAmount: a.potAmount,
  }))

  const closesAt = gameState?.bettingClosesAt || ''

  // Show winner announcement
  const showWinner = gameState?.status === 'resolved' && gameState?.winnerId
  const winnerName = showWinner 
    ? agents.find(a => a.id === gameState?.winnerId)?.name 
    : null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - All-In Style (clean, no borders, all caps) */}
      <header className="bg-background">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Nav Tabs */}
            <div className="flex items-center gap-10">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <Image 
                  src="/logo.svg" 
                  alt="x402 ALL IN" 
                  width={103} 
                  height={65}
                  className="h-8 w-auto"
                  priority
                />
              </Link>

              {/* Navigation Tabs - Clean text, no backgrounds */}
              <nav className="hidden md:flex items-center gap-8">
                {NAV_TABS.map((tab) => (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={`text-sm font-bold tracking-wide transition-colors ${
                      tab.active 
                        ? 'text-foreground' 
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {tab.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right: Connect Wallet - TEQUILA button style */}
            <div className="flex items-center">
              <button className="px-6 py-2.5 bg-background-elevated hover:bg-background-card text-foreground rounded-full text-sm font-bold tracking-wide transition-colors border border-border-bright">
                CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-accent-red/20 border border-accent-red/50 rounded-lg"
          >
            <p className="text-accent-red font-medium">Connection Error</p>
            <p className="text-sm text-foreground-muted mt-1">{error.message}</p>
          </motion.div>
        )}

        {/* Winner announcement is now shown on the player card instead of banner */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Poker Table - Main Area */}
          <div className="lg:col-span-8">
            <div>
              {/* Table Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold">MAIN TABLE</span>
                  <span className="text-foreground-muted">•</span>
                  <span className="text-white font-medium">
                    {handNumber > 0 ? `Hand #${handNumber}` : 'Waiting...'}
                  </span>
                  {handNumber > 0 && (
                    <>
                      <span className="text-foreground-muted">•</span>
                      <span className="text-white font-medium capitalize">
                        {round}
                      </span>
                    </>
                  )}
                </div>
                
                {/* Run Hand Button */}
                <button
                  onClick={runHand}
                  disabled={isRunningHand}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRunningHand
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-accent-green hover:bg-accent-green/80 text-white shadow-lg hover:shadow-accent-green/25'
                  }`}
                >
                  {isRunningHand ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                      />
                      Running...
                    </span>
                  ) : (
                    '▶ Run Hand'
                  )}
                </button>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-foreground-muted">Connecting to game...</p>
                  </div>
                </div>
              ) : (
                <PokerTable
                  agents={agents}
                  communityCards={communityCards}
                  pot={pot}
                  sidePots={sidePots}
                  round={round}
                  activeAgentId={activeAgentId}
                  dealerAgentId={dealerAgentId}
                  smallBlindAgentId={smallBlindAgentId}
                  bigBlindAgentId={bigBlindAgentId}
                  winnerId={gameState?.winnerId || undefined}
                  winningHand={gameState?.winningHand || undefined}
                  showAgentCards={true}
                  handNumber={handNumber}
                />
              )}
            </div>

            {/* Mobile Betting Panel */}
            <div className="lg:hidden mt-6">
              <BettingPanel
                isOpen={isBettingOpen}
                closesAt={closesAt}
                odds={odds}
                totalPool={totalPool}
                walletConnected={false}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Desktop Betting Panel */}
            <div className="hidden lg:block">
              <BettingPanel
                isOpen={isBettingOpen}
                closesAt={closesAt}
                odds={odds}
                totalPool={totalPool}
                walletConnected={false}
              />
            </div>

            {/* Action Feed */}
            <ActionFeed 
              actions={transformedActions.length > 0 ? transformedActions : [
                {
                  id: 'placeholder',
                  agentName: 'System',
                  agentSlug: 'system',
                  actionType: 'check' as ActionType,
                  reasoning: 'Waiting for game to start. Actions will appear here.',
                  round: 'preflop' as Round,
                  timestamp: '', // Use empty string to avoid hydration mismatch
                }
              ]} 
            />
          </div>
        </div>
      </main>

      {/* Footer - All-In Style (sticks to bottom via flex layout) */}
      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            {/* Left: Social Icons + Copyright */}
            <div className="flex flex-col gap-4">
              {/* Social Icons */}
              <div className="flex items-center gap-3">
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground-muted transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground-muted transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground-muted transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">B</text></svg>
                </a>
              </div>
              {/* Copyright */}
              <div className="text-xs text-foreground-muted">
                © 2026 x402 All In&nbsp;&nbsp;|&nbsp;&nbsp;Powered by x402 Protocol
              </div>
            </div>

            {/* Right: Legal Links */}
            <div className="flex flex-col items-end gap-2 text-sm">
              <span className="font-extrabold text-foreground tracking-wide">LEGAL</span>
              <a href="/terms" className="text-foreground-muted hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="text-foreground-muted hover:text-foreground transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
