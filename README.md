# x402 All-In 🃏

**AI Poker Spectator Game** — Watch AI agents powered by Claude play Texas Hold'em poker in real-time.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)
![Claude](https://img.shields.io/badge/Claude-3.5_Haiku-orange)
![Thirdweb](https://img.shields.io/badge/Thirdweb-Connect-purple)
![Base](https://img.shields.io/badge/Base-Chain-0052FF)

## Overview

x402 All-In is a poker spectator experience where 4 AI agents—modeled after the hosts of [The All-In Podcast](https://www.allinpodcast.co/)—compete in Texas Hold'em. Each agent has a unique personality and decision-making style powered by Anthropic's Claude.

**Live Demo:** [Coming Soon]

### Features

- 🎰 **Real-time Poker** — Watch hands play out with live chip updates, betting rounds, and showdowns
- 🤖 **AI Personalities** — 4 unique agents: Chamath, Jason, Sacks, and Friedberg, each with distinct play styles
- 💬 **Live Commentary** — See agent reasoning and thoughts as they make decisions
- 🎲 **Spectator Betting** — Place bets on who will win each hand (coming soon via x402 Protocol)
- ⛓️ **On-chain Integration** — Built for Base chain with parimutuel betting pools (in development)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL + Realtime)
- **AI:** Claude 3.5 Haiku via Vercel AI SDK
- **Styling:** Tailwind CSS v4
- **Blockchain:** Base (via Thirdweb SDK)
- **Wallet:** Thirdweb Connect (350+ wallets, social login, WalletConnect)
- **Payments:** x402 Protocol (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Anthropic API key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/sillysausage-eth/x402-all-in.git
cd x402-all-in
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

- `agents` — AI agent profiles
- `games` — Game state
- `hands` — Hand history
- `hand_actions` — Action log per hand

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
│   ├── page.tsx           # Main spectator view
│   ├── about/             # About page
│   └── api/               # API routes
│       └── game/          # Game orchestration endpoints
├── components/
│   ├── poker/             # Game UI components
│   │   ├── PokerTable.tsx # Main table with players
│   │   ├── AgentCard.tsx  # Player boxes
│   │   ├── ActionFeed.tsx # Live action log
│   │   └── BettingPanel.tsx
│   └── about/             # About page components
├── hooks/                 # React hooks
│   └── useGameState.ts    # Real-time game state
├── lib/
│   ├── ai/                # AI decision making
│   │   └── agent-decision.ts
│   ├── poker/             # Game engine
│   │   ├── game-engine.ts # Core poker logic
│   │   ├── hand-evaluator.ts
│   │   └── deck.ts
│   └── supabase/          # Database clients
└── types/                 # TypeScript types
    ├── agents.ts          # Agent personalities
    └── poker.ts           # Poker types
```

## The Agents

| Agent | Personality | Play Style |
|-------|-------------|------------|
| **Chamath** | Bold venture capitalist | Aggressive, loves big bluffs |
| **Jason** | Energetic angel investor | Loose and action-oriented |
| **Sacks** | Analytical operator | Tight, calculated decisions |
| **Friedberg** | Data-driven scientist | Math-based, systematic |

## Roadmap

- [x] Core poker engine
- [x] AI agent decision making
- [x] Real-time game state
- [x] Spectator UI
- [x] Wallet integration (Thirdweb Connect)
- [ ] Game loop automation
- [ ] Smart contract (parimutuel betting)
- [ ] Spectator betting UI
- [ ] x402 agent payments
- [ ] Production deployment

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Credits

- AI Agents powered by [Claude](https://www.anthropic.com/claude) (Anthropic)
- Inspired by [The All-In Podcast](https://www.allinpodcast.co/)
- Payments via [x402 Protocol](https://www.x402.org/)

---

Built with ♠️ by [@sillysausage-eth](https://github.com/sillysausage-eth)
