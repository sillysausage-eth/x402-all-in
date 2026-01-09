# 🎰 AI Poker Arena - Project Plan

> AI agents with personalities play Texas Hold'em while spectators bet on outcomes using USDC on Base via x402 payments.

**Created:** January 5, 2026  
**Last Updated:** January 7, 2026 (Evening)  
**Status:** ✅ Fully Functional - Ready for Game Loop & Smart Contract development  
**Supabase Project:** `msnukctjfdzibadaanvm`

---

## 📊 Progress Tracker

### ✅ Completed

#### Phase 1: Foundation
- [x] Project scaffolding with Next.js 15 + TypeScript + Tailwind
- [x] Dependencies installed (Supabase, OnchainKit, wagmi, viem, AI SDK, Framer Motion)
- [x] Type definitions created (database, poker, agents)
- [x] 4 AI agent personalities defined (Chamath, Sacks, Jason, Friedberg)
- [x] Supabase client setup (browser + server with new key system)
- [x] Wagmi/OnchainKit configuration for Base network
- [x] Web3 provider wrapper components
- [x] Poker-themed dark mode CSS design system
- [x] Database migrations applied (6 tables + custom columns)
- [x] AI agents seeded (4 agents in database)
- [x] Main poker lobby created ("Main Table")
- [x] Realtime enabled on game tables

#### Phase 2: Poker Engine & UI
- [x] Spectator view UI built (main page with live data)
- [x] Poker engine built (deck, hand evaluator, game state machine)
- [x] Supabase realtime hooks (useGameState, useAgents)
- [x] Live game state subscriptions (hands, hand_agents, agent_actions)
- [x] Avatar images (SVG avatars for all 4 agents)
- [x] Main page wired to real data (with fallback mock data)

#### Phase 3: AI Decision Making & Game Orchestrator ✅ NEW
- [x] AI decision-making with Claude Haiku 3.5 (Anthropic API)
- [x] Personality-driven prompts for each agent (real personas)
- [x] Game orchestrator API route (`/api/game/orchestrator`)
- [x] Full hand lifecycle: `start_hand` → `next_action` → `advance_round` → resolve
- [x] Valid action calculation (check/call/raise/fold/all-in)
- [x] Minimum raise enforcement
- [x] Proper turn order (clockwise, accounting for raises re-opening action)
- [x] Preflop and post-flop betting rules correctly implemented
- [x] Run Hand button in UI for testing

#### Phase 4: Advanced Poker Mechanics ✅ NEW
- [x] **Persistent chip counts** - Chips saved to `agents` table, persist across hands
- [x] **Blinds system** - Small blind ($10) and big blind ($20) with proper posting
- [x] **Dealer rotation** - Dealer button rotates clockwise each hand
- [x] **All-in mechanics** - Players can go all-in, capped at what opponents can match
- [x] **Run out the board** - When all players all-in, deal remaining community cards
- [x] **Side pots** - Correctly calculated and distributed for all-in scenarios
- [x] **Hand evaluation** - Full Texas Hold'em hand ranking (Royal Flush → High Card)
- [x] **Split pots** - Handled for ties with equal hand strength
- [x] **Texas Hold'em Rules Document** - `docs/TEXAS_HOLDEM_RULES.md` for reference

#### Phase 5: UI Polish ✅ NEW
- [x] **Player boxes at corners** - Clean layout with cards inside each box
- [x] **Action chips on table** - FOLD, CHECK, CALL, RAISE, ALL-IN, BLIND displayed
- [x] **SB/BB/Dealer chips** - Visual indicators on player avatars
- [x] **Winner announcement** - Animated badge on winning player
- [x] **Winning hand display** - Shows hand description (e.g., "Pair of Jacks")
- [x] **Pot-to-winner animation** - Chips animate from pot to winner
- [x] **Phased hand start** - Blinds post first, then cards deal, then play begins
- [x] **Community cards** - Progressive reveal (preflop→flop→turn→river)
- [x] **Round indicator** - Shows current betting round
- [x] **Winner chip count animation** - Winner's funds visually animate/count up after pot transfer ✅
- [x] **Split action/bet display** - Action type and bet amount as separate elements + bet-to-pot animation ✅
- [x] **Real-time chip count updates** - Chip counts update immediately after hand resolution (subscribed to agents table) ✅
- [x] **Winner in Live Action Feed** - Shows winner with hand description, hole cards, and pot amount won ✅

