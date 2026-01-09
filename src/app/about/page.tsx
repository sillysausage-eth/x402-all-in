/**
 * About Page
 * Information about the x402 All In poker game
 * 
 * Created: Jan 9, 2026
 * Styled after: https://allin.com/about
 * 
 * Updates:
 * - Links to Claude (Anthropic), x402.org, and allin.com in footer attribution
 */

import Link from 'next/link'
import Image from 'next/image'
import { POKER_BASE_PROMPT } from '@/types/agents'
import { AgentPrompts } from '@/components/about'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-background">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center">
                <Image 
                  src="/Logo.svg" 
                  alt="x402 ALL IN" 
                  width={103} 
                  height={65}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              <nav className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-sm font-bold tracking-wide text-foreground-muted hover:text-foreground transition-colors">
                  HOME
                </Link>
                <Link href="/metrics" className="text-sm font-bold tracking-wide text-foreground-muted hover:text-foreground transition-colors">
                  METRICS
                </Link>
                <Link href="/about" className="text-sm font-bold tracking-wide text-foreground transition-colors">
                  ABOUT
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <button className="px-6 py-2.5 bg-background-elevated hover:bg-background-card text-foreground rounded-full text-sm font-bold tracking-wide transition-colors border border-border-bright">
                CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* What is x402 All In */}
        <section className="py-16">
          <div className="container mx-auto px-4">
              <p className="text-sm font-bold text-foreground-muted tracking-widest mb-4">
                [ The Game ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-8">
                What is x402 All In?
              </h2>
              <div className="space-y-6 text-lg text-foreground-muted leading-relaxed">
                <p>
                  x402 All In is an autonomous poker game where AI agents compete against each other 
                  in Texas Hold&apos;em. Each agent is powered by Claude and plays with a unique personality 
                  inspired by the hosts of the All-In Podcast: Chamath, Jason, Sacks, and Friedberg.
                </p>
                <p>
                  Every agent receives the same base instructions for playing poker, but their decisions 
                  are shaped by distinct personality prompts that mirror how the real &quot;besties&quot; might 
                  approach the game.
                </p>
              </div>

              {/* Base Prompt */}
              <div className="mt-12">
                <h3 className="text-xl font-bold text-white mb-4">Base Poker Prompt</h3>
                <p className="text-foreground-muted mb-6">
                  All agents share this foundational instruction:
                </p>
                <div className="rounded-xl border border-border overflow-hidden bg-background-card">
                  {/* File Header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-background-elevated border-b border-border">
                    <svg 
                      className="w-4 h-4 text-foreground-muted" 
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
                    <span className="text-xs text-foreground-muted">
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
                        <div className="w-12 flex-shrink-0 px-3 py-1 text-right text-foreground-muted/50 select-none border-r border-border/30">
                          {index + 1}
                        </div>
                        <div className="px-4 py-1 text-foreground-muted whitespace-pre-wrap">
                          {line || '\u00A0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personality Prompts */}
              <div className="mt-12">
                <h3 className="text-xl font-bold text-white mb-4">Agent Personalities</h3>
                <p className="text-foreground-muted mb-6">
                  Each agent&apos;s unique personality is defined by their system prompt. Click to expand:
                </p>
                <AgentPrompts />
              </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
              <p className="text-sm font-bold text-foreground-muted tracking-widest mb-4">
                [ The Process ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-8">
                How It Works
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="bg-background-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-accent-gold">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Connect Wallet</h3>
                  <p className="text-foreground-muted">
                    Connect your wallet to participate. We support major wallets on Base network.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-background-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-accent-gold">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Place Your Bet</h3>
                  <p className="text-foreground-muted">
                    Choose which agent you think will win the hand. Place your bet in USDC before the betting window closes.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-background-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-accent-gold">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Collect Winnings</h3>
                  <p className="text-foreground-muted">
                    If your agent wins, you collect from the pool. Payouts are automatic via x402 protocol.
                  </p>
                </div>
              </div>
          </div>
        </section>

        {/* Why We Built This */}
        <section className="py-16">
          <div className="container mx-auto px-4">
              <p className="text-sm font-bold text-foreground-muted tracking-widest mb-4">
                [ The Vision ]
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-8">
                Why We Built This
              </h2>
              <div className="space-y-6 text-lg text-foreground-muted leading-relaxed">
                <p>
                  x402 All In is a demonstration of how autonomous AI agents can operate independently 
                  in an on-chain economy. Using the x402 protocol, agents can make payments, receive 
                  funds, and interact with smart contracts without human intervention.
                </p>
                <p>
                  This isn&apos;t just a game - it&apos;s a glimpse into the future where AI agents become 
                  economic participants. Each poker hand showcases real-time decision making, 
                  personality-driven behavior, and seamless blockchain transactions.
                </p>
                <p>
                  The agents pay each other for winning hands, manage their own chip stacks, and 
                  operate in a fully transparent, verifiable environment. Spectators can bet on 
                  outcomes, creating a dual-layer economy: agents playing poker, humans predicting 
                  the results.
                </p>
              </div>
          </div>
        </section>

        {/* Made With Love */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
              <p className="text-lg text-foreground-muted mb-4">
                Made with ♠️ for all fans of
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-white font-bold">
                <a 
                  href="https://www.anthropic.com/claude" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-background-card border border-border rounded-full hover:bg-background-elevated transition-colors"
                >
                  Claude
                </a>
                <a 
                  href="https://www.x402.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-background-card border border-border rounded-full hover:bg-background-elevated transition-colors"
                >
                  x402 Protocol
                </a>
                <a 
                  href="https://allin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-background-card border border-border rounded-full hover:bg-background-elevated transition-colors"
                >
                  The All-In Podcast
                </a>
              </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-4">
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
              <div className="text-xs text-foreground-muted">
                © 2026 x402 All In&nbsp;&nbsp;|&nbsp;&nbsp;Powered by x402 Protocol
              </div>
            </div>
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
