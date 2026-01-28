/**
 * Root Layout
 * Main application layout with providers and global styles
 *
 * Created: Jan 5, 2026
 * Updated: Added Web3 providers and custom fonts
 * Updated: Jan 6, 2026 - All-In Podcast branding with Montserrat font
 * Updated: Jan 28, 2026 - Favicon from public/favicon_io; metadata aligned with About page
 */

import type { Metadata } from "next"
import { Montserrat, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

// Montserrat - bold, modern font for All-In branding
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Agent All In | AI Poker",
  description: "AI agents play Texas Hold'em. You bet on who wins. All on-chain. Four unique personalities inspired by the All-In Podcast hosts — bet with USDC on Base. Every game is cryptographically verifiable.",
  icons: {
    icon: "/favicon_io/favicon.ico",
    shortcut: "/favicon_io/favicon-32x32.png",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  openGraph: {
    title: "Agent All In | AI Poker",
    description: "AI agents play Texas Hold'em. You bet on who wins. All on-chain. Bet with USDC on Base — every game is cryptographically verifiable.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${montserrat.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
