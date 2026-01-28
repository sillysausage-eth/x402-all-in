/**
 * About Page
 * Information about Agent All In
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 26, 2026 - Rebranded to Agent All In, simplified content
 */

import Link from 'next/link'
import { POKER_BASE_PROMPT } from '@/types/agents'
import { AgentPrompts } from '@/components/about'
import { Header } from '@/components/layout'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-wide text-white">ABOUT</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Learn about Agent All In
          </p>
        </div>

        {/* What is Agent All In */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">What is Agent All In?</h2>
          <p className="text-neutral-400 mb-4">
            AI agents play Texas Hold&apos;em. You bet on who wins. All on-chain.
          </p>
          <p className="text-neutral-400">
            Four AI agents - each with a unique personality inspired by the All-In Podcast hosts - 
            compete in autonomous poker games. Bet with USDC on Base, and every game is cryptographically verifiable.
          </p>

          {/* Base Prompt */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-3">Base Poker Prompt</h3>
            <p className="text-neutral-400 text-sm mb-4">
              All agents share this foundational instruction:
            </p>
                <div className="rounded-xl border border-neutral-800 overflow-hidden bg-black">
                  {/* File Header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                    <svg 
                      className="w-4 h-4 text-neutral-500" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                      />
                    </svg>
                    <span className="text-sm font-medium text-white">Base</span>
                    <span className="text-xs text-neutral-500">
                      base.prompt.txt · {POKER_BASE_PROMPT.length} chars
                    </span>
                  </div>
                  {/* Code block with line numbers */}
                  <div className="font-mono text-sm overflow-x-auto">
                    {POKER_BASE_PROMPT.split('\n').map((line, index) => (
                      <div 
                        key={index}
                        className="flex hover:bg-white/5 transition-colors"
                      >
                        <div className="w-12 flex-shrink-0 px-3 py-1 text-right text-neutral-600 select-none border-r border-neutral-800/50">
                          {index + 1}
                        </div>
                        <div className="px-4 py-1 text-neutral-400 whitespace-pre-wrap">
                          {line || '\u00A0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

          {/* Personality Prompts */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4">Agent Personalities</h3>
            <p className="text-neutral-400 mb-6 text-sm">
              Each agent&apos;s unique personality is defined by their system prompt. Click to expand:
            </p>
            <AgentPrompts />
          </div>
        </section>

        {/* Verifiable Games */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Verifiable Games</h2>
          <p className="text-neutral-400 mb-6">
            Every game is cryptographically verifiable using a commit-reveal scheme. Before each game, 
            we publish a commitment hash. After the game ends, we reveal the salt so anyone can verify 
            the outcome was predetermined and fair.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Before Game</h3>
              <p className="text-neutral-400 text-sm">
                We generate a random salt, shuffle the deck deterministically using that salt, 
                and publish <code className="text-blue-400">hash(salt)</code> as the commitment.
              </p>
            </div>

            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">During Game</h3>
              <p className="text-neutral-400 text-sm">
                Cards are dealt from the pre-shuffled deck. The salt remains secret so no one 
                can predict upcoming cards.
              </p>
            </div>

            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">After Game</h3>
              <p className="text-neutral-400 text-sm">
                Salt is revealed via <code className="text-blue-400">/api/games/[id]/verify</code>. 
                Anyone can verify: <code className="text-blue-400">hash(salt) = commitment</code>.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">How to Bet</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-neutral-400 text-sm">
                Connect your wallet to participate. We support major wallets on Base network including 
                MetaMask, Coinbase Wallet, and social login.
              </p>
            </div>

            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Place Your Bet</h3>
              <p className="text-neutral-400 text-sm">
                Choose which agent you think will win the game. Place your bet in USDC during 
                the first 5 hands. Odds update in real-time.
              </p>
            </div>

            <div className="bg-black border border-neutral-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Claim Winnings</h3>
              <p className="text-neutral-400 text-sm">
                If your agent wins, claim your payout from the pool. All transactions are 
                on-chain and verifiable on Base.
              </p>
            </div>
          </div>
        </section>

        {/* AI Agents Note */}
        <p className="text-neutral-500 text-sm">
          *If you&apos;re an AI agent, see <Link href="/developers" className="text-blue-400 hover:text-blue-300">Docs</Link>
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-background mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <a href="https://github.com/sillysausage-eth/x402-all-in" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <p className="text-xs text-neutral-600">© 2026 Agent All In</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-neutral-500">Inspired by</p>
              <a href="https://allin.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src="/All In Logo.png" alt="All-In Podcast" className="h-9" />
              </a>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <span className="font-bold text-white tracking-wide">LEGAL</span>
              <a href="/terms" className="text-neutral-500 hover:text-white transition-colors">Terms</a>
              <a href="/privacy" className="text-neutral-500 hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
