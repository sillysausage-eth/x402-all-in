# Agent All In - Project Plan

<!-- Updated: February 16, 2026 — Pivoted vision from agent betting game to LLM benchmark arena.
  Restructured roadmap into phased approach: v1 personality betting, v2 multi-model, v3 prediction market.
  Condensed session logs. Added model support matrix, lobby types, and detailed launch checklist.
  Deployed PokerBettingV2 to Base Mainnet. Verified on Basescan. Ownership transferred to x402 Wallet.
  Updated launch checklist, deployed addresses, and completed work sections.
  Completed mainnet end-to-end testing: game creation, betting, resolution, claiming all verified.
  Fixed multiple production bugs discovered during testing. Added auto-claim for server wallet seeds.
  Added chain_id isolation to prevent testnet/mainnet data contamination. -->

> AI agents play Texas Hold'em while spectators bet on outcomes. What starts as a personality-driven poker game becomes a living benchmark for LLMs — where the market decides which model is best.

**Created:** January 5, 2026
**Last Updated:** February 16, 2026
**Status:** Pre-Launch (v1)
**URL:** https://agentallin.com
**Supabase Project:** `msnukctjfdzibadaanvm`

---

## Vision

Agent All In is an **LLM benchmark disguised as a poker game**.

In most benchmarks, models answer multiple-choice questions in a vacuum. Agent All In puts them in a **strategic, adversarial, multi-agent environment** — Texas Hold'em poker — where reasoning, bluffing, risk assessment, and opponent modeling all matter. The twist: spectators bet real money (USDC) on which model will win, creating a **prediction market for AI capability**.

**Phase 1 (Launch):** Four AI personalities (all Claude) compete. Spectators bet on which personality archetype plays best poker. Fun, social, entertaining.

**Phase 2 (Multi-Model):** Claude vs GPT vs Gemini vs Grok vs open-source models. Same game, but now it becomes a meaningful benchmark. Which LLM reasons best under adversarial pressure?

**Phase 3 (Prediction Market):** The betting layer evolves from parimutuel pools into an AMM-based prediction market (a la Polymarket). Continuous odds, deeper liquidity, and real price discovery for model capability.

---

## Model Support

### Currently Integrated

| Model | Provider | SDK Package | Status |
|-------|----------|-------------|--------|
| Claude Haiku 4.5 | Anthropic | `@ai-sdk/anthropic` | Active (all 4 agents) |

### Target Models (Priority Order)

We use the **Vercel AI SDK** which has a unified provider interface. Adding a new model is primarily a config change + prompt tuning. Priority models for v2:

#### Closed Source

| Model | Provider | SDK Package | Why |
|-------|----------|-------------|-----|
| **GPT-4o** | OpenAI | `@ai-sdk/openai` | Most widely used, strong reasoning |
| **GPT-4o mini** | OpenAI | `@ai-sdk/openai` | Fast/cheap, interesting contrast to 4o |
| **o3-mini** | OpenAI | `@ai-sdk/openai` | Reasoning model, interesting poker behavior |
| **Gemini 2.0 Flash** | Google | `@ai-sdk/google` | Fast, multimodal, Google flagship |
| **Gemini 2.0 Pro** | Google | `@ai-sdk/google` | Deeper reasoning variant |
| **Grok 3** | xAI | `@ai-sdk/xai` | New contender, strong benchmarks |
| **Grok 3 Mini** | xAI | `@ai-sdk/xai` | Reasoning-focused variant |
| **Command R+** | Cohere | `@ai-sdk/cohere` | Enterprise-focused, different approach |

#### Open Source (via Together.ai / Fireworks / OpenRouter)

| Model | Creator | Access Via | Why |
|-------|---------|-----------|-----|
| **Llama 3.3 70B** | Meta | `@ai-sdk/openai` (custom baseURL) | Top open-source model |
| **Llama 3.1 405B** | Meta | `@ai-sdk/openai` (custom baseURL) | Largest open-source, benchmark ceiling |
| **DeepSeek-V3** | DeepSeek | `@ai-sdk/openai` (custom baseURL) | Strong reasoning, cost-efficient |
| **DeepSeek-R1** | DeepSeek | `@ai-sdk/openai` (custom baseURL) | Chain-of-thought reasoning model |
| **Mistral Large 2** | Mistral | `@ai-sdk/mistral` | European flagship |
| **Mixtral 8x22B** | Mistral | `@ai-sdk/mistral` | MoE architecture, unique behavior |
| **Qwen 2.5 72B** | Alibaba | `@ai-sdk/openai` (custom baseURL) | Top Chinese open-source model |

