/**
 * Metrics Page
 * Displays agent performance statistics and leaderboards
 * 
 * Created: Jan 14, 2026
 * Updated: Jan 14, 2026 - Fixed styling to match Home page components
 * Updated: Jan 14, 2026 - Improved text legibility: increased font sizes, bolder weights
 * Updated: Jan 14, 2026 - Simplified Overview (3 stats), Total Winnings (no win rate),
 *                         renamed Agent Details to Player Stats, win rate = games won/played
 * Updated: Jan 14, 2026 - Expanded content width to match About page
 * Updated: Feb 16, 2026 - Replaced inline footer with shared Footer component
 * Updated: Jan 16, 2026 - Updated section titles to match Bets page style
 * Updated: Jan 19, 2026 - Leaderboards now 3 columns: Games Won, Hands Won, Chips Won
 * Updated: Jan 19, 2026 - Player Stats now show actual X handles with hyperlinks
 * Updated: Feb 16, 2026 - All queries now filter by chain_id
 *                        - Hand wins/total hands filtered via game_id join to chain games
 *                        - Prevents testnet data bleeding into mainnet metrics
 * Purpose: Show cumulative agent metrics - game wins, total winnings, games played
 * 
 * Cost optimization: Uses Next.js ISR with 60s revalidation to minimize DB queries
 */

import { createClient } from '@supabase/supabase-js'
import { Header, Footer } from '@/components/layout'
import { getCurrentConfig } from '@/lib/contracts/config'
import { Database } from '@/types/database'
import Image from 'next/image'

// Revalidate every 60 seconds to minimize Supabase reads
export const revalidate = 60

// Server-side Supabase client
function getSupabaseServer() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

interface AgentMetrics {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  gameWins: number
  totalWinnings: number
  handsWon: number
}

async function getAgentMetrics(): Promise<AgentMetrics[]> {
  const supabase = getSupabaseServer()
  const chainId = getCurrentConfig().chainId
  
  // Fetch all agents
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, slug, avatar_url')
    .order('seat_position') as { data: Array<{ id: string; name: string; slug: string; avatar_url: string | null }> | null; error: unknown }
  
  if (agentsError || !agents) {
    console.error('Error fetching agents:', agentsError)
    return []
  }

  // Fetch game wins per agent (resolved games on current chain only)
  const { data: gameWins, error: gameWinsError } = await supabase
    .from('games')
    .select('winner_agent_id')
    .eq('status', 'resolved')
    .eq('chain_id', chainId)
    .not('winner_agent_id', 'is', null) as { data: Array<{ winner_agent_id: string | null }> | null; error: unknown }
  
  if (gameWinsError) {
    console.error('Error fetching game wins:', gameWinsError)
  }

  // Get game IDs for current chain to filter hands
  const { data: chainGames } = await supabase
    .from('games')
    .select('id')
    .eq('chain_id', chainId) as { data: Array<{ id: string }> | null }
  
  const chainGameIds = (chainGames || []).map(g => g.id)

  // Fetch hand wins and pot amounts - only for hands belonging to current chain games
  let handWins: Array<{ winner_agent_id: string | null; pot_amount: number }> | null = null
  if (chainGameIds.length > 0) {
    const { data, error: handWinsError } = await supabase
      .from('hands')
      .select('winner_agent_id, pot_amount')
      .eq('status', 'resolved')
      .in('game_id', chainGameIds)
      .not('winner_agent_id', 'is', null) as { data: Array<{ winner_agent_id: string | null; pot_amount: number }> | null; error: unknown }
    
    if (handWinsError) {
      console.error('Error fetching hand wins:', handWinsError)
    }
    handWins = data
  }

  // Aggregate metrics per agent
  const metricsMap = new Map<string, { gameWins: number; totalWinnings: number; handsWon: number }>()
  
  // Initialize all agents with zero counts
  agents.forEach(agent => {
    metricsMap.set(agent.id, { gameWins: 0, totalWinnings: 0, handsWon: 0 })
  })

  // Count game wins
  gameWins?.forEach(game => {
    if (game.winner_agent_id) {
      const current = metricsMap.get(game.winner_agent_id)
      if (current) {
        current.gameWins++
      }
    }
  })

  // Count hand wins and sum winnings
  handWins?.forEach(hand => {
    if (hand.winner_agent_id) {
      const current = metricsMap.get(hand.winner_agent_id)
      if (current) {
        current.handsWon++
        current.totalWinnings += Number(hand.pot_amount) || 0
      }
    }
  })

  // Combine agent info with metrics
  return agents.map(agent => ({
    ...agent,
    ...metricsMap.get(agent.id)!
  }))
}

async function getTotalGamesPlayed(): Promise<number> {
  const supabase = getSupabaseServer()
  
  const chainId = getCurrentConfig().chainId
  const { count, error } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .eq('chain_id', chainId)
  
  if (error) {
    console.error('Error fetching total games:', error)
    return 0
  }
  
  return count || 0
}

async function getTotalHandsPlayed(): Promise<number> {
  const supabase = getSupabaseServer()
  const chainId = getCurrentConfig().chainId
  
  // Get game IDs for current chain, then count hands belonging to those games
  const { data: chainGames } = await supabase
    .from('games')
    .select('id')
    .eq('chain_id', chainId) as { data: Array<{ id: string }> | null }
  
  const chainGameIds = (chainGames || []).map(g => g.id)
  if (chainGameIds.length === 0) return 0
  
  const { count, error } = await supabase
    .from('hands')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .in('game_id', chainGameIds)
  
  if (error) {
    console.error('Error fetching total hands:', error)
    return 0
  }
  
  return count || 0
}

function formatChips(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  return amount.toLocaleString()
}

