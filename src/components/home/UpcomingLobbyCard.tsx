/**
 * UpcomingLobbyCard Component
 * Displays the next scheduled game (placeholder until live game ends)
 * 
 * Created: Jan 10, 2026
 * Updated: Jan 14, 2026 - Removed early betting feature
 *                       - Simplified to just show agent roster
 *                       - Updated colors (removed amber/gold)
 * 
 * Features:
 * - "Starting Soon" status (no countdown until it becomes live)
 * - Agent roster preview
 */

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface AgentPreview {
  id: string
  name: string
  avatarUrl: string | null
}

interface UpcomingLobbyCardProps {
  gameNumber: number
  agents: AgentPreview[]
  hasLiveGame: boolean
}

export function UpcomingLobbyCard({
  gameNumber,
  agents,
  hasLiveGame,
}: UpcomingLobbyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-6 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tracking-widest text-neutral-500">UPCOMING</span>
        <span className="text-xs font-medium text-neutral-600">Game #{gameNumber}</span>
      </div>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-neutral-500"
          />
          <span className="text-sm font-medium text-neutral-400">
            {hasLiveGame ? 'Starting Soon' : 'Ready to Start'}
          </span>
        </div>
        <p className="text-xs text-neutral-600">
          {hasLiveGame 
            ? 'Begins when current game ends' 
            : 'Waiting for game to be created'
          }
        </p>
      </div>

      {/* Agent Preview Grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {agents.slice(0, 4).map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-neutral-800/50"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden">
              {agent.avatarUrl ? (
                <Image
                  src={agent.avatarUrl}
                  alt={agent.name}
                  fill
                  className="object-cover object-top"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-neutral-400">
                    {agent.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-neutral-300 truncate">
              {agent.name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
