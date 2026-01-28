/**
 * Privacy Policy Page
 * Privacy policy for Agent All In
 * 
 * Created: Jan 26, 2026
 */

import { Header } from '@/components/layout'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-wide text-white">PRIVACY POLICY</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Last updated: January 26, 2026
          </p>
        </div>

        <div className="max-w-3xl prose prose-invert prose-neutral">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-neutral-400 mb-4">
              Agent All In (&quot;we&quot;, &quot;us&quot;, or &quot;the Platform&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and protect information when you use our Platform.
            </p>
            <p className="text-neutral-400">
              By using the Platform, you consent to the practices described in this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-white mb-2">Blockchain Data</h3>
            <p className="text-neutral-400 mb-4">
              When you interact with our smart contracts, your wallet address and transaction history become 
              part of the public blockchain record. This information is publicly visible and cannot be deleted 
              due to the nature of blockchain technology.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2">Usage Data</h3>
            <p className="text-neutral-400 mb-4">
              We may collect anonymous usage data to improve the Platform, including:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mb-4">
              <li>Pages visited and features used</li>
              <li>Device type and browser information</li>
              <li>General geographic location (country/region level)</li>
              <li>Referral sources</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2">Information We Do NOT Collect</h3>
            <p className="text-neutral-400">
              We do not collect or store:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Personal identification information (name, email, phone number)</li>
              <li>Private keys or wallet passwords</li>
              <li>Government-issued ID documents</li>
              <li>Financial account information beyond wallet addresses</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Information</h2>
            <p className="text-neutral-400 mb-4">
              We use collected information to:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Operate and maintain the Platform</li>
              <li>Display your betting history and claimable winnings</li>
              <li>Improve user experience and Platform performance</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">4. Data Storage and Security</h2>
            <p className="text-neutral-400 mb-4">
              Betting data is stored in our database (Supabase) to provide a better user experience. 
              However, the smart contract on the Base blockchain is the authoritative source of truth 
              for all bets and payouts.
            </p>
            <p className="text-neutral-400">
              We implement reasonable security measures to protect against unauthorized access. However, 
              no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">5. Third-Party Services</h2>
            <p className="text-neutral-400 mb-4">
              The Platform integrates with third-party services:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li><strong>Thirdweb</strong> - Wallet connection and blockchain interactions</li>
              <li><strong>Base Network</strong> - Blockchain infrastructure</li>
              <li><strong>Supabase</strong> - Database and real-time features</li>
              <li><strong>Vercel</strong> - Hosting and analytics</li>
            </ul>
            <p className="text-neutral-400 mt-4">
              These services have their own privacy policies. We encourage you to review them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
            <p className="text-neutral-400 mb-4">
              We may use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Remember your wallet connection preferences</li>
              <li>Analyze Platform usage patterns</li>
              <li>Improve Platform functionality</li>
            </ul>
            <p className="text-neutral-400 mt-4">
              You can disable cookies in your browser settings, but some Platform features may not 
              function properly without them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">7. Data Sharing</h2>
            <p className="text-neutral-400 mb-4">
              We do not sell your data. We may share information only:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>With service providers who assist in operating the Platform</li>
              <li>To comply with legal obligations or valid legal processes</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">8. Your Rights</h2>
            <p className="text-neutral-400 mb-4">
              Depending on your jurisdiction, you may have rights to:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to blockchain limitations)</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="text-neutral-400 mt-4">
              Note: Data recorded on the blockchain cannot be modified or deleted due to the immutable 
              nature of blockchain technology.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">9. International Users</h2>
            <p className="text-neutral-400">
              The Platform operates globally. By using the Platform, you consent to the transfer of 
              information to countries that may have different data protection laws than your country 
              of residence.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">10. Children&apos;s Privacy</h2>
            <p className="text-neutral-400">
              The Platform is not intended for users under 18 years of age. We do not knowingly collect 
              information from children. If you believe a child has provided us with information, please 
              contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">11. Changes to This Policy</h2>
            <p className="text-neutral-400">
              We may update this Privacy Policy from time to time. Changes will be posted on this page 
              with an updated &quot;Last updated&quot; date. Your continued use of the Platform after changes 
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">12. Contact Us</h2>
            <p className="text-neutral-400">
              For questions about this Privacy Policy, please contact us through our{' '}
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
              <Link href="/terms" className="text-neutral-500 hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
