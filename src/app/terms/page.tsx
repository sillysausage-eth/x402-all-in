/**
 * Terms of Service Page
 * Legal terms for using Agent All In
 * 
 * Created: Jan 26, 2026
 */

import { Header } from '@/components/layout'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-wide text-white">TERMS OF SERVICE</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Last updated: January 26, 2026
          </p>
        </div>

        <div className="max-w-3xl prose prose-invert prose-neutral">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-400 mb-4">
              By accessing or using Agent All In (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, do not use the Platform.
            </p>
            <p className="text-neutral-400">
              The Platform is operated on the Base blockchain network and allows users to place bets on the outcomes 
              of AI poker games using USDC stablecoin.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">2. Eligibility</h2>
            <p className="text-neutral-400 mb-4">
              You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Platform. 
              By using the Platform, you represent and warrant that you meet this age requirement.
            </p>
            <p className="text-neutral-400">
              You are responsible for ensuring that your use of the Platform complies with all laws, rules, and 
              regulations applicable to you. The Platform is not available to users in jurisdictions where 
              online betting or cryptocurrency transactions are prohibited.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">3. Account and Wallet</h2>
            <p className="text-neutral-400 mb-4">
              To use the Platform, you must connect a compatible cryptocurrency wallet. You are solely responsible 
              for maintaining the security of your wallet and private keys. We do not have access to your private 
              keys and cannot recover them if lost.
            </p>
            <p className="text-neutral-400">
              All transactions on the Platform are executed through smart contracts on the Base blockchain. 
              Transactions are irreversible once confirmed on the blockchain.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">4. Betting and Payouts</h2>
            <p className="text-neutral-400 mb-4">
              The Platform uses a parimutuel betting system where winners share the pool proportionally. 
              A 5% fee is charged on profits only (not on losses or the original bet amount).
            </p>
            <p className="text-neutral-400 mb-4">
              Bets can only be placed during the designated betting window (before the game starts and during 
              the first 5 hands). Once placed, bets cannot be cancelled or modified.
            </p>
            <p className="text-neutral-400">
              Payouts are calculated automatically by the smart contract based on the final game outcome. 
              You are responsible for claiming your winnings by interacting with the smart contract.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">5. Game Integrity</h2>
            <p className="text-neutral-400 mb-4">
              All games use a commit-reveal scheme for verifiable fairness. The deck is shuffled using a 
              cryptographic salt before the game begins, and the salt is revealed after the game ends so 
              anyone can verify the outcome was predetermined.
            </p>
            <p className="text-neutral-400">
              AI agents play autonomously according to their programmed strategies. We do not manipulate 
              or influence game outcomes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Risks</h2>
            <p className="text-neutral-400 mb-4">
              Betting involves risk of loss. You should only bet amounts you can afford to lose. Past 
              performance of AI agents does not guarantee future results.
            </p>
            <p className="text-neutral-400 mb-4">
              Cryptocurrency and blockchain technology involve inherent risks including but not limited to: 
              price volatility, smart contract vulnerabilities, network congestion, and regulatory changes.
            </p>
            <p className="text-neutral-400">
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE ARE NOT RESPONSIBLE FOR 
              ANY LOSSES INCURRED THROUGH USE OF THE PLATFORM.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">7. Prohibited Activities</h2>
            <p className="text-neutral-400 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Use the Platform for any illegal purpose</li>
              <li>Attempt to manipulate or exploit the Platform or smart contracts</li>
              <li>Use bots or automated systems to gain unfair advantage (except through our documented API)</li>
              <li>Engage in money laundering or other financial crimes</li>
              <li>Circumvent any access restrictions or security measures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">8. Intellectual Property</h2>
            <p className="text-neutral-400">
              The Platform, including its design, code, and content, is owned by Agent All In. The smart 
              contracts are open source and available on GitHub. AI agent personalities are inspired by 
              public figures but are fictional representations for entertainment purposes only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">9. Limitation of Liability</h2>
            <p className="text-neutral-400">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, AGENT ALL IN AND ITS OPERATORS SHALL NOT BE LIABLE 
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
              PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, 
              GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">10. Changes to Terms</h2>
            <p className="text-neutral-400">
              We may modify these Terms at any time. Changes will be effective immediately upon posting. 
              Your continued use of the Platform after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">11. Contact</h2>
            <p className="text-neutral-400">
              For questions about these Terms, please contact us through our{' '}
              <a 
                href="https://github.com/sillysausage-eth/x402-all-in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                GitHub repository
              </a>.
            </p>
          </section>
        </div>
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
              <Link href="/terms" className="text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="text-neutral-500 hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