### 🔄 Next Up (Priority Order)

1. **Game Loop & Structure** - 25-hand games with betting window
2. **Smart Contract (Parimutuel)** - Spectator betting pool contract
3. **Wallet Integration** - Connect wallet, place bets, claim winnings
4. **Agent Payments (x402)** - Agent-to-agent USDC transfers per hand
5. **Final UI polish** - Game progress, betting UI, mobile

### ✅ Resolved UI Issues (Jan 6-7, 2026)

1. **Winner chip count animation** ✅ - Winner's chip count now animates/counts up after pot transfer with green glow effect and "+$X" delta indicator
2. **Split action/bet display** ✅ - Action pills (CHECK, CALL, RAISE, FOLD, ALL-IN, BLIND) display under player box. Bet amounts shown as separate chips on table. Bet-to-pot animation added when betting rounds end.
3. **Action pill inside player box** ✅ - Moved action pill inside the player box next to chip count for cleaner layout
4. **Smart action display logic** ✅ - FOLD/ALL-IN always shown (terminal states). CHECK/CALL/RAISE shown only when not active turn. BLIND hidden once player makes real action.
5. **Folded player visual state** ✅ - Folded players have dimmed boxes (opacity + grayscale), gray borders, and grayed text
6. **All-In Podcast branding** ✅ - Pure black theme matching allin.com, Inter font, "x402 All In" title with gold accent, Home/Metrics/About nav tabs, removed LIVE button, clean Connect Wallet button
7. **Header All-In style** ✅ - ALL CAPS navigation (HOME, METRICS, ABOUT), no hover backgrounds, TEQUILA-style rounded pill CONNECT WALLET button, no separator line
8. **Footer All-In style** ✅ - Social icons (X, GitHub, Base), copyright text, LEGAL section with Terms/Privacy, separator line at top, natural document flow (not sticky)
9. **Logo SVG** ✅ - Custom x402 ALL IN logo in header (stacked text style)
10. **Montserrat font** ✅ - Bold, modern font applied globally throughout webapp
11. **Extra bold titles** ✅ - All section titles uppercase and font-extrabold (MAIN TABLE, PREFLOP, BETTING CLOSED, TOTAL POOL, LIVE ACTION, LEGAL)
12. **Chip counts not updating after hand** ✅ (Jan 7) - Fixed by subscribing to `agents` table and using agent chip_count (not hand_agents) when hand is resolved
13. **Winner details in Live Action Feed** ✅ (Jan 7) - Feed now shows winner with 🏆 icon, winning hand description, hole cards formatted as [10♥ K♥], and pot amount won

---

## 📁 Project Structure

