/**
 * Footer Component
 * Shared footer with GitHub, smart contract link, All-In attribution, and legal links
 *
 * Created: Feb 16, 2026 - Extracted from inline footers across all pages.
 *   Added smart contract (Basescan) and source code (GitHub) links.
 * Updated: Feb 16, 2026 - Dynamic explorer URL and contract address from getCurrentConfig()
 *   Was hardcoded to sepolia.basescan.org with testnet contract address.
 */

import Link from 'next/link'
import { getCurrentConfig } from '@/lib/contracts/config'

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Links + Copyright */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/sillysausage-eth/x402-all-in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors"
                title="Source Code"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href={`${getCurrentConfig().explorer}/address/${getCurrentConfig().contracts.pokerBetting}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors text-xs font-medium"
                title="Smart Contract on Basescan"
              >
                Smart Contract
              </a>
            </div>
            <p className="text-xs text-neutral-600">&copy; 2026 Agent All In</p>
          </div>

          {/* Center: Inspired By */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-neutral-500">Inspired by</p>
            <a
              href="https://allin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/All In Logo.png" alt="All-In Podcast" className="h-9" />
            </a>
          </div>

          {/* Right: Legal */}
          <div className="flex flex-col items-end gap-2 text-sm">
            <span className="font-bold text-white tracking-wide">LEGAL</span>
            <Link href="/terms" className="text-neutral-500 hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="text-neutral-500 hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