### Integration Architecture

The Vercel AI SDK provider system means adding models is straightforward:

```typescript
// Current (single provider)
import { anthropic } from "@ai-sdk/anthropic";
const model = anthropic("claude-haiku-4-5-20251001");

// Future (multi-provider, same interface)
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";

const models = {
  "claude-haiku": anthropic("claude-haiku-4-5-20251001"),
  "gpt-4o": openai("gpt-4o"),
  "gemini-flash": google("gemini-2.0-flash"),
  "grok-3": xai("grok-3"),
  "llama-70b": openai("meta-llama/Llama-3.3-70B", { baseURL: "https://api.together.xyz/v1" }),
};
```

All models use the same `generateText()` / `generateObject()` interface from the AI SDK. The poker prompt system, decision parsing, and game engine remain unchanged.

---

## Lobby Types

### v1: The All-In Lobby (Launch)

The original game. Four AI personalities — Chamath, Sacks, Jason, Friedberg — all powered by Claude. Spectators bet on which personality wins. Entertainment-first, social, fun.

- **Agents:** 4 fixed personalities (All-In Podcast hosts)
- **Model:** All Claude Haiku 4.5
- **Betting:** Parimutuel pools
- **Format:** 25-hand tournament, auto-launching
- **Vibe:** Casual, entertaining, meme-worthy

### v2: Model Arena Lobbies

Serious benchmarking. Model vs model vs model vs model. Same base poker prompt, different LLMs. The game becomes a real-time benchmark where the market (bettors) prices in model capability.

- **Agents:** Named by model (e.g., "Claude", "GPT-4o", "Gemini", "Grok")
- **Model:** Each agent runs a different LLM
- **Betting:** Parimutuel (v2a) then AMM prediction market (v2b)
- **Format:** Configurable tournament length
- **Vibe:** Competitive, data-driven, benchmark-oriented

### v3: Open Arena Lobbies (Future)

Users write their own system prompts and pit them against each other. Prompt engineering as a competitive sport. Still poker, but the "personality" is user-authored.

- **Agents:** User-submitted prompts
- **Model:** Configurable (users pick model + write prompt)
- **Betting:** Other users bet on whose prompt plays best
- **Format:** Challenge-based or tournament brackets
- **Vibe:** Competitive, creative, community-driven

---

## Roadmap

### v1.0 — Personality Poker (Current Sprint, Launch ASAP)

Ship the current game. Four All-In Podcast personalities, all Claude, parimutuel betting, auto-launching games.

**Status:** Core game functional. Smart contract deployed to Base Mainnet. Need final polish + go-live.

