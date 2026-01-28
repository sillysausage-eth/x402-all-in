/**
 * Connect Wallet Button Component
 * Thirdweb-powered wallet connection with comprehensive wallet support
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 9, 2026 - Migrated from OnchainKit to Thirdweb for better wallet support
 * Updated: Jan 9, 2026 - Added support for both Base mainnet and Sepolia
 * Updated: Jan 9, 2026 - Removed default chain restriction to allow any supported chain
 * Updated: Jan 9, 2026 - USDC balance display, built-in buy funds enabled
 * 
 * Features:
 * - Social login (Google, Apple, Discord, Email, Phone)
 * - 350+ wallets via WalletConnect
 * - Proper browser extension detection (Trust Wallet, MetaMask, Rabby, etc.)
 * - Smart wallets with account abstraction
 * - Multi-chain support (Base mainnet + Sepolia)
 * - USDC balance display on wallet button
 */

'use client'

import { ConnectButton } from 'thirdweb/react'
import { createWallet, inAppWallet } from 'thirdweb/wallets'
import { thirdwebClient, supportedChains, base, baseSepolia, USDC_ADDRESSES } from '@/lib/thirdweb-client'

// USDC token info for supported chains
const USDC_TOKEN_INFO = {
  name: 'USD Coin',
  symbol: 'USDC',
  icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
}

// MockUSDC for testnet (same icon, different name for clarity)
const MOCK_USDC_TOKEN_INFO = {
  name: 'Test USDC',
  symbol: 'USDC',
  icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
}

// Supported tokens configuration - USDC on mainnet, MockUSDC on testnet
const supportedTokens = {
  [base.id]: [
    {
      address: USDC_ADDRESSES[base.id],
      ...USDC_TOKEN_INFO,
    },
  ],
  [baseSepolia.id]: [
    {
      address: USDC_ADDRESSES[baseSepolia.id],
      ...MOCK_USDC_TOKEN_INFO,
    },
  ],
}

// Configure supported wallets
const wallets = [
  // In-App Wallet - Social login & email/phone
  inAppWallet({
    auth: {
      options: [
        'google',
        'apple', 
        'discord',
        'email',
        'phone',
        'passkey',
      ],
    },
  }),
  // Popular browser extension wallets (proper detection!)
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('com.trustwallet.app'),
  createWallet('io.rabby'),
  createWallet('app.phantom'),
  createWallet('me.rainbow'),
  createWallet('io.zerion.wallet'),
  // WalletConnect - 300+ additional wallets
  createWallet('walletConnect'),
]

export function ConnectWalletButton() {
  return (
    <ConnectButton
      client={thirdwebClient}
      chains={supportedChains}
      wallets={wallets}
      supportedTokens={supportedTokens}
      connectModal={{
        size: 'wide',
        title: 'Connect to x402 All-In',
        titleIcon: '/Logo.svg',
        showThirdwebBranding: false,
        termsOfServiceUrl: '/terms',
        privacyPolicyUrl: '/privacy',
      }}
      connectButton={{
        label: 'Connect Wallet',
        className: 'connect-wallet-btn',
        style: {
          backgroundColor: 'var(--background-elevated)',
          color: 'var(--foreground)',
          border: '1px solid var(--border-bright)',
          borderRadius: '9999px',
          padding: '0.625rem 1.5rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          letterSpacing: '0.025em',
          transition: 'background-color 0.2s',
        },
      }}
      detailsButton={{
        className: 'wallet-details-btn',
        style: {
          backgroundColor: 'var(--background-elevated)',
          color: 'var(--foreground)',
          border: '1px solid var(--border-bright)',
          borderRadius: '9999px',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        // Show USDC balance instead of native token (ETH)
        displayBalanceToken: {
          [base.id]: USDC_ADDRESSES[base.id],
          [baseSepolia.id]: USDC_ADDRESSES[baseSepolia.id],
        },
      }}
      detailsModal={{
        // Only show token tab (hide NFTs)
        assetTabs: ['token'],
      }}
      theme="dark"
      appMetadata={{
        name: 'x402 All-In',
        url: 'https://x402allin.com',
        description: 'AI Poker Arena - Watch AI agents play Texas Hold\'em',
        logoUrl: '/Logo.svg',
      }}
    />
  )
}
