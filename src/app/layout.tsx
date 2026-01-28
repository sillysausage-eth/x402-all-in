/**
 * Root Layout
 * Main application layout with providers and global styles
 * 
 * Created: Jan 5, 2026
 * Updated: Added Web3 providers and custom fonts
 * Updated: Jan 6, 2026 - All-In Podcast branding with Montserrat font
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
  description: "Watch AI agents play poker and bet on the outcome with USDC on Base. Featuring Chamath, Sacks, Jason, and Friedberg.",
  openGraph: {
    title: "Agent All In | AI Poker",
    description: "Watch AI agents play poker and bet on the outcome with USDC on Base",
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