See [v1 Launch Checklist](#v1-launch-checklist) below for full breakdown.

### v1.1 — Stability + Polish

Post-launch iteration based on real user feedback.

- [ ] Mobile responsiveness improvements
- [ ] Performance optimization (RPC calls, polling intervals)
- [ ] Error handling edge cases
- [ ] Analytics dashboard (game stats, betting volume, popular agents)
- [ ] Gasless claiming via Paymaster (improve UX for small bettors)

### v2.0 — Multi-Model Arena

The big feature unlock. Multiple LLMs compete head-to-head.

- [ ] Model provider abstraction layer (config-driven model selection per agent)
- [ ] New lobby type: "Model Arena" with model-named agents
- [ ] Lobby creation system (multiple concurrent lobbies)
- [ ] Model leaderboard (win rates, ELO ratings, earnings generated)
- [ ] Updated UI to show which model each agent is running
- [ ] Prompt standardization (fair base prompt across all models)
- [ ] Cost tracking per model (some models are 100x more expensive)
- [ ] Rate limiting per provider (different APIs have different limits)

### v2.1 — Lobby System

- [ ] Multiple concurrent lobbies (lobby list page)
- [ ] Lobby filtering (by type, status, stakes)
- [ ] Lobby creation API (programmatic lobby creation)
- [ ] Different tournament formats (heads-up, 4-player, 6-player)

### v3.0 — AMM Prediction Market

Evolve from parimutuel to AMM-based prediction market.

- [ ] Research AMM mechanism design (constant product, LMSR, etc.)
- [ ] New smart contract: AMM-based betting (likely new contract, not upgrade)
- [ ] Continuous odds / price discovery (not just pool-based)
- [ ] Liquidity provision (LPs earn fees)
- [ ] Order book or AMM visualization
- [ ] Position trading (sell your position before game ends)

### v3.1 — Open Arena

- [ ] User prompt submission system
- [ ] Prompt moderation / safety filters
- [ ] Challenge system (1v1 or tournament brackets)
- [ ] Prompt marketplace / sharing
- [ ] User profiles with prompt history and win rates

### Ongoing — Content + Narrative

Long-form content about what we are building and why. Builds audience, establishes credibility, and serves as a reference for each release.

- [ ] Decide platform (X threads, blog, Substack, or on-site)
- [ ] Write launch post for v1 (motivations, what it is, how to play)
- [ ] Write V2 roadmap post (LLM benchmark thesis, model arena vision)
- [ ] Post-launch analysis posts (interesting game data, model behaviors)
- [ ] Link posts back to the About page / site for discoverability
- [ ] Ongoing narrative around AI capability + prediction markets

---

## v1 Launch Checklist

Everything needed to go live with the current game.

### Smart Contract (Mainnet Deployment) -- COMPLETED Feb 16, 2026

- [x] **Deploy PokerBettingV2 to Base Mainnet**
  - Proxy: `0x64ABd4F790ef8a44B89c6C3f4124ACdA3971B40b`
  - Implementation: `0x5E4a0e0384aB562F341b2B86Ed50336206056053`
  - Initialized with Base USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`), treasury = server wallet, 500 bps fee
- [x] **Verify contract on Basescan** — both proxy and implementation verified
- [x] **Update `src/lib/contracts/config.ts`** with mainnet addresses
- [x] **Transfer ownership** to x402 Thirdweb Server Wallet (`0xd38F...01D`) — confirmed on-chain
- [x] **Fix hardcoded testnet address** in `src/app/api/v1/bets/route.ts` — now uses config system
- [x] **Environment variable swap** — `NEXT_PUBLIC_CHAIN_ENV=production` configured in Vercel
- [x] **On-chain smoke test** — owner, USDC, fee, treasury, totalGames, minBet all verified
- [x] **Fund server wallet** with USDC for pool seeding ($0.40 per game = 10c per agent)
- [x] **End-to-end mainnet test** — 2 full games played, bet placed, game resolved, winnings claimed
  - Game 1: Friedberg won, server auto-claimed seeds
  - Game 2: Chamath won, user claimed $0.39 net (bet $0.10, won $0.30, fee $0.02)
  - Verified treasury receives fees ($0.045 accumulated)
  - Verified server wallet auto-claims seed winnings after each resolved game
  - Verified cancelled game refund flow (orphaned on-chain game 1)

### Game Auto-Launching

- [ ] **Auto-create next game** when current game resolves
  - After `resolveGame()`, automatically call `createGame()` for next game
  - Configurable cooldown between games (e.g., 2 minutes)
- [ ] **Countdown timer** between games (visible on home page)
- [ ] **Game queue system** — always have a "next game" ready
- [ ] **Error recovery** — if a game gets stuck, auto-cancel and create new one
- [ ] **Health monitoring** — detect stalled games (no action for >60s)

### Game Flow Hardening

- [x] **End-to-end mainnet test** — 2 full games, creation → betting → resolution → claiming all verified
- [ ] **Multi-user betting test** — multiple wallets betting simultaneously
- [x] **Edge case: all agents fold except one** — verified, immediate resolution works (occurred in hands 2-4 of game 2)
- [ ] **Edge case: agent elimination** — verify game continues with fewer agents
- [ ] **Edge case: simultaneous all-ins** — verify side pot calculation
- [x] **Betting window enforcement** — on-chain betting closes after hand 2, verified in game 2
- [x] **Game resolution reliability** — `resolveOnChainGame()` works reliably, auto-claim follows
- [x] **Chain isolation** — added `chain_id` column to games table, all queries filter by chain
- [x] **Duplicate game guard** — 409 conflict if active game already exists for lobby+chain

### UI / UX Polish

- [ ] **Home page: live game state** — real-time game status on hero card
- [ ] **Home page: completed games** — show recent results with winners
- [ ] **Game page: spectator count** (nice to have)
- [ ] **Betting panel: loading states** — skeleton UI while contract data loads
- [ ] **Betting panel: error messages** — clear feedback on failed transactions
- [ ] **Claim flow: success confirmation** — clear "winnings claimed" state
- [ ] **Mobile layout** — verify all pages work on phone screens
- [ ] **Unclaimed winnings banner** — persistent reminder across pages
- [ ] **Connection state handling** — graceful behavior when wallet disconnects mid-game

### Infrastructure

- [ ] **Domain + hosting verified** — agentallin.com on Vercel
- [ ] **Environment variables in Vercel** — all API keys set for production
- [ ] **Supabase production config** — RLS policies, connection pooling
- [ ] **Rate limiting** — API routes protected from abuse
- [ ] **Error logging** — capture and alert on game failures
- [ ] **Database indexes** — optimize queries for game list, bet history

### Pre-Launch Testing

- [ ] **Testnet dress rehearsal** — run 10+ full games back-to-back
- [ ] **Betting flow test** — place bets, watch game, claim winnings (multiple users)
- [ ] **Contract edge cases** — bet on loser, bet on cancelled game, double-claim
- [ ] **Browser testing** — Chrome, Firefox, Safari, mobile browsers
- [ ] **Wallet testing** — MetaMask, Coinbase Wallet, Rainbow, WalletConnect

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **AI SDK** | Vercel AI SDK (`ai` v6) |
| **AI Provider** | Anthropic (`@ai-sdk/anthropic`) |
| **Database** | Supabase (Postgres + Realtime) |
| **Blockchain** | Base (L2) via Thirdweb SDK |
| **Wallet** | Thirdweb Connect (350+ wallets + social login) |
| **Smart Contract** | Solidity (Foundry), UUPS Upgradeable |
| **Hosting** | Vercel |

### Project Structure

```
x402-all-in/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Home — hero + game grid
│   │   ├── game/[id]/page.tsx        # Game — poker table + betting
│   │   ├── bets/page.tsx             # Bet history + claiming
│   │   ├── about/page.tsx            # About page
│   │   ├── developers/page.tsx       # Docs + API links
│   │   └── api/
│   │       ├── game/
│   │       │   ├── orchestrator/     # Hand-level game engine
│   │       │   └── session/          # Game lifecycle management
│   │       └── v1/                   # Public API (games, bets)
│   ├── components/
│   │   ├── poker/                    # PokerTable, AgentCard, BettingPanel, ActionFeed, etc.
│   │   ├── home/                     # HeroLobby, CompletedGameCard
│   │   └── layout/                   # Header, ConnectWalletButton
│   ├── hooks/                        # useGameState, useGameSession, useAgents
│   ├── lib/
│   │   ├── ai/agent-decision.ts      # LLM decision engine
│   │   ├── poker/                    # Game engine, hand evaluator, deck
│   │   ├── contracts/                # Smart contract integration
│   │   └── supabase/                 # Database clients
│   └── types/                        # TypeScript types (agents, poker, database)
├── contracts/                         # Foundry project
│   ├── src/PokerBettingV2.sol        # UUPS upgradeable betting contract
│   ├── test/                         # 55 passing tests
│   └── script/                       # Deployment scripts
├── docs/                              # Documentation
└── public/                            # Assets (avatars, logos)
```

### Database Schema

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agents` | AI player profiles | name, slug, avatar_url, chip_count |
| `lobbies` | Game lobbies | name, small_blind, big_blind |
| `hands` | Individual poker hands | lobby_id, hand_number, pot_amount, community_cards, winner_agent_id |
| `hand_agents` | Per-hand player state | hand_id, agent_id, hole_cards, chip_count, is_folded, is_all_in |
| `agent_actions` | Action history | hand_id, agent_id, action_type, amount, reasoning |
| `spectator_bets` | Betting records | hand_id, user_wallet, agent_id, amount, odds_at_bet |

### Smart Contract

**PokerBettingV2** — UUPS upgradeable parimutuel betting on Base.

| Property | Value |
|----------|-------|
| Network | Base Sepolia (testnet) / Base Mainnet (production) |
| Token | USDC (6 decimals) |
| Min Bet | 0.10 USDC |
| House Fee | 5% of profit only |
| Pattern | Parimutuel pools, pull-based claiming |
| Security | ReentrancyGuard, Ownable2Step, SafeERC20, Pausable, CEI |
| Tests | 55 passing (unit, fuzz, security, attack vectors) |
| Audits | 2 rounds completed, all issues fixed |

**Deployed Addresses (Sepolia — Testnet):**

| Contract | Address |
|----------|---------|
| PokerBettingV2 (Proxy) | `0x313A6ABd0555A2A0E358de535833b406543Cc14c` |
| PokerBettingV2 (Impl) | `0xDEDda864eF09BC93E1F3D78fa655f3d7E6C104CD` |
| MockUSDC | `0xf56873A99B2E5F83562F01996f46C42AFAEc9f84` |
| Server Wallet | `0xd38Fecd44cEcBa7f8EE51Fd5f7B35981D8Ebd01D` |

**Deployed Addresses (Base Mainnet — Production):**

| Contract | Address |
|----------|---------|
| PokerBettingV2 (Proxy) | `0x64ABd4F790ef8a44B89c6C3f4124ACdA3971B40b` |
| PokerBettingV2 (Impl) | `0x5E4a0e0384aB562F341b2B86Ed50336206056053` |
| USDC (Circle) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Server Wallet | `0xd38Fecd44cEcBa7f8EE51Fd5f7B35981D8Ebd01D` |

### Game Flow

```
Game Lifecycle:
  createGame() → waiting (countdown) → start_game → betting_open
    → [Hand 1..25: start_hand → next_action (AI decisions) → advance_round → resolve_hand]
    → betting closes (after hand 2)
    → game resolves → winner determined → on-chain resolution
    → spectators claim winnings
    → auto-create next game

AI Decision Flow:
  Game state → Build prompt (personality + cards + history + position)
    → Claude generateObject() → { action, amount, reasoning }
    → Validate action → Apply to game engine → Store in DB → Broadcast via Realtime
```

### Betting Flow

```
Spectator Betting:
  1. Connect wallet (Thirdweb - 350+ wallets + social login)
  2. Approve USDC spend (one-time per amount)
  3. placeBet(gameId, agentId, amount) → on-chain transaction
  4. Pool odds update in real-time (read from contract)
  5. Game resolves → resolveGame(gameId, winnerAgentId) on-chain
  6. Winners call claimWinnings(gameId) → receive proportional payout minus 5% fee
  7. Losers get nothing (principal lost)

Parimutuel Odds:
  - Each agent has a pool of USDC bets
  - Your payout = (your bet / winner pool) * total pool * 0.95
  - Odds shift as more bets come in
  - Displayed as % chance (pool share) in UI
```

---

## Agent Personalities (v1)

| Agent | Persona | Play Style |
|-------|---------|-----------|
| **Chamath** | Sri Lankan-Canadian VC, bold, direct | Aggressive, loves big bluffs |
| **Sacks** | PayPal COO, dry wit, methodical | Tight, analytical, patient |
| **Jason** | Angel investor, enthusiastic, energetic | Loose, optimistic, action-oriented |
| **Friedberg** | Data scientist, calm, systematic | Math-driven, calculated risks |

All four run on Claude Haiku 4.5 with personality-specific system prompts. In v2, these become model-named agents (each running a different LLM).

---

## Completed Work

### Foundation (Jan 5-8, 2026)
- Next.js 16 + TypeScript + Tailwind scaffolding
- Supabase setup (6 tables, realtime enabled, RLS)
- Thirdweb wallet integration (350+ wallets, social login, USDC display)
- 4 AI agent personalities defined and seeded
- Poker-themed dark mode design system

### Poker Engine (Jan 6-9, 2026)
- Full Texas Hold'em game engine (state machine, betting rules)
- Hand evaluator (Royal Flush through High Card)
- Deck with deterministic seeds and commitment/verification
- Side pot calculation for all-in scenarios
- 25-hand tournament loop with blinds and dealer rotation

### AI Decision Making (Jan 8-10, 2026)
- Claude Haiku integration via Vercel AI SDK
- Personality-driven prompts for each agent
- Game orchestrator API (hand lifecycle management)
- Position-aware, history-aware decision making with reasoning

### Smart Contract (Jan 10-22, 2026; Mainnet Feb 16, 2026)
- PokerBettingV2.sol — UUPS upgradeable, 670 lines
- Parimutuel betting with profit-only 5% fee
- 55 tests passing (unit, fuzz, security, attack vectors)
- 2 security audit rounds, all issues fixed
- Deployed and verified on Base Sepolia (Jan 20) and Base Mainnet (Feb 16)
- TypeScript integration (types, ABI, React hooks)
- Server Wallet API (no private keys)
- Network-aware config system (`NEXT_PUBLIC_CHAIN_ENV` switches testnet/mainnet)

### UI/UX (Jan 6-14, 2026)
- Poker table with player positions, cards, chips, animations
- Real PNG headshots (All-In Podcast hosts)
- Polymarket-style betting panel with live odds
- Action feed with reasoning display
- Home page with hero lobby + completed game grid
- Game countdown timer, winner announcements, claim flow
- Betting history page with transaction links

### Branding + Legal (Jan 26, 2026)
- Rebranded from "x402 All-In" to "Agent All In"
- About page, developers/docs page
- Terms of Service + Privacy Policy
- Footer with All-In Podcast attribution
- Logo, social links, legal pages

### Mainnet Testing + Bug Fixes (Feb 16, 2026)
- End-to-end mainnet testing: 2 full games played with real USDC
- Chain isolation: added `chain_id` to games table, all queries filter by chain to prevent testnet/mainnet contamination
- Duplicate game guard: prevents creating multiple active games on the same chain
- Auto-claim server wallet winnings after game resolution (reclaims seed USDC)
- Auto-refund server wallet on cancelled games
- Fixed orchestrator max_hands guard (`>=` → `>`) that skipped the final hand
- Fixed hand_agents chip_count not updating after pot distribution (caused stale GameFinished UI)
- Fixed hardcoded Base Sepolia explorer URLs across ClaimWinnings, Bets page, About page, and Footer
- Dynamic network error messages in useUserBets (checks correct chain based on env)
- Cleaned up orphaned on-chain games (cancelled + refunded)
- Metrics page now correctly filters by chain_id for hand wins and total hands

### Infrastructure
- Verifiable games (commit-reveal deck scheme)
- API endpoints (games, bets, agents)
- Rate limiting on all public endpoints
- Server Wallet migration (Thirdweb, no private keys)

---

## Development History

### January 5-9: Foundation + Poker Engine
Built the core Next.js app, Supabase database, poker engine, and AI decision system. Four All-In Podcast personalities playing Claude-powered Texas Hold'em.

### January 10: Wallet + Smart Contract
Integrated Thirdweb for multi-wallet support. Built PokerBetting.sol with parimutuel betting, passed 55 tests across 2 security audit rounds. Deployed to Base Sepolia.

### January 12-14: Betting UI + Integration
Connected betting panel to deployed contract. Polymarket-style UI with live odds, payout preview, multi-bet support. Home page redesign with hero lobby. Bug fixes for RPC rate limiting, USDC approvals, countdown sync.

### January 20: Simplification + Verifiability
Removed agent-to-agent payments (agents are house-controlled). Added commit-reveal deck verification. Built x402 betting API (later deprecated). Added rate limiting. Deployed PokerBettingV2 (UUPS upgradeable).

### January 22: Contract V2 + Cleanup
Verified V2 on Basescan. Cleaned up deprecated V1 code. Migrated to Server Wallet API. Regenerated ABI for V2 features (EIP-712 gasless claims).

### January 23: Strategic Pivot
Tested x402 protocol for betting, decided to archive it. Direct on-chain betting is simpler and more reliable. x402 better suited for premium API access (future).

### January 26: Rebranding
Full rebrand from "x402 All-In" to "Agent All In". Updated all pages, legal, docs, README. New domain: agentallin.com.

### February 16: Vision Pivot + Mainnet Deployment
Repositioned from "agent betting game" to "LLM benchmark arena". Roadmap restructured: v1 personality betting (launch), v2 multi-model arena, v3 AMM prediction market. Deployed PokerBettingV2 to Base Mainnet via Foundry. Verified both proxy and implementation on Basescan. Transferred ownership to x402 Thirdweb Server Wallet. Fixed hardcoded testnet addresses in bets API route to use config system. Reduced pool seeding from 25c to 10c per agent.

### February 16: Mainnet Testing + Production Bug Fixes
Ran 2 full games on Base Mainnet with real USDC. Discovered and fixed multiple production issues:
- **Chain isolation bug**: Testnet and mainnet games shared the same database without differentiation. Added `chain_id` column to games table with migration, backfilled existing data, and filtered all game queries by chain.
- **Duplicate game creation**: Two games created simultaneously due to rapid API calls. Added duplicate game guard (409 conflict response).
- **USDC approval amount**: Hardcoded 1000 USDC approval instead of exact bet amount. Fixed to approve exact amount.
- **Final hand skipped**: Orchestrator `>=` guard blocked hand 5/5 from playing. Changed to `>`.
- **Stale chip counts on GameFinished**: `hand_agents` table not updated after pot distribution. Added post-resolution update.
- **Hardcoded Sepolia URLs**: ClaimWinnings, Bets page, About page, Footer all pointed to testnet explorer. All now use dynamic `getCurrentConfig().explorer`.
- **Static network error**: "Switch to Base Sepolia" shown on mainnet. Now dynamic based on `getCurrentConfig()`.
- **Auto-claim**: Server wallet now automatically claims seed winnings after each game resolution and refunds on cancelled games.
- Treasury verified at server wallet address, accumulated fees confirmed ($0.045 from 2 games).

---

## Known Bugs (Priority)

### P1 — Bets Page Not Displaying User Bets
**Status:** Open
**Discovered:** February 16, 2026 (mainnet testing)
**Page:** `/bets` (client-side `useUserBets` hook)

The Bets page does not display the user's betting history despite on-chain data being correct and verifiable via `cast`. Root causes identified:

1. **`useUserBets` hook**: Reads all games sequentially via thirdweb `readContract`. Suspected RPC timeout/rate-limiting when iterating multiple games causes silent failures (per-game try/catch swallows errors). Even the server-side `/api/v1/bets` route drops game 2 data in the all-games query while returning it correctly when queried individually.
2. **v1/bets API `STATUS_MAP` is wrong**: Status values are offset by 1 from the contract enum (`Resolved=2` mapped to `"betting_closed"`, `Cancelled=3` mapped to `"resolved"`). The `isResolved` check uses `game.status === 3` instead of `=== 2`.
3. **No claim/refund status shown**: The `spectator_bets` table has no mainnet records (bets are only tracked on-chain). Claim history is not surfaced.

**Fix plan:**
- Fix STATUS_MAP alignment in `/api/v1/bets` route
- Parallelize contract reads in `useUserBets` (use `Promise.all` per game instead of sequential awaits)
- Add explicit RPC URL to contract reads (use `baseCustom` chain with public RPC instead of wallet chain)
- Add visible error/loading states and retry button

---

## Key Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI SDK | Vercel AI SDK | Unified interface for multiple providers, already integrated |
| Blockchain | Base L2 | Low gas fees (~$0.001), fast finality, USDC native |
| Betting Model (v1) | Parimutuel | Already built and tested, simple UX, launch fast |
| Betting Model (future) | AMM (Polymarket-style) | Better price discovery, continuous liquidity, position trading |
| Wallet | Thirdweb Connect | 350+ wallets, social login, built-in fiat on-ramp |
| Database | Supabase | Postgres + Realtime subscriptions, fast iteration |
| Contract Pattern | UUPS Proxy | Upgradeable without redeployment, future-proof |
| Multi-model Access | Vercel AI SDK providers | Native support for all major providers, same interface |
| Open-source Models | Together.ai / Fireworks | Hosted inference, OpenAI-compatible API, works with AI SDK |
| x402 Protocol | Archived | Direct on-chain betting is simpler; x402 for premium APIs later |
| Gasless Claims | Deferred to v1.1 | Launch with user-paid gas first, add Paymaster post-launch |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers
ANTHROPIC_API_KEY=              # Claude (current)
OPENAI_API_KEY=                 # GPT models (v2)
GOOGLE_GENERATIVE_AI_API_KEY=   # Gemini (v2)
XAI_API_KEY=                    # Grok (v2)
TOGETHER_API_KEY=               # Open-source models (v2)

# Blockchain
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=

# App
NEXT_PUBLIC_BASE_URL=
```

---

## Links

- **Live App:** https://agentallin.com
- **Contract (Mainnet):** [Basescan](https://basescan.org/address/0x64ABd4F790ef8a44B89c6C3f4124ACdA3971B40b#code)
- **Contract (Sepolia):** [Basescan](https://sepolia.basescan.org/address/0x313A6ABd0555A2A0E358de535833b406543Cc14c#code)
- **Poker Rules:** [docs/TEXAS_HOLDEM_RULES.md](./TEXAS_HOLDEM_RULES.md)
- **Contract Docs:** [docs/POKER_BETTING_V2_IMPLEMENTATION.md](./POKER_BETTING_V2_IMPLEMENTATION.md)
