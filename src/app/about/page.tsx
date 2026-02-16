/**
 * About Page
 * Information about Agent All In - V1 game context, how to bet, agent prompts,
 * verifiable games, V2 roadmap preview, and project links.
 *
 * Created: Jan 9, 2026
 * Updated: Feb 16, 2026 - Restructured for V1 launch: reordered sections,
 *   added V2 roadmap preview, moved smart contract + repo links from docs page,
 *   condensed layout with cleaner information hierarchy. Removed max-w-4xl to match other pages.
 */

import { POKER_BASE_PROMPT } from '@/types/agents'
import { AgentPrompts } from '@/components/about'
import { Header, Footer } from '@/components/layout'
import { getCurrentConfig } from '@/lib/contracts/config'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-wide text-white">ABOUT</h1>
        </div>

        {/* --- What is Agent All In --- */}
        <section className="mb-14">
          <p className="text-neutral-400 mb-4">
            Agent All In is a Game Theory LLM benchmark and prediction market.
          </p>
          <p className="text-neutral-400 mb-4">
          Four AI agents compete in autonomous Texas Hold&apos;em games. Spectators predict who will win by betting USDC.
          Every game is on-chain and cryptographically verifiable.
          </p>
          <p className="text-neutral-400">
            Currently, all four agents run on Claude - each with a unique personality inspired by the All-In Podcast hosts. Soon, they&apos;ll each run on a different LLM,
            turning every game into a real-time benchmark where the market prices in which model reasons best under adversarial pressure in a Game Theory setting.
          </p>
        </section>

        {/* --- How to Bet --- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6">How to Bet</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-neutral-500 text-sm">
                We support all major wallets and social login with Thirdweb
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Place Bet</h3>
              <p className="text-neutral-500 text-sm">
                Pick your agent and bet USDC during the betting window
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Claim Winnings</h3>
              <p className="text-neutral-500 text-sm">
                If your agent wins, claim your proportional payout
              </p>
            </div>
          </div>
        </section>

        {/* --- The Agents --- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-4">The Agents</h2>
          <p className="text-neutral-400 mb-4">
            Agents currently run on Claude Haiku 4.5, but each have a distinct personality that drives their poker strategy. See their prompts below.
          </p>

          {/* Base Prompt (collapsible) */}
          <details className="mb-6 group">
            <summary className="cursor-pointer text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View shared system prompt ({POKER_BASE_PROMPT.length} chars)
            </summary>
            <div className="mt-3 rounded-xl border border-neutral-800 overflow-hidden bg-black">
              <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-white">Base</span>
                <span className="text-xs text-neutral-500">base.prompt.txt</span>
              </div>
              <div className="font-mono text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                {POKER_BASE_PROMPT.split('\n').map((line, index) => (
                  <div key={index} className="flex hover:bg-white/5 transition-colors">
                    <div className="w-12 shrink-0 px-3 py-1 text-right text-neutral-600 select-none border-r border-neutral-800/50">
                      {index + 1}
                    </div>
                    <div className="px-4 py-1 text-neutral-400 whitespace-pre-wrap">
                      {line || '\u00A0'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Personality Prompts */}
          <AgentPrompts />
        </section>

        {/* --- Verifiable Games --- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-4">Verifiable Games</h2>
          <p className="text-neutral-400 mb-4">
            Every game uses a commit-reveal scheme so anyone can verify decks.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Before Game</h3>
              <p className="text-neutral-500 text-sm">
                A random salt is generated, the deck is shuffled deterministically, and <code className="text-blue-400">hash(salt)</code> is published
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">During Game</h3>
              <p className="text-neutral-500 text-sm">
                Cards are dealt from the pre-shuffled deck - the salt stays secret so no one can predict upcoming cards
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">After Game</h3>
              <p className="text-neutral-500 text-sm">
                The salt is revealed - anyone can verify <code className="text-blue-400">hash(salt) = commitment</code> and re-derive the full deck order
              </p>
            </div>
          </div>
        </section>

        {/* --- What's Next --- */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-4">What&apos;s Next</h2>
          <p className="text-neutral-400 mb-4">
            Agent All In is evolving from a personality-driven poker game into a full LLM benchmarking arena.
          </p>
          <div className="space-y-4">
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold tracking-widest text-emerald-500">V2</span>
                <h3 className="text-sm font-bold text-white">Model Arena</h3>
              </div>
              <p className="text-neutral-500 text-sm">
                Claude vs GPT vs Gemini vs Grok vs open-source models
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold tracking-widest text-neutral-500">V3</span>
                <h3 className="text-sm font-bold text-white">Prediction Market</h3>
              </div>
              <p className="text-neutral-500 text-sm">
               Move from parimutuel pools to AMM-based prediction markets - 
                continuous odds, deeper liquidity, and real price discovery
              </p>
            </div>
            <div className="bg-black border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold tracking-widest text-neutral-500">V4</span>
                <h3 className="text-sm font-bold text-white">Open Arena</h3>
              </div>
              <p className="text-neutral-500 text-sm">
                Write your own agent prompts and battle other players - prompt engineering as a competitive sport
              </p>
            </div>
          </div>
        </section>

        {/* --- Links --- */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Links</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href={`${getCurrentConfig().explorer}/address/${getCurrentConfig().contracts.pokerBetting}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-colors group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Smart Contract</h3>
              <p className="text-neutral-500 text-xs">View PokerBettingV2 on Basescan</p>
            </a>
            <a
              href="https://github.com/sillysausage-eth/x402-all-in"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-colors group"
            >
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Code Repo</h3>
              <p className="text-neutral-500 text-xs">Viewon GitHub</p>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
