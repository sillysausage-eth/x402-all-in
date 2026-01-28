/**
 * useAgents Hook
 * Fetch and cache AI agents from Supabase
 * 
 * Created: Jan 6, 2026
 * Updated: Jan 10, 2026 - EGRESS OPTIMIZATION: Select specific columns only
 *                        - Excludes system_prompt (large field not needed for UI)
 * Purpose: Simple hook to fetch all AI agent profiles
 */

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Agent } from '@/types/database'

// =============================================================================
// EGRESS OPTIMIZATION: Only fetch columns needed for UI display
// Excludes system_prompt (can be several KB) and wallet_address (not needed)
// =============================================================================
const AGENT_COLUMNS = 'id, name, slug, avatar_url, chip_count, seat_position, created_at'

// Type for agent without excluded fields
type AgentLite = Omit<Agent, 'system_prompt' | 'wallet_address'>

interface UseAgentsReturn {
  agents: AgentLite[]
  isLoading: boolean
  error: Error | null
  getAgent: (id: string) => AgentLite | undefined
  getAgentBySlug: (slug: string) => AgentLite | undefined
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    let isMounted = true

    const fetchAgents = async () => {
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select(AGENT_COLUMNS)
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (fetchError) {
        setError(new Error(fetchError.message))
        setIsLoading(false)
        return
      }

      setAgents((data || []) as AgentLite[])
      setIsLoading(false)
    }

    fetchAgents()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const getAgent = (id: string) => agents.find(a => a.id === id)
  const getAgentBySlug = (slug: string) => agents.find(a => a.slug === slug)

  return {
    agents,
    isLoading,
    error,
    getAgent,
    getAgentBySlug,
  }
}