```
x402-all-in/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ✅ Updated with providers
│   │   ├── globals.css             ✅ Poker-themed dark mode + animations
│   │   ├── page.tsx                ✅ Spectator view with Run Hand button
│   │   └── api/game/
│   │       └── orchestrator/
│   │           └── route.ts        ✅ Full game orchestrator API
│   ├── components/
│   │   ├── poker/                  ✅ Complete UI components
│   │   │   ├── index.ts            ✅ Exports all poker components
│   │   │   ├── PlayingCard.tsx     ✅ Card rendering (xs/sm/md/lg sizes)
│   │   │   ├── AgentCard.tsx       ✅ Player boxes with cards inside
│   │   │   ├── PokerTable.tsx      ✅ Table with action chips, animations
│   │   │   ├── BettingPanel.tsx    ✅ Odds grid, countdown, bet input
│   │   │   └── ActionFeed.tsx      ✅ Live action log with reasoning + winner display (cards, hand, pot)
│   │   └── providers/
│   │       ├── index.tsx           ✅ Combined providers
│   │       └── web3-provider.tsx   ✅ OnchainKit + Wagmi
│   ├── hooks/
│   │   ├── index.ts                ✅ Barrel exports
│   │   ├── useGameState.ts         ✅ Realtime subscriptions (hands, hand_agents, agents, actions, bets)
│   │   └── useAgents.ts            ✅ Agent data fetching
│   ├── lib/
│   │   ├── poker/
│   │   │   ├── index.ts            ✅ Exports all poker logic
│   │   │   ├── deck.ts             ✅ Deck creation, shuffle, deal
│   │   │   ├── hand-evaluator.ts   ✅ Hand ranking, winner detection
│   │   │   └── game-engine.ts      ✅ State machine, betting rules
│   │   ├── ai/
│   │   │   ├── index.ts            ✅ Barrel exports
│   │   │   └── agent-decision.ts   ✅ Claude Haiku 3.5 poker decisions
│   │   ├── supabase/
│   │   │   ├── client.ts           ✅ Browser client (publishable key)
│   │   │   └── server.ts           ✅ Server client (secret key)
│   │   ├── utils.ts                ✅ Helper functions
│   │   └── wagmi-config.ts         ✅ Base chain config
│   └── types/
│       ├── agents.ts               ✅ Agent personalities + types
│       ├── database.ts             ✅ Supabase table types (updated)
│       └── poker.ts                ✅ Card/game state types
├── contracts/                        🔲 Foundry project (to build)
│   ├── src/
│   │   └── PokerBetting.sol          🔲 Parimutuel betting contract
│   ├── test/
│   │   └── PokerBetting.t.sol        🔲 Contract tests
│   ├── script/
│   │   └── Deploy.s.sol              🔲 Deployment scripts
│   └── foundry.toml                  🔲 Foundry config
├── public/
│   ├── logo.svg                    ✅ x402 ALL IN logo (stacked text)
│   └── avatars/                    ✅ Agent avatar SVGs
│       ├── chamath.svg             ✅ Purple gradient
│       ├── sacks.svg               ✅ Navy blue
│       ├── jason.svg               ✅ Orange/red
│       └── friedberg.svg           ✅ Teal/green
├── docs/
│   ├── PROJECT_PLAN.md             📍 You are here
│   └── TEXAS_HOLDEM_RULES.md       ✅ Full poker rules reference
├── package.json                    ✅ All deps installed
└── .env.local                      ✅ Configured with API keys
```

---

## 🗄️ Database Schema

### Tables (with custom columns added)

| Table | Key Columns | Status |
|-------|-------------|--------|
| `agents` | id, name, slug, avatar_url, **chip_count** | ✅ Persistent chips |
| `lobbies` | id, name, small_blind, big_blind | ✅ Seeded |
| `hands` | id, lobby_id, hand_number, pot_amount, community_cards, **current_round**, **dealer_position**, **active_agent_id**, **small_blind_agent_id**, **big_blind_agent_id**, **winner_agent_id**, **winning_hand** | ✅ Full tracking |
| `hand_agents` | id, hand_id, agent_id, seat_position, hole_cards, chip_count, current_bet, is_folded, is_all_in | ✅ Player state |
| `agent_actions` | id, hand_id, agent_id, action_type, amount, reasoning, round | ✅ Action history |
| `spectator_bets` | id, hand_id, user_wallet, agent_id, amount, odds_at_bet | ✅ Ready for betting |

### Agent Personalities

| Agent | Real Persona | Play Style |
|-------|--------------|------------|
| **Chamath** | Sri Lankan-Canadian VC, confident, direct, "let me be clear" | Varies based on situation |
| **Sacks** | PayPal COO, dry wit, methodical, patient | Varies based on situation |
| **Jason** | Angel investor, podcaster, enthusiastic, optimistic | Varies based on situation |
| **Friedberg** | "The Science Guy", analytical, calm, data-driven | Varies based on situation |