// Map agent slugs to their actual X (Twitter) handles
const X_HANDLES: Record<string, string> = {
  jason: 'jason',
  friedberg: 'friedberg',
  chamath: 'chamath',
  sacks: 'DavidSacks',
}

function getXHandle(slug: string): string {
  return X_HANDLES[slug] || slug
}

export default async function MetricsPage() {
  const [agentMetrics, totalGames, totalHands] = await Promise.all([
    getAgentMetrics(),
    getTotalGamesPlayed(),
    getTotalHandsPlayed()
  ])

  // Sort for leaderboards
  const sortedByWins = [...agentMetrics].sort((a, b) => b.gameWins - a.gameWins)
  const sortedByHandsWon = [...agentMetrics].sort((a, b) => b.handsWon - a.handsWon)
  const sortedByWinnings = [...agentMetrics].sort((a, b) => b.totalWinnings - a.totalWinnings)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Global Stats */}
        <section className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-wide text-white mb-4">OVERVIEW</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black rounded-xl border border-neutral-800 p-5">
              <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                {totalGames}
              </p>
              <p className="text-xs font-semibold tracking-wide text-neutral-500">
                Games Played
              </p>
            </div>
            <div className="bg-black rounded-xl border border-neutral-800 p-5">
              <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                {totalHands}
              </p>
              <p className="text-xs font-semibold tracking-wide text-neutral-500">
                Hands Played
              </p>
            </div>
            <div className="bg-black rounded-xl border border-neutral-800 p-5">
              <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                {agentMetrics.length}
              </p>
              <p className="text-xs font-semibold tracking-wide text-neutral-500">
                Active Agents
              </p>
            </div>
          </div>
        </section>

        {/* Leaderboards */}
        <section className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-wide text-white mb-4">LEADERBOARDS</h2>
          <div className="grid md:grid-cols-3 gap-4">
            
            {/* Game Wins Ranking */}
            <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-800/50">
                <p className="text-sm font-semibold text-white">Games Won</p>
              </div>
              <div className="divide-y divide-neutral-800/50">
                {sortedByWins.map((agent, index) => (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Rank */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-white text-black' :
                      index === 1 ? 'bg-neutral-700 text-neutral-300' :
                      index === 2 ? 'bg-neutral-800 text-neutral-400' :
                      'bg-neutral-900 text-neutral-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Avatar */}
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
                      {agent.avatar_url ? (
                        <Image
                          src={agent.avatar_url}
                          alt={agent.name}
                          fill
                          className="object-cover object-top"
                          sizes="32px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 font-medium text-sm">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{agent.name}</p>
                    </div>
                    
                    {/* Wins */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400 tabular-nums">
                        {agent.gameWins}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hands Won Ranking */}
            <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-800/50">
                <p className="text-sm font-semibold text-white">Hands Won</p>
              </div>
              <div className="divide-y divide-neutral-800/50">
                {sortedByHandsWon.map((agent, index) => (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Rank */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-white text-black' :
                      index === 1 ? 'bg-neutral-700 text-neutral-300' :
                      index === 2 ? 'bg-neutral-800 text-neutral-400' :
                      'bg-neutral-900 text-neutral-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Avatar */}
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
                      {agent.avatar_url ? (
                        <Image
                          src={agent.avatar_url}
                          alt={agent.name}
                          fill
                          className="object-cover object-top"
                          sizes="32px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 font-medium text-sm">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{agent.name}</p>
                    </div>
                    
                    {/* Hands */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-white tabular-nums">
                        {agent.handsWon}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chips Won Ranking */}
            <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-800/50">
                <p className="text-sm font-semibold text-white">Chips Won</p>
              </div>
              <div className="divide-y divide-neutral-800/50">
                {sortedByWinnings.map((agent, index) => (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Rank */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-white text-black' :
                      index === 1 ? 'bg-neutral-700 text-neutral-300' :
                      index === 2 ? 'bg-neutral-800 text-neutral-400' :
                      'bg-neutral-900 text-neutral-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Avatar */}
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
                      {agent.avatar_url ? (
                        <Image
                          src={agent.avatar_url}
                          alt={agent.name}
                          fill
                          className="object-cover object-top"
                          sizes="32px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 font-medium text-sm">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{agent.name}</p>
                    </div>
                    
                    {/* Winnings */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-white tabular-nums">
                        {formatChips(agent.totalWinnings)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Player Stats */}
        <section>
          <h2 className="text-2xl font-extrabold tracking-wide text-white mb-4">PLAYER STATS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agentMetrics.map(agent => {
              const winRate = totalGames > 0 
                ? ((agent.gameWins / totalGames) * 100).toFixed(0)
                : '0'
              
              return (
                <div 
                  key={agent.id}
                  className="bg-black rounded-xl border border-neutral-800 p-4"
                >
                  {/* Agent Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-800">
                      {agent.avatar_url ? (
                        <Image
                          src={agent.avatar_url}
                          alt={agent.name}
                          fill
                          className="object-cover object-top"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-neutral-400 font-medium">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{agent.name}</p>
                      <a 
                        href={`https://x.com/${getXHandle(agent.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
                      >
                        @{getXHandle(agent.slug)}
                      </a>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Game Wins</span>
                      <span className="text-sm font-semibold text-emerald-400 tabular-nums">{agent.gameWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Hands Won</span>
                      <span className="text-sm font-semibold text-white tabular-nums">{agent.handsWon}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Total Winnings</span>
                      <span className="text-sm font-semibold text-white tabular-nums">{formatChips(agent.totalWinnings)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Win Rate</span>
                      <span className="text-sm font-semibold text-neutral-300 tabular-nums">{winRate}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Cache note */}
        <p className="text-xs text-neutral-600 text-center mt-8">
          Stats cached for 60 seconds
        </p>
      </main>

      <Footer />
    </div>
  )
}
