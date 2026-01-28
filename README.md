# Agent All In 🃏

**AI Poker Spectator Game** — Watch AI agents powered by Claude play Texas Hold'em poker in real-time, and bet on who will win!

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)
![Claude](https://img.shields.io/badge/Claude-Haiku_4.5-orange)
![Thirdweb](https://img.shields.io/badge/Thirdweb-Connect-purple)
![Base](https://img.shields.io/badge/Base-Chain-0052FF)

## Overview

Agent All In is a poker spectator experience where 4 AI agents—modeled after the hosts of [The All-In Podcast](https://www.allinpodcast.co/)—compete in Texas Hold'em. Each agent has a unique personality and decision-making style powered by Anthropic's Claude.

Spectators can watch AI-powered poker games unfold in real-time and place bets directly on-chain (via the PokerBettingV2 smart contract) on which agent will win the tournament. Games consist of 25 hands, with a spectator betting window during the first 5 hands.

**Live Demo:** [agentallin.com](https://agentallin.com) (Coming Soon)

### Recent Updates (January 2026)

- ✅ Implemented 25-hand game loop system with countdown
- ✅ Fixed chip reset bug (agents no longer get free chips when bust)
- ✅ Fixed position shuffle bug (agents now have fixed `seat_position`)
- ✅ Added pause/stop buttons for game control
- ✅ Winner announcement modal with "New Game" CTA
- ✅ Reduced countdown time to 1 minute (from 5)
- ✅ Game status pills (hand counter, round indicator, betting status)
- ✅ **Supabase Egress Optimization** — Major refactor to reduce bandwidth (see below)
- ✅ **Fixed game ejection bug** — Game pages no longer redirect when new games start
- ✅ **Smart Contract V2 Deployed & Verified** — PokerBettingV2 on Base Sepolia (see below)
- ✅ **End-to-End Testing on Sepolia** — Full app flow tested on testnet
- ✅ **Home page UX improvements** — Next game countdown, previous games display, dev tools
- ✅ **Betting panel fixes** — On-chain status as source of truth, locked state UI
- ✅ **Verifiable games** — Deck commitment and verification system
- ✅ **Game session API** — `/api/game/session` for game-level orchestration (start game, next hand, betting close)
- ✅ **v1 API** — `/api/v1/games`, `/api/v1/games/[id]`, `/api/v1/bets` for agents and integrations
- ✅ **New pages** — `/game/[id]` (live game), `/bets` (My Bets), `/metrics`, `/privacy`, `/terms`
- ✅ **Home & layout** — Hero lobby, live/previous/upcoming game cards, shared Header
- ✅ **Claim winnings & verification** — ClaimWinnings component, UnclaimedWinningsBanner, VerificationBadge, `/api/games/[id]/verify`
- ✅ **Agent wallets API** — `/api/agents/wallets` for agent wallet lookup
- ✅ **Orchestrator robustness** — On-chain status checks before close/resolve, betting close in `startNewHand`, TypeScript guards in auto_play loop
- ✅ **Contract integration** — `src/lib/contracts/` (config, admin, hooks, ABI) and `src/lib/agents/` (wallets)
- ✅ **Rate limiting** — `src/lib/rate-limit.ts` for API protection
- 🚀 **Next Step: Agent Testing Flows** — Testing AI agent betting and gameplay (see below)

### Supabase Egress Optimization (Jan 10, 2026)

We were massively exceeding Supabase egress limits due to inefficient real-time subscriptions. The following optimizations were implemented:

**Problems Identified:**
1. **Cascade Fetch Pattern** — Every database change triggered full re-fetches
2. **Unfiltered Subscriptions** — Subscribing to entire tables instead of filtering by game/hand
3. **SELECT * Queries** — Fetching all columns including large fields like `system_prompt`
4. **Duplicate Subscriptions** — Both `useGameState` and `useGameSession` subscribing to same tables
5. **Event Storm** — Rapid updates during gameplay causing hundreds of requests/second

**Solutions Implemented:**
- **Filtered Subscriptions** — Added `filter: game_id=eq.${gameId}` to Realtime subscriptions
- **Column Selection** — Explicit column lists instead of `SELECT *`
- **Debouncing** — 100-150ms debounce on refresh functions to batch rapid updates
- **Payload Updates** — Use subscription payload data for simple updates (e.g., chip counts)
- **Removed Duplicates** — Consolidated agent subscriptions to single hook

**Files Modified:**
- `src/hooks/useGameState.ts` — Filtered subscriptions, column selection, debouncing
- `src/hooks/useGameSession.ts` — Filtered subscriptions, column selection, debouncing
- `src/hooks/useAgents.ts` — Column selection (excludes `system_prompt`)

### Smart Contract V2 (Jan 22, 2026)

The PokerBettingV2 smart contract is deployed and verified on **Base Sepolia testnet**. This is a UUPS upgradeable contract with signature-based claims for gasless agent experience.

**Contract Addresses (Base Sepolia):**

| Contract | Address | Basescan |
|----------|---------|----------|
| PokerBettingV2 (Proxy) | `0x313A6ABd0555A2A0E358de535833b406543Cc14c` | [View](https://sepolia.basescan.org/address/0x313A6ABd0555A2A0E358de535833b406543Cc14c#code) |
| Implementation | `0xDEDda864eF09BC93E1F3D78fa655f3d7E6C104CD` | [View](https://sepolia.basescan.org/address/0xDEDda864eF09BC93E1F3D78fa655f3d7E6C104cd#code) |
| USDC (MockUSDC) | `0xf56873A99B2E5F83562F01996f46C42AFAEc9f84` | [View](https://sepolia.basescan.org/address/0xf56873A99B2E5F83562F01996f46C42AFAEc9f84) |

**V2 Features:**
- Parimutuel betting pool (odds determined by pool distribution)
- Profit-only house fee (5% on winnings, not principal)
- EIP-712 signature support for gasless claims
- UUPS upgradeable proxy pattern
- Multi-bet system (bet multiple times on multiple agents)

**Current Phase: Agent Testing Flows** 🤖

The core application and smart contracts are functional on Base Sepolia. The next step is testing AI agent interactions with the betting system:

**Completed:**
- [x] Create game on-chain via orchestrator
- [x] Place bets through BettingPanel UI
- [x] Verify odds calculation and pool distribution
- [x] Test game resolution and winner determination
- [x] Betting panel locks correctly when betting closes

**Next Steps - Agent Testing:**
- [ ] Test AI agent viewing game state via API
- [ ] Test AI agent placing bets programmatically
- [ ] Test AI agent claiming winnings
- [ ] Verify agent wallet funding and USDC approval flows
- [ ] Test multi-agent betting scenarios
- [ ] Stress test with concurrent agent operations

**After Agent Testing:**
- [ ] Test claim winnings flow (direct + signature-based)
- [ ] Test refund flow for cancelled games
- [ ] Mainnet deployment

### Game Ejection Bug Fix (Jan 10, 2026)

**Bug:** Users were being "ejected" from the game page back to home, seemingly at random times.

**Root Cause:** The `useGameSession()` hook was always fetching the **latest game**, not the specific game being viewed. When a new game started (status: `'waiting'`), the game page would display the new game's countdown instead of the game the user was watching.

**The Fix:**
1. Updated game page to pass `gameId` to `useGameSession({ gameId })`
2. Updated `useGameSession` to accept optional `gameId` parameter
3. When `gameId` is provided, the hook fetches that specific game by ID
4. When omitted (home page), it fetches the latest game as before

**Files Modified:**
- `src/app/game/[id]/page.tsx` — Pass `gameId` to `useGameSession`
- `src/hooks/useGameSession.ts` — Accept and use `gameId` option for filtering

### Features

- 🎰 **Real-time Poker** — Watch hands play out with live chip updates, betting rounds, and showdowns
- 🤖 **AI Personalities** — 4 unique agents: Chamath, Jason, Sacks, and Friedberg, each with distinct play styles
- 💬 **Live Commentary** — See agent reasoning and thoughts as they make decisions
- 🎲 **Spectator Betting** — Place bets on who will win the 25-hand game (betting window configurable; closes after hand 2 in current config)
- ⛓️ **On-chain Integration** — Built for Base chain with parimutuel betting pools (PokerBettingV2)
- 🏆 **25-Hand Game Loop** — Full tournament structure with countdown, betting window, and winner announcement
- ⏸️ **Game Controls** — Pause and stop games at any time for testing/debugging
- 📄 **Game page** — Dedicated `/game/[id]` view with countdown, table, and betting panel
- 💰 **My Bets** — `/bets` page with bet history and claim winnings flow
- ✔️ **Verifiable games** — Deck commitment and verification badge; `/api/games/[id]/verify`
- 🔌 **v1 API** — Public endpoints for games and bets for agents and integrations

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL + Realtime)
- **AI:** Claude Haiku 4.5 via Vercel AI SDK
- **Styling:** Tailwind CSS v4
- **Blockchain:** Base (via Thirdweb SDK)
- **Smart Contracts:** Foundry (Solidity 0.8.24), UUPS Upgradeable
- **Wallet:** Thirdweb Connect (350+ wallets, social login, WalletConnect)
- **Betting:** Direct on-chain via PokerBettingV2 smart contract (parimutuel pools)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Anthropic API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/sillysausage-eth/agent-all-in.git
cd agent-all-in
```

2. **Install dependencies**

```bash
pnpm install
# or
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Fill in your environment variables (see `.env.example` for required values).

4. **Set up Supabase**

Create a new Supabase project and run the migrations in `supabase/migrations/` (if applicable), or set up the following tables:

- `agents` — AI agent profiles (with `seat_position` for fixed seating)
- `lobbies` — Lobby/room management
- `games` — 25-hand game sessions (status: waiting/betting_open/betting_closed/resolved/cancelled)
- `hands` — Individual hand data (cards, pot, round, etc.)
- `hand_agents` — Per-hand agent state (hole cards, chips, bets, fold status)
- `agent_actions` — Action log per hand
- `spectator_bets` — User bets on game outcomes

5. **Run the development server**

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the game.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home (lobby, next/previous games)
│   ├── about/             # About page
│   ├── game/[id]/         # Live game view
│   ├── bets/              # My Bets page
│   ├── metrics/           # Metrics page
│   ├── privacy/           # Privacy policy
│   ├── terms/             # Terms of service
│   └── api/               # API routes
│       ├── game/
│       │   ├── orchestrator/ # Hand-level (start_hand, next_action, advance_round)
│       │   └── session/      # Game-level (start game, next_hand, 25-hand loop)
│       ├── agents/wallets/   # Agent wallet lookup
│       ├── games/[id]/verify/ # Game verification (deck)
│       └── v1/                # Public API for agents
│           ├── games/         # List game, get game by id
│           └── bets/          # Place bet, my bets
├── components/
│   ├── home/              # Home page
│   │   ├── HeroLobby.tsx, LiveLobbyCard.tsx, LobbyCard.tsx
│   │   ├── CompletedGameCard.tsx, PreviousLobbyCard.tsx, UpcomingLobbyCard.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── index.ts
│   ├── poker/             # Game UI components
│   │   ├── PokerTable.tsx       # Main table with player positions
│   │   ├── AgentCard.tsx        # Player boxes with cards, chips, status
│   │   ├── ActionFeed.tsx       # Live action log
│   │   ├── BettingPanel.tsx     # Spectator betting interface
│   │   ├── GameCountdown.tsx    # Pre-game countdown timer
│   │   ├── GameStatus.tsx       # Hand/game progress indicators
│   │   ├── GameFinished.tsx     # Game over state
│   │   ├── GameWinnerAnnouncement.tsx # Winner modal with CTA
│   │   ├── ClaimWinnings.tsx    # Claim winnings flow
│   │   ├── UnclaimedWinningsBanner.tsx # Unclaimed winnings notification
│   │   ├── BettingHistory.tsx   # User bet history modal
│   │   ├── VerificationBadge.tsx # Verifiable game badge
│   │   └── index.ts
│   └── about/             # About page components
├── hooks/
│   ├── useGameState.ts    # Real-time hand state (cards, bets, actions)
│   ├── useGameSession.ts  # Game session state (25-hand loop, countdown)
│   ├── useAgents.ts       # Agent data and standings
│   ├── useUserBets.ts     # User bets and claim status
│   └── useWalletBalance.ts # User wallet balance
├── lib/
│   ├── ai/
│   │   ├── agent-decision.ts # AI decision engine (Claude integration)
│   │   └── prompts.ts        # Agent personality prompts
│   ├── agents/            # Agent identity and wallets
│   │   ├── index.ts
│   │   └── wallets.ts
│   ├── poker/
│   │   ├── game-engine.ts    # Core poker logic
│   │   ├── hand-evaluator.ts # 5-card hand ranking
│   │   ├── deck.ts           # Card shuffling/dealing
│   │   ├── verifiable.ts     # Deck commitment/verification
│   │   └── pot-calculator.ts # Side pot calculations
│   ├── contracts/         # Smart contract integration (Thirdweb)
│   │   ├── config.ts      # Chain & contract addresses
│   │   ├── admin.ts       # Server-side (create game, resolve, etc.)
│   │   ├── hooks.ts       # React hooks (bet, claim, balance)
│   │   ├── PokerBetting.abi.json
│   │   └── index.ts
│   ├── rate-limit.ts      # API rate limiting
│   └── supabase/          # Database clients
└── types/
    ├── agents.ts           # Agent personalities
    ├── poker.ts            # Poker types (GameStatus, etc.)
    └── database.ts         # Supabase table types
```

## The Agents

| Agent | Personality | Play Style | Seat |
|-------|-------------|------------|------|
| **Jason** | Energetic angel investor | Loose and action-oriented | 0 |
| **Friedberg** | Data-driven scientist | Math-based, systematic | 1 |
| **Chamath** | Bold venture capitalist | Aggressive, loves big bluffs | 2 |
| **Sacks** | Analytical operator | Tight, calculated decisions | 3 |

### Agent Intelligence

Agents are powered by Claude Haiku 4.5 and have access to:
- Their own hole cards and chip stack
- **All opponents' chip counts** (enables strategic targeting)
- Community cards and pot size
- Betting history for the current hand
- Position awareness (dealer, blinds, UTG, etc.)

This allows agents to make strategic decisions like:
- Targeting short-stacked opponents
- Being cautious against big stacks
- Position-based play adjustments
- Bluff sizing based on opponent stacks

## Game Loop System (WIP)

> **Note:** The 25-hand game loop system is functional but the UX is still being refined. Major UX changes are planned.

### Current Implementation

The game operates on a **25-hand tournament loop**:

1. **Pre-Game Countdown** (1 minute) — Shows previous winner, agent standings, early betting allowed
2. **Betting Window** (configurable; currently first 2 hands) — Spectators can place bets on who will win the game
3. **Game Play** (remaining hands) — Betting closes, agents play until one has all chips or max hands complete
4. **Winner Announcement** — Modal with winner, final standings, payout info, and "New Game" CTA

### Key Features Implemented

- ✅ **Fixed Seat Positions** — Agents maintain consistent table positions (dealer button rotates)
- ✅ **Chip Persistence** — Chips persist correctly between hands (eliminated agents stay eliminated)
- ✅ **Pause/Stop Controls** — Ability to pause or stop a running game
- ✅ **Winner Modal** — Celebration screen with "New Game" CTA
- ✅ **Game Status UI** — Hand counter, round indicator, betting status pills

### Known Limitations / Planned Improvements

- [ ] UX overhaul for game flow (major changes coming)
- [ ] Mobile responsive design
- [x] ~~Smart contract deployment~~ — V2 deployed on Sepolia
- [ ] End-to-end testing on Sepolia (in progress)
- [ ] Mainnet deployment (after Sepolia validation)

### ✅ CRITICAL UX BUGS (FIXED)

- [x] **Eliminated player display** — Fixed Jan 12, 2026
  - **Root cause 1:** `useGameSession.ts` used `chip_count || 1000` which treated `0` as falsy
  - **Root cause 2:** `useGameState.ts` only showed players in `hand_agents` (eliminated players excluded from hands)
  - **Fixes applied:**
    - Changed `chip_count || 1000` to `chip_count ?? 1000` (nullish coalescing)
    - Modified `useGameState.ts` to include ALL agents (not just those in current hand)
    - Eliminated players sorted to END of standings list
  - **Files modified:**
    - `src/hooks/useGameSession.ts` — Nullish coalescing fix + sorting
    - `src/hooks/useGameState.ts` — Include all agents in players array
    - `src/components/home/LiveLobbyCard.tsx` — Eliminated player styling
    - `src/components/poker/AgentCard.tsx` — BUST badge for eliminated
  - **Working behavior:** 
    - **Home screen:** Grayscale avatar, gray name, red "BUST" text, sorted last
    - **Game table:** Grayscale + dimmed, "BUST" badge, no cards dealt, skipped for blinds/turns

### 🔄 Remaining Next Steps (Egress & Real-time)

**Monitoring & Validation:**
- [ ] Monitor Supabase egress usage after optimizations are live
- [ ] Verify egress reduction (target: 70-80% reduction)
- [ ] Test with multiple concurrent viewers to stress-test subscriptions

**Potential Further Optimizations:**
- [ ] **Server-Sent Events (SSE)** — Consider replacing Supabase Realtime with SSE for game state
- [ ] **Caching Layer** — Add Redis/memory cache for frequently-read data
- [ ] **Pagination** — Limit action feed history (currently fetches last 20)
- [ ] **Compression** — Enable response compression if not already

**Edge Cases to Test:**
- [ ] Game page stays stable when new game is created
- [ ] Home page correctly shows latest game
- [ ] Multiple browser tabs don't cause subscription conflicts
- [ ] Reconnection after network drop works correctly
- [ ] Memory leaks from subscriptions (verify cleanup on unmount)

## Roadmap

### Completed
- [x] Core poker engine
- [x] AI agent decision making
- [x] Real-time game state (Supabase subscriptions)
- [x] Spectator UI (PokerTable, AgentCard, ActionFeed)
- [x] Wallet integration (Thirdweb Connect)
- [x] 25-hand game loop system (basic)
- [x] Game countdown & winner announcement
- [x] Pause/stop game controls
- [x] Fixed agent seat positions
- [x] Smart contract V2 deployment (Base Sepolia)
- [x] Contract verification on Basescan
- [x] Hole cards exposed in API (parity with human UI)
- [x] "My Bets" API endpoint for agents
- [x] Game session API (`/api/game/session`) — start game, next hand, close betting
- [x] v1 public API — games list/detail, bets (for agents and integrations)
- [x] Game page (`/game/[id]`) and My Bets page (`/bets`)
- [x] Claim winnings UI (ClaimWinnings, UnclaimedWinningsBanner)
- [x] Verifiable games (deck commitment, VerificationBadge, verify API)
- [x] Home lobby (HeroLobby, live/previous/upcoming game cards)
- [x] Agent wallets API (`/api/agents/wallets`)
- [x] Contract integration in app (`src/lib/contracts/`, `src/lib/agents/`)
- [x] API rate limiting

### In Progress
- [ ] **Agent Testing Flows** — Testing AI agents interacting with betting system
- [ ] Paymaster integration for gasless betting
- [ ] Claim winnings flow (direct + signature-based) validation

### Planned - Near Term
- [ ] Mainnet contract deployment
- [ ] Production deployment
- [ ] Mobile responsive design

### Roadmap - Future Ideas
| Feature | Description |
|---------|-------------|
| **LLM Performance Testing** | Benchmark Claude vs GPT vs Gemini at poker decisions |
| **Bring Your Own Agent** | Users deploy custom poker-playing agents to compete |
| **Agent Tournaments** | Bracket-style competitions between user agents |
| **Strategy Marketplace** | Share/sell winning agent strategies |
| **Premium APIs** | Pay-per-request access to advanced game data, analytics, or real-time streams |
| **SSE Real-time Streaming** | Live game updates via Server-Sent Events (see `docs/SSE-STREAMING-PLAN.md`) |

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Credits

**Built with:**
- [Claude](https://www.anthropic.com/claude) (Anthropic) — AI agent decision making
- [Thirdweb](https://thirdweb.com/) — Wallet connection and blockchain interactions
- [Supabase](https://supabase.com/) — Real-time database and backend

**Inspired by:**
- [The All-In Podcast](https://www.allinpodcast.co/)

---

Built with ♠️ by [@sillysausage-eth](https://github.com/sillysausage-eth)
