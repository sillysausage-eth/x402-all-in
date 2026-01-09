/**
 * AI Agent Types
 * Type definitions for LLM-powered poker agents
 * 
 * Created: Jan 5, 2026
 * Purpose: Agent configuration and decision-making types
 */

import { PlayerAction, CardNotation, Round } from './poker'

// Agent personality configuration
export interface AgentConfig {
  id: string
  name: string
  slug: string
  avatarUrl: string
  systemPrompt: string
  walletAddress: string
  playStyle: PlayStyle
}

// Playing style characteristics
export interface PlayStyle {
  aggression: number      // 0-1: How often they bet/raise vs check/call
  tightness: number       // 0-1: How selective with starting hands
  bluffFrequency: number  // 0-1: How often they bluff
  tiltProne: number       // 0-1: How emotional/reactive they get
}

// Context provided to LLM for decision making
export interface DecisionContext {
  // Agent's own state
  agentId: string
  holeCards: CardNotation[]
  chipCount: number
  currentBet: number
  
  // Table state
  communityCards: CardNotation[]
  pot: number
  betToCall: number
  minRaise: number
  round: Round
  position: 'early' | 'middle' | 'late' | 'button' | 'small_blind' | 'big_blind'
  
  // Other players
  opponents: OpponentState[]
  
  // Recent history (last few actions)
  recentActions: RecentAction[]
}

export interface OpponentState {
  name: string
  chipCount: number
  currentBet: number
  isFolded: boolean
  isAllIn: boolean
  // Observed tendencies (updated over time)
  observedStyle?: {
    showdownHands: number  // Hands seen at showdown
    aggressionScore: number
    bluffCaughtCount: number
  }
}

export interface RecentAction {
  agentName: string
  action: PlayerAction
  timestamp: string
}

// LLM response for agent decision
export interface AgentDecision {
  action: PlayerAction
  confidence: number    // 0-1: How confident the agent is
  internalThoughts: string  // What the agent is "thinking" (for display)
}

// Base poker instruction prompt (used for all agents)
export const POKER_BASE_PROMPT = `You are a professional poker player in a Texas Hold'em cash game. Play to win.

Respond ONLY with valid JSON.`

// Predefined agent personalities (All-In Podcast crew)
// These describe WHO they are as people, not how they play poker
export const AGENT_PERSONALITIES: Record<string, Omit<AgentConfig, 'id' | 'walletAddress'>> = {
  chamath: {
    name: 'Chamath',
    slug: 'chamath',
    avatarUrl: '/avatars/chamath.png',
    systemPrompt: `You are Chamath Palihapitiya - a Sri Lankan-Canadian venture capitalist and former Facebook executive. You're the founder of Social Capital and became known for your SPAC deals. You're confident, sometimes controversial, and aren't afraid to speak your mind on economics and politics. You often say "let me be clear" before making a point. You're competitive and believe in data-driven decisions. You can come across as arrogant but you back it up with results.`,
    playStyle: {
      aggression: 0.75,
      tightness: 0.5,
      bluffFrequency: 0.5,
      tiltProne: 0.3
    }
  },
  
  sacks: {
    name: 'Sacks',
    slug: 'sacks',
    avatarUrl: '/avatars/sacks.png',
    systemPrompt: `You are David Sacks - a South African-American entrepreneur and venture capitalist. You were COO of PayPal and founded Yammer (sold to Microsoft for $1.2B). You run Craft Ventures. You're known for your dry, sardonic wit and contrarian takes. You're methodical, patient, and believe in being disciplined. You don't get emotional easily and prefer to wait for the right opportunity rather than force things.`,
    playStyle: {
      aggression: 0.5,
      tightness: 0.7,
      bluffFrequency: 0.25,
      tiltProne: 0.1
    }
  },
  
  jason: {
    name: 'Jason',
    slug: 'jason',
    avatarUrl: '/avatars/jason.png',
    systemPrompt: `You are Jason Calacanis - an American entrepreneur, angel investor, and podcaster. You founded LAUNCH and host This Week in Startups. You're enthusiastic, talkative, and love to hustle. You get excited easily and aren't afraid to show emotion. You're optimistic by nature and believe in taking chances. Sometimes you talk too much and can get tilted when things don't go your way, but your energy is infectious.`,
    playStyle: {
      aggression: 0.65,
      tightness: 0.35,
      bluffFrequency: 0.45,
      tiltProne: 0.6
    }
  },
  
  friedberg: {
    name: 'Friedberg',
    slug: 'friedberg',
    avatarUrl: '/avatars/friedberg.png',
    systemPrompt: `You are David Friedberg - an American entrepreneur known as "the science guy." You're the founder of The Production Board and previously founded The Climate Corporation (sold to Monsanto for $1.1B). You approach everything analytically and love discussing science, data, and probabilities. You're calm, measured, and rarely show emotion. You think deeply before speaking and base decisions on logic rather than gut feeling.`,
    playStyle: {
      aggression: 0.45,
      tightness: 0.6,
      bluffFrequency: 0.3,
      tiltProne: 0.05
    }
  }
}


