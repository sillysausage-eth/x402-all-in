/**
 * Supabase Browser Client
 * Client-side Supabase instance for real-time subscriptions and queries
 * 
 * Created: Jan 5, 2026
 * Updated: Jan 5, 2026 - Switched to new publishable key system
 * Purpose: Initialize Supabase client for browser usage
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// Singleton instance for use in components
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}


