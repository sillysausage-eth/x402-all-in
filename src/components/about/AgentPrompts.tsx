/**
 * AgentPrompts Component
 * Client wrapper for displaying expandable agent personality prompts
 * 
 * Created: Jan 9, 2026
 */

'use client'

import { AGENT_PERSONALITIES } from '@/types/agents'
import { PromptCard } from './PromptCard'

export function AgentPrompts() {
  return (
    <div className="space-y-4">
      {Object.entries(AGENT_PERSONALITIES).map(([slug, agent]) => (
        <PromptCard
          key={slug}
          name={agent.name}
          slug={slug}
          prompt={agent.systemPrompt}
        />
      ))}
    </div>
  )
}
