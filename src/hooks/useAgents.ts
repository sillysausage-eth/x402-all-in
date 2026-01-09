/**
 * useAgents Hook
 * Fetch and cache AI agents from Supabase
 * 
 * Created: Jan 6, 2026
 * Purpose: Simple hook to fetch all AI agent profiles
 */

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Agent } from '@/types/database'

interface UseAgentsReturn {
  agents: Agent[]
  isLoading: boolean
  error: Error | null
  getAgent: (id: string) => Agent | undefined
  getAgentBySlug: (slug: string) => Agent | undefined
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    let isMounted = true

    const fetchAgents = async () => {
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: true })

      if (!isMounted) return

      if (fetchError) {
        setError(new Error(fetchError.message))
        setIsLoading(false)
        return
      }

      setAgents(data || [])
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