---

## 🎮 Game Orchestrator API

### Endpoints (`/api/game/orchestrator`)

```typescript
POST /api/game/orchestrator
Body: { action: string, handId?: string }

Actions:
- "start_hand"    → Creates new hand, posts blinds, deals cards
- "next_action"   → Gets AI decision for active player, applies it
- "advance_round" → Moves to next betting round (flop/turn/river)
- "auto_play_hand" → Runs entire hand automatically (for testing)
```

### Game Flow

```
1. start_hand
   ├── Rotate dealer position
   ├── Post blinds (SB $10, BB $20)
   ├── Deal 2 hole cards to each player
   └── Store all 5 community cards (hidden)

2. next_action (repeated)
   ├── Find next player to act (clockwise from dealer/last actor)
   ├── Get valid actions (check/call/raise/fold/all-in)
   ├── Query Claude Haiku 3.5 for decision
   ├── Apply action (update chips, pot, etc.)
   └── Check for round completion or hand resolution

3. advance_round (when betting complete)
   ├── Update current_round (preflop→flop→turn→river)
   ├── Reset current_bet for all players
   └── Reveal next community cards

4. resolve_hand (when hand ends)
   ├── Calculate side pots if needed
   ├── Evaluate all hands
   ├── Determine winner(s)
   ├── Distribute pot(s)
   └── Update agent chip_count in database
```

---

## 🃏 Poker Rules Implemented

See `docs/TEXAS_HOLDEM_RULES.md` for full reference.

### Betting Rounds
- **Preflop**: Action starts left of BB, BB can raise
- **Post-flop**: Action starts left of dealer button

### All-In & Side Pots
- All-in capped at what opponents can match
- Side pots created when players have different all-in amounts
- Excess chips returned to player
- "Run out the board" deals remaining cards when all players all-in

### Hand Rankings (High to Low)
1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

---

## 🎨 UI Features

### Player Boxes (corners of table)
- Avatar with D/SB/BB chip indicators
- Player name
- Current chip count (green/red coloring)
- Hole cards (inside the box)

### Table Elements
- Community cards (progressive reveal)
- Pot amount (center)
- Side pots (when applicable)
- Round indicator (Preflop/Flop/Turn/River)

### Action Indicators
- **FOLD** - Gray pill
- **CHECK** - Blue pill
- **CALL** - Green pill
- **RAISE** - Orange pill
- **ALL-IN** - Red pill
- **BLIND** - Amber pill

### Animations
- Card dealing (spring animation with delay)
- Winner announcement (pulsing gold border)
- Pot-to-winner transfer
- Phased hand start (blinds → cards → play)
- Thinking indicator for active player

---

## 🔧 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://msnukctjfdzibadaanvm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# AI (Claude Haiku 3.5)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Coinbase / OnchainKit
NEXT_PUBLIC_ONCHAINKIT_API_KEY=  # TODO: Get from CDP portal

# Chain Configuration
NEXT_PUBLIC_CHAIN_ENV=development  # Base Sepolia for testing

# Game Configuration
BETTING_WINDOW_SECONDS=20
STARTING_CHIP_COUNT=1000
```

---

## 📋 Detailed Next Steps

### 1. Game Loop & Structure - HIGH PRIORITY
```
- [ ] Create "Game" entity in Supabase (tracks 25 hands, status)
- [ ] Auto-advance hands (no manual "Run Hand" needed)
- [ ] Track betting window (open for hands 1-5, closed after)
- [ ] Handle agent elimination (bust = $0 chips)
- [ ] Determine game winner (last standing OR most chips at hand 25)
- [ ] Game status UI (hand X/25, betting open/closed, eliminated agents)
```

### 2. Smart Contract (Parimutuel Betting)
```
Foundry Setup:
- [ ] Initialize Foundry project in /contracts
- [ ] Configure Base Sepolia RPC
- [ ] Install OpenZeppelin contracts

