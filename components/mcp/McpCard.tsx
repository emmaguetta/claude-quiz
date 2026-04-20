'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/components/LocaleProvider'
import { CheckCircle, Bookmark, Star, Users } from 'lucide-react'

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

const SAVED_KEY = 'claude-quiz-saved-mcps'

function getSavedMcps(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') } catch { return [] }
}

function toggleSavedMcp(id: string): boolean {
  const saved = getSavedMcps()
  const idx = saved.indexOf(id)
  if (idx >= 0) {
    saved.splice(idx, 1)
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
    return false
  }
  saved.push(id)
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  return true
}

export { getSavedMcps }

export type McpResult = {
  id: string
  name: string
  description: string | null
  slug: string
  categories: string[]
  sourceUrl: string | null
  repoUrl: string | null
  iconUrl: string | null
  verified: boolean
  toolsCount: number
  qualityScore: number
  githubStars?: number
  useCount?: number
  pricingType?: 'free' | 'paid' | 'freemium'
  pricingNote?: string | null
  matchingChunk?: {
    type: string
    content: string
    toolName: string | null
  }
  similarity?: number
  tier: 'high' | 'medium' | 'low'
}

type Props = {
  mcp: McpResult
  onSelect: (mcp: McpResult) => void
}

export function McpCard({ mcp, onSelect }: Props) {
  const { t } = useLocale()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(getSavedMcps().includes(mcp.id))
  }, [mcp.id])

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    setSaved(toggleSavedMcp(mcp.id))
  }

  return (
    <Card
      className="border border-zinc-800 bg-zinc-900/40 transition-colors duration-150 cursor-pointer hover:border-zinc-600"
      onClick={() => onSelect(mcp)}
    >
      <CardContent className="p-5 space-y-2.5">
        {/* Name line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-medium text-zinc-100 truncate">{mcp.name}</h3>
            {mcp.verified && (
              <span
                title={t.mcpSearch.verifiedTooltip}
                className="shrink-0"
                aria-label={t.mcpSearch.verifiedTooltip}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              </span>
            )}
          </div>
        </div>

        {/* Description + tools count */}
        <p className="text-sm text-zinc-500 line-clamp-2">
          {mcp.description ?? ''}
          {mcp.toolsCount > 0 && (
            <span className="text-zinc-600"> · {t.mcpSearch.tools(mcp.toolsCount)}</span>
          )}
        </p>

        {/* Stats row: stars, users, pricing */}
        {(mcp.githubStars || mcp.useCount || (mcp.pricingType && mcp.pricingType !== 'free')) && (
          <div className="flex items-center gap-3 text-xs">
            {!!mcp.githubStars && mcp.githubStars > 0 && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                {formatCount(mcp.githubStars)}
              </span>
            )}
            {!!mcp.useCount && mcp.useCount > 0 && (
              <span className="flex items-center gap-1 text-zinc-500">
                <Users className="w-3 h-3" />
                {formatCount(mcp.useCount)}
              </span>
            )}
            {mcp.pricingType === 'freemium' && (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-amber-400">
                Freemium
              </span>
            )}
            {mcp.pricingType === 'paid' && (
              <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-red-400">
                Payant
              </span>
            )}
          </div>
        )}

        {/* Matching chunk highlight (only when from search) */}
        {mcp.matchingChunk && (
          <div className="flex items-center gap-2 bg-zinc-800/60 rounded-md px-3 py-1.5 min-h-[32px]">
            <span className="text-xs text-zinc-500 shrink-0">→</span>
            {mcp.matchingChunk.toolName ? (
              <span className="text-sm font-mono text-amber-400/80 truncate">{mcp.matchingChunk.toolName}</span>
            ) : (
              <span className="text-xs text-zinc-500 line-clamp-1">{mcp.matchingChunk.content?.split('.')[0]}</span>
            )}
          </div>
        )}

        {/* Links + bookmark */}
        <div className="flex items-center gap-2 pt-1">
            {mcp.sourceUrl && (
              <a
                href={mcp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Site
              </a>
            )}
            {mcp.repoUrl && (
              <a
                href={mcp.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
            )}
            <div className="flex-1" />
            <button
              onClick={handleBookmark}
              className={`p-1 transition-colors shrink-0 ${saved ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-400'}`}
              title={saved ? 'Retirer des enregistrés' : 'Enregistrer'}
            >
              <Bookmark className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
      </CardContent>
    </Card>
  )
}
