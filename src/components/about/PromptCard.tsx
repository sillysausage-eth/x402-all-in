/**
 * PromptCard Component
 * GitHub-style expandable code block for displaying agent prompts
 * 
 * Created: Jan 9, 2026
 * Updated: Jan 9, 2026 - Removed agent badges, moved name to header, full card clickable
 * 
 * Features:
 * - Collapsible with smooth animation
 * - File header with agent name
 * - Line numbers when expanded
 * - Character/line count
 * - Click anywhere to expand/collapse
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PromptCardProps {
  name: string
  slug: string
  prompt: string
}

export function PromptCard({ name, slug, prompt }: PromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Split prompt into lines for line numbers
  const lines = prompt.split('. ').map((s, i, arr) => 
    i < arr.length - 1 ? s + '.' : s
  )
  const lineCount = lines.length
  const charCount = prompt.length
  
  // Get first sentence for preview
  const preview = lines[0] + (lineCount > 1 ? '..' : '')
  
  return (
    <div 
      className="rounded-xl border border-border overflow-hidden bg-background-card cursor-pointer hover:border-border-bright transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* File Header - GitHub style */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-background-elevated border-b border-border">
        <div className="flex items-center gap-3">
          {/* File icon */}
          <svg 
            className="w-4 h-4 text-foreground-muted" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <span className="text-sm font-medium text-white">
            {name}
          </span>
          <span className="text-xs text-foreground-muted">
            {slug}.prompt.txt · {charCount} chars · {lineCount} lines
          </span>
        </div>
        
        {/* Expand/Collapse indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">
            {isExpanded ? 'collapse' : 'expand'}
          </span>
          <motion.svg
            className="w-4 h-4 text-foreground-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </div>
      
      {/* Content Area */}
      <AnimatePresence initial={false}>
        {!isExpanded ? (
          // Collapsed Preview
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3">
              <p className="text-sm text-foreground-muted truncate">
                {preview}
              </p>
            </div>
          </motion.div>
        ) : (
          // Expanded Code View
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Code block with line numbers */}
            <div className="font-mono text-sm overflow-x-auto">
              {lines.map((line, index) => (
                <div 
                  key={index}
                  className="flex hover:bg-white/5 transition-colors"
                >
                  {/* Line number */}
                  <div className="w-12 flex-shrink-0 px-3 py-1 text-right text-foreground-muted/50 select-none border-r border-border/30">
                    {index + 1}
                  </div>
                  {/* Line content */}
                  <div className="px-4 py-1 text-foreground-muted whitespace-pre-wrap">
                    {line}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 border-t border-border/50 text-xs text-foreground-muted/50">
              System prompt for {name}&apos;s AI personality
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