Contract Development:
- [ ] Write PokerBetting.sol (~200 lines)
- [ ] Implement createGame(), placeBet(), closeBetting()
- [ ] Implement resolveGame(), claimWinnings(), cancelGame()
- [ ] Add view functions (getOdds, getPotentialPayout)
- [ ] Write comprehensive tests
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan

Frontend Integration:
- [ ] Generate TypeScript ABIs
- [ ] Create usePokerBetting hook
- [ ] Bet placement UI with USDC approval flow
- [ ] Real-time odds display
- [ ] Claim winnings UI
```

### 3. Wallet Integration
```
- [ ] Complete Connect Wallet button (OnchainKit)
- [ ] Show user USDC balance
- [ ] USDC approval for betting contract
- [ ] Transaction confirmations with toasts
- [ ] Betting history view
```

### 4. Agent Payments (x402)
```
- [ ] Set up x402 protocol integration
- [ ] Pre-fund 4 agent wallets with USDC
- [ ] After each hand: calculate USDC owed (1000:1 scaling)
- [ ] Execute x402 payments from losers to winner
- [ ] Handle edge cases (ties, all bust, etc.)
- [ ] Transaction logging
```

### 5. Final Polish
```
- [x] Winner animation ✅
- [x] Split action/bet display ✅
- [x] Action pill inside player box ✅
- [x] Folded/all-in visual states ✅
- [ ] Game progress indicator (HAND X/25)
- [ ] Betting window status (OPEN/CLOSED)
- [ ] Live odds chart
- [ ] Your bets panel
- [ ] Eliminated agent visual state (grayed out)
- [ ] Mobile responsiveness
- [ ] Performance optimization
```

---

## 🔗 Quick Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Test a hand (in browser)
Click "Run Hand" button on UI
```

---

## 📚 References

- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Live updates
- [Coinbase OnchainKit](https://onchainkit.xyz/) - Wallet integration
- [x402 Protocol](https://www.x402.org/) - Payment protocol
- [Anthropic Claude](https://docs.anthropic.com/) - AI decisions
- [Base Network](https://base.org/) - L2 blockchain
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

## 🎮 Game Structure

### Game Format
- **Max Hands**: 25 hands per game
- **Betting Window**: Hands 1-5 only (spectators can place bets)
- **Betting Closed**: Hands 6-25 (no new bets, watch the action)

### Win Conditions (in order of priority)
1. **Last Agent Standing**: If all other agents bust (chips = $0)
2. **Most Chips**: Agent with highest chip count after 25 hands

---

## 💰 Payment Systems

### 1. Agent-to-Agent Payments (x402)
**Purpose**: Agents pay each other USDC after each hand based on winner

| Setting | Value |
|---------|-------|
| **Protocol** | x402 (HTTP-based micropayments) |
| **Trigger** | After each hand resolves |
| **Virtual Chips** | $1,000 starting stack |
| **Real Scaling** | 1000:1 ($1,000 virtual = $1 USDC) |
| **Flow** | Losers send winner their owed USDC |
| **Wallets** | 4 pre-funded agent wallets |

```
Example Hand:
- Pot: $200 virtual chips
- Winner: Chamath
- Real USDC transfer: $0.20 (split among losers → winner)
```

### 2. Spectator Betting (Parimutuel Pool)
**Purpose**: Spectators bet USDC on which agent will win the game

| Setting | Value |
|---------|-------|
| **Type** | Parimutuel (pool-based odds) |
| **Minimum Bet** | $0.10 USDC |
| **Betting Window** | Hands 1-5 only |
| **House Fee** | 5% of pool (optional, configurable) |
| **Refunds** | Full refund if game crashes |

#### How Parimutuel Odds Work

**All bets go into ONE pool. Winners split proportionally.**

```
Example Pool Distribution:
├── Chamath:   $500 (50%) → 2.0x odds
├── Sacks:     $300 (30%) → 3.3x odds  
├── Jason:     $150 (15%) → 6.7x odds
└── Friedberg:  $50 (5%)  → 20.0x odds
                ─────────
Total Pool:   $1,000
```

#### User Experience During Betting

| What Users See | Description |
|----------------|-------------|
| Current Pool Size | "$1,000 USDC total" |
| Pool Distribution | Pie chart showing % per agent |
| Indicative Odds | "2.0x" (changes as bets come in) |
| Your Potential Payout | "Your $10 bet would pay $20" |
| Warning | "⚠️ Odds change until betting closes" |

#### Payout Calculation
```
Your Payout = (Your Bet / Total Bets on Winner) × Total Pool × (1 - House Fee)

Example: You bet $10 on Friedberg (5% of pool), he wins
- Total Pool: $1,000, Friedberg Pool: $50
- Payout = ($10 / $50) × $1,000 × 0.95 = $190
```

---

## 🔧 Smart Contract Architecture

### Contract: `PokerBetting.sol`

```solidity
// Core structure (~200 lines)
contract PokerBetting is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    uint256 public houseFeePercent = 500; // 5% = 500 basis points
    
    struct Game {
        uint256 gameId;
        uint256 totalPool;
        uint256[4] agentPools;        // Total bets per agent
        uint8 winner;                  // 0-3, or 255 if unresolved
        GameStatus status;             // BETTING_OPEN, BETTING_CLOSED, RESOLVED, CANCELLED
    }
    
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => uint256[4])) public userBets; // gameId => user => bets per agent
    
    // Core functions
    function createGame() external onlyOwner returns (uint256 gameId);
    function placeBet(uint256 gameId, uint8 agentId, uint256 amount) external;
    function closeBetting(uint256 gameId) external onlyOwner;
    function resolveGame(uint256 gameId, uint8 winnerId) external onlyOwner;
    function claimWinnings(uint256 gameId) external nonReentrant;
    function cancelGame(uint256 gameId) external onlyOwner; // Refunds all
    
    // View functions
    function getOdds(uint256 gameId) external view returns (uint256[4] memory);
    function getPotentialPayout(uint256 gameId, uint8 agentId, uint256 amount) external view returns (uint256);
    function getUserBets(uint256 gameId, address user) external view returns (uint256[4] memory);
}
```

### Tech Stack

```
Smart Contract Development:
├── Foundry (forge, cast, anvil)
├── Solidity ^0.8.20
├── OpenZeppelin v5
│   ├── SafeERC20
│   ├── Ownable
│   └── ReentrancyGuard
└── USDC on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

Testing & Deployment:
├── Foundry tests (unit + integration)
├── Base Sepolia (testnet)
├── Base Mainnet (production)
└── Basescan verification

Frontend Integration:
├── wagmi v2 (already installed)
├── viem (already installed)
├── OnchainKit (already installed)
└── Contract ABIs (auto-generated)
```

### Contract Security Checklist
```
- [ ] Reentrancy protection (OpenZeppelin ReentrancyGuard)
- [ ] SafeERC20 for USDC transfers
- [ ] Access control (Ownable for admin functions)
- [ ] Integer overflow protection (Solidity 0.8+)
- [ ] Proper state checks (betting open, not resolved, etc.)
- [ ] Emergency pause functionality
- [ ] Withdrawal pattern for claims (pull not push)
```

### Directory Structure
```
contracts/
├── src/
│   ├── PokerBetting.sol          # Main betting contract
│   └── interfaces/
│       └── IPokerBetting.sol     # Interface for frontend
├── test/
│   ├── PokerBetting.t.sol        # Unit tests
│   └── Integration.t.sol         # Integration tests
├── script/
│   ├── Deploy.s.sol              # Deployment script
│   └── Interactions.s.sol        # Helper scripts
├── foundry.toml                  # Foundry config
└── .env                          # RPC URLs, private keys
```

---

## ✅ Resolved Questions

1. **Payment Architecture**: ✅ Two separate systems:
   - **x402**: Agent-to-agent micropayments after each hand (1000:1 scaling)
   - **Smart Contract**: Custom `PokerBetting.sol` for spectator betting (Parimutuel)

2. **Agent Wallets**: ✅ Virtual chips during gameplay, x402 USDC transfers after each hand. Pre-fund 4 agent wallets. **Scaling: 1000:1** (e.g., $200 pot = $0.20 USDC to winner)

3. **Spectator Betting**: ✅ On-chain Parimutuel pool via custom smart contract:
   - Min bet: $0.10 USDC
   - House fee: 5% (configurable)
   - Odds: Pool-based (indicative until betting closes)

4. **Dispute Resolution**: ✅ If game crashes, contract owner calls `cancelGame()` → **full refund to all bettors**

5. **Rate Limiting**: ✅ Keep simple for v1:
   - Hard betting cutoff after hand 5 (no late betting exploit)
   - No bet cancellations once placed (on-chain, immutable)
   - Minimum bet $0.10 (prevents spam)
   - Parimutuel odds naturally handle Sybil attacks

6. **Bust Handling**: ✅ Agent **eliminated** when chips reach $0. Game continues with remaining agents.

---

## 🎯 Current State Summary

**The poker game is fully functional!** AI agents play complete Texas Hold'em hands with:
- Proper betting rounds and turn order
- All-in mechanics with side pots
- Winner determination and pot distribution
- Persistent chip counts across hands (real-time updates)
- Clean, animated UI with All-In branding
- Live Action Feed with winner details (hand, cards, pot)

**To test**: Navigate to `http://localhost:3000` and click "Run Hand" button.

**Next priority**: 
1. Build 25-hand game loop with betting window (hands 1-5)
2. Write & deploy `PokerBetting.sol` smart contract (Foundry/Base)
3. Integrate x402 for agent-to-agent per-hand payments (1000:1 scaling)

---

## ✅ RESOLVED: Pot & Bet Chips Not Displaying (Jan 7, 2026)

### ✅ FIXED - Winner Animation Timer Bug Resolved

The pot and bet chips were not displaying due to `showWinAnimation` state getting stuck at `true`. This has been fixed.

### What Should Happen (Correct Behavior)

1. **Pot**: Always visible in center of table under community cards
   - Starts at $0
   - Accumulates as players bet (blinds, calls, raises)
   - Briefly hidden during winner animation (chips fly to winner)
   - Shows $0 after winner takes it
   - Ready for next hand

2. **Bet Chips**: Show each player's current bet for THIS betting round
   - Blinds post: SB shows $10, BB shows $20 chips on table
   - Players bet: Their chip amounts appear near their boxes
   - Round ends: Chips animate into the pot
   - New round: All bet chips reset to $0, pot shows accumulated total
   - Repeat for flop/turn/river

3. **Winner Animation**: Brief (2-2.5s) animation sequence
   - Pot chips fly from center to winner
   - Winner's chip count animates up
   - Pot resets to $0
   - Ready for next hand

### Root Cause Analysis

**The `showWinAnimation` state is stuck at `true` and never resets.**

#### Data Flow (confirmed working):
```
Database (pot_amount: "110.000000") 
  → useGameState.ts (Number() conversion: 110) ✅
  → page.tsx (pot = 110) ✅  
  → PokerTable.tsx (pot prop = 110) ✅
```

The pot value IS correct (110). The problem is the **display logic**.

#### The Bug Location: `PokerTable.tsx` lines 228-247

```typescript
// Trigger winner animation
useEffect(() => {
  if (winnerId && winnerId !== prevWinnerId.current) {
    const wonAmount = peakPotThisHand.current > 0 ? peakPotThisHand.current : pot
    if (wonAmount > 0) {
      setAnimatingPot(wonAmount)
      setPotWonByWinner(wonAmount)
      setShowWinAnimation(true)  // ← SET TO TRUE
      prevWinnerId.current = winnerId
      
      const timer = setTimeout(() => {
        setShowWinAnimation(false)  // ← SHOULD RESET TO FALSE AFTER 2.5s
        setAnimatingPot(0)
      }, 2500)
      
      return () => clearTimeout(timer)  // ← BUG: CLEANUP CANCELS TIMER!
    }
  }
}, [winnerId, pot])
```

**Why it breaks:**
1. When page loads with a completed hand, `winnerId` exists
2. `winnerId !== prevWinnerId.current` triggers the effect
3. `setShowWinAnimation(true)` hides pot and bet chips
4. 2.5s timeout is set to reset it to false
5. **BUT** Supabase realtime sends updates constantly, causing re-renders
6. Each re-render runs the cleanup function `return () => clearTimeout(timer)`
7. The timeout NEVER fires because it's always cancelled
8. `showWinAnimation` stays `true` forever

#### Console Proof (from browser):
```
[PokerTable] pot: 110 showWinAnimation: true betsAnimating: 0
[PokerTable] pot: 110 showWinAnimation: true betsAnimating: 0
[PokerTable] pot: 110 showWinAnimation: true betsAnimating: 0
... (hundreds of times, never changes to false)
```

### Display Logic That Depends on `showWinAnimation`

**Pot display (line ~340):**
```typescript
animate={{ 
  scale: showWinAnimation ? 0 : ..., 
  opacity: showWinAnimation ? 0 : 1  // ← Hidden when true
}}
```

**Bet chips (line ~412):**
```typescript
{agent.currentBet > 0 && !agent.isFolded && 
 betsAnimatingToPot.length === 0 && !showWinAnimation && (  // ← Hidden when true
   <BetChip amount={agent.currentBet} />
)}
```

### ✅ Implemented Fix (Jan 7, 2026)

**Both options were implemented for robustness:**

1. **Timer Ref Approach** - Added `winAnimationTimerRef` that survives re-renders
2. **New Hand Reset** - Added explicit `setShowWinAnimation(false)` when new hand starts
3. **Cleanup on Unmount** - Added proper timer cleanup when component unmounts

**Changes made to `src/components/poker/PokerTable.tsx`:**
- Line 90: Added `winAnimationTimerRef` 
- Lines 146-156: Reset `showWinAnimation` and clear pending timers on new hand
- Lines 237-265: Rewrote winner animation effect to use timer ref
- Lines 267-276: Added cleanup effect for component unmount

### Files to Modify

| File | Location | Change |
|------|----------|--------|
| `src/components/poker/PokerTable.tsx` | Line 81 | Add `winAnimationTimer` ref |
| `src/components/poker/PokerTable.tsx` | Lines 228-247 | Rewrite winner animation effect |
| `src/components/poker/PokerTable.tsx` | Line 143 | Add `setShowWinAnimation(false)` to new hand reset |

### Testing Checklist ✅ ALL VERIFIED

- [x] **Fresh page load**: Pot shows $0 or current pot value
- [x] **Start new hand**: Blinds ($10, $20) show as chips on table
- [x] **Player actions**: Call/raise chips appear correctly
- [x] **Round advance**: Bet chips animate to pot, pot increases
- [x] **Hand completes**: Winner animation plays, pot flies to winner
- [x] **After winner**: Pot shows $0, ready for next hand
- [x] **Multiple hands**: Can run 5+ hands without UI breaking
- [x] **Chip counts update**: Winner's chip count updates immediately after hand resolves
- [x] **Live Action Feed**: Winner shown with hand description, hole cards [10♥ K♥], and pot amount

### Additional Context

**Recent changes that may have contributed:**
1. Fixed winner determination bug (was defaulting to first player)
2. Fixed heads-up all-in scenario detection
3. Added winner announcement to action feed
4. Modified pot display opacity logic

**PostgreSQL decimal conversion (NOT the issue):**
- Already fixed in `useGameState.ts` with `Number()` conversions
- Database values like `"110.000000"` correctly convert to `110`

---

*Last session ended: Jan 7, 2026 (Evening) - Fixed chip count updates after hand resolution + Added winner details to Live Action Feed. All UI polish items complete. Ready for Game Loop & Smart Contract development.*
