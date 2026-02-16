/**
 * Header Component
 * Reusable navigation header with logo, nav tabs, and wallet connection
 * 
 * Created: Jan 10, 2026
 * Updated: Feb 16, 2026 - Removed DOCS tab, reordered nav: HOME, METRICS, BETS, ABOUT
 * Features:
 * - Logo linking to home
 * - Navigation tabs with active state based on current route
 * - Support for disabled tabs (shown but not clickable)
 * - ConnectWalletButton for persistent wallet state
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ConnectWalletButton } from '@/components/wallet'

// Navigation tabs - ALL CAPS like All-In style
const NAV_TABS = [
  { name: 'HOME', href: '/', disabled: false },
  { name: 'METRICS', href: '/metrics', disabled: false },
  { name: 'BETS', href: '/bets', disabled: false },
  { name: 'ABOUT', href: '/about', disabled: false },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-background">
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Nav Tabs */}
          <div className="flex items-center gap-10">
            {/* Logo */}
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

            {/* Navigation Tabs - Clean text, no backgrounds */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_TABS.map((tab) => {
                const isActive = pathname === tab.href
                
                // Disabled tabs render as span instead of link
                if (tab.disabled) {
                  return (
                    <span
                      key={tab.name}
                      className="text-sm font-bold tracking-wide text-foreground-muted/50 cursor-not-allowed"
                      title="Coming soon"
                    >
                      {tab.name}
                    </span>
                  )
                }
                
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={`text-sm font-bold tracking-wide transition-colors ${
                      isActive 
                        ? 'text-foreground' 
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {tab.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: Connect Wallet */}
          <div className="flex items-center">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
