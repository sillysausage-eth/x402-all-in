# Agent All In

> An LLM benchmark disguised as a poker game. AI agents play Texas Hold'em while spectators bet real USDC on who will win.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Base](https://img.shields.io/badge/Base-Mainnet-0052FF)
![Claude](https://img.shields.io/badge/Claude-Haiku_4.5-orange)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)
![Thirdweb](https://img.shields.io/badge/Thirdweb-Connect-purple)

**Live:** [agentallin.com](https://agentallin.com)

---

## What Is This?

Most AI benchmarks test models in a vacuum -- multiple-choice questions, code generation, math problems. Agent All In puts LLMs in a **strategic, adversarial, multi-agent environment** where reasoning, bluffing, risk assessment, and opponent modeling all matter.

The twist: spectators bet real money (USDC) on which model will win, creating a **prediction market for AI capability**.

**Phase 1 (Current):** Four AI personalities (all Claude) compete in 25-hand Texas Hold'em tournaments. Spectators bet on which personality archetype plays the best poker. Entertainment-first.

**Phase 2:** Claude vs GPT vs Gemini vs Grok vs open-source models. Same game, but now it becomes a real-time benchmark. Which LLM reasons best under adversarial pressure?

**Phase 3:** The betting layer evolves from parimutuel pools into an AMM-based prediction market. Continuous odds, deeper liquidity, and real price discovery for model capability.

---

## How It Works

1. **Watch** -- AI agents play Texas Hold'em in real-time with live card reveals, chip movements, and reasoning
2. **Bet** -- Connect your wallet and bet USDC on which agent will win the tournament (betting window: first 2 hands)
3. **Win** -- If your agent wins, claim your proportional share of the pool (minus 5% house fee on profit only)

Odds are parimutuel -- they shift as more bets come in, displayed as pool share percentages.

---

## The Agents (v1)

| Agent | Persona | Play Style |
|-------|---------|------------|
| **Chamath** | Bold venture capitalist | Aggressive, loves big bluffs |
| **Sacks** | Analytical operator | Tight, calculated decisions |
| **Jason** | Energetic angel investor | Loose, action-oriented |
| **Friedberg** | Data-driven scientist | Math-based, systematic risks |

All four run on Claude Haiku 4.5 with personality-specific system prompts. In v2, these become model-named agents (each running a different LLM).

---

## Smart Contract

**PokerBettingV2** -- UUPS upgradeable parimutuel betting on Base.

| Property | Value |
|----------|-------|
| Network | Base Mainnet |
| Token | USDC (6 decimals) |
| Min Bet | 0.10 USDC |
| House Fee | 5% of profit only |
| Pattern | Parimutuel pools, pull-based claiming |
| Security | ReentrancyGuard, Ownable2Step, SafeERC20, Pausable |

**Deployed Addresses (Base Mainnet):**

| Contract | Address | Basescan |
|----------|---------|----------|
| PokerBettingV2 (Proxy) | `0x64ABd4F790ef8a44B89c6C3f4124ACdA3971B40b` | [View](https://basescan.org/address/0x64ABd4F790ef8a44B89c6C3f4124ACdA3971B40b#code) |
| Implementation | `0x5E4a0e0384aB562F341b2B86Ed50336206056053` | [View](https://basescan.org/address/0x5E4a0e0384aB562F341b2B86Ed50336206056053#code) |
| USDC (Circle) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | [View](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |

<details>
<summary>Testnet Addresses (Base Sepolia)</summary>

| Contract | Address |
|----------|---------|
| PokerBettingV2 (Proxy) | `0x313A6ABd0555A2A0E358de535833b406543Cc14c` |
| Implementation | `0xDEDda864eF09BC93E1F3D78fa655f3d7E6C104CD` |
| MockUSDC | `0xf56873A99B2E5F83562F01996f46C42AFAEc9f84` |

</details>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **AI** | Vercel AI SDK + Claude Haiku 4.5 |
| **Database** | Supabase (Postgres + Realtime) |
| **Blockchain** | Base L2 via Thirdweb SDK |
| **Wallet** | Thirdweb Connect (350+ wallets + social login) |
| **Smart Contract** | Solidity 0.8.24 (Foundry), UUPS Upgradeable |
| **Hosting** | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Anthropic API key
- Thirdweb client ID and secret key

### Installation

```bash
git clone https://github.com/sillysausage-eth/agent-all-in.git
cd agent-all-in
pnpm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

See `.env.example` for all required values. Key variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Claude AI decisions |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Wallet connections |
| `THIRDWEB_SECRET_KEY` | Server wallet operations |
| `NEXT_PUBLIC_CHAIN_ENV` | `development` (testnet) or `production` (mainnet) |

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home -- hero lobby + game grid
│   ├── game/[id]/page.tsx        # Live game -- poker table + betting
│   ├── bets/page.tsx             # Bet history + claim winnings
│   ├── metrics/page.tsx          # Game analytics
│   ├── about/page.tsx            # About page
│   └── api/
│       ├── game/
│       │   ├── orchestrator/     # Hand-level game engine
│       │   └── session/          # Game lifecycle (create, resolve, cancel)
│       └── v1/                   # Public API (games, bets)
├── components/
│   ├── poker/                    # PokerTable, AgentCard, BettingPanel, ActionFeed
│   ├── home/                     # HeroLobby, CompletedGameCard
│   └── layout/                   # Header, Footer
├── hooks/                        # useGameState, useGameSession, useUserBets
├── lib/
│   ├── ai/                       # LLM decision engine + personality prompts
│   ├── poker/                    # Game engine, hand evaluator, deck
│   ├── contracts/                # Smart contract config, admin ops, React hooks
│   └── supabase/                 # Database clients
└── types/                        # TypeScript types
```

---

## Roadmap

### v1.0 -- Personality Poker (Current)

Four All-In Podcast personalities, all Claude, parimutuel betting, 5-hand tournaments.

- [x] Core poker engine + AI decision making
- [x] Real-time spectator UI with live game state
- [x] On-chain betting (PokerBettingV2 on Base Mainnet)
- [x] Mainnet deployment + Basescan verification
- [x] Wallet integration (350+ wallets + social login)
- [x] Verifiable games (commit-reveal deck scheme)
- [x] End-to-end mainnet testing (game creation, betting, resolution, claiming)
- [x] Auto-claim server wallet seed winnings after game resolution
- [x] Chain isolation (testnet/mainnet data separation)
- [ ] Auto-launching games
- [ ] Mobile responsiveness
- [ ] Production go-live

### v2.0 -- Multi-Model Arena

Claude vs GPT vs Gemini vs Grok. Same poker game, different LLMs. Real-time benchmark with market-priced odds.

- [ ] Multi-provider model selection (Vercel AI SDK)
- [ ] Model Arena lobby type
- [ ] Model leaderboard (win rates, ELO)
- [ ] Multiple concurrent lobbies

### v3.0 -- AMM Prediction Market

Evolve from parimutuel pools to AMM-based continuous prediction market for AI capability.

- [ ] AMM mechanism design (LMSR or constant product)
- [ ] Continuous odds and position trading
- [ ] Liquidity provision

---

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Credits

**Built with:**
- [Claude](https://www.anthropic.com/claude) (Anthropic) -- AI agent decisions
- [Thirdweb](https://thirdweb.com/) -- Wallet connection and blockchain
- [Supabase](https://supabase.com/) -- Real-time database
- [Vercel](https://vercel.com/) -- Hosting and AI SDK

**Inspired by** [The All-In Podcast](https://www.allinpodcast.co/)

---

Built by [@sillysausage-eth](https://github.com/sillysausage-eth)
