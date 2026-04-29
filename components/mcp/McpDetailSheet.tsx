'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/LocaleProvider'
import { X, ExternalLink, Wrench, Sparkles, Star, Users } from 'lucide-react'
import type { McpResult } from './McpCard'
import { createClient } from '@/lib/supabase/client'

type Tool = {
  id: string
  name: string
  description: string | null
}

type Props = {
  mcp: McpResult | null
  query: string
  onClose: () => void
}

export function McpDetailSheet({ mcp, query, onClose }: Props) {
  const { t } = useLocale()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)

  // Track detail view (fire-and-forget)
  useEffect(() => {
    if (!mcp) return
    fetch('/api/mcp/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'detail_viewed',
        payload: {
          mcp_id: mcp.id,
          mcp_slug: mcp.slug,
          mcp_name: mcp.name,
          categories: mcp.categories,
          source_query: query || null,
        },
      }),
    }).catch(() => {})
  }, [mcp, query])

  // Load tools
  useEffect(() => {
    if (!mcp) { setTools([]); setExplanation(''); return }
    setLoading(true)
    setExplanation('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('mcp_tools') as any)
      .select('id, name, description')
      .eq('mcp_id', mcp.id)
      .order('name')
      .then(({ data }: { data: Tool[] | null }) => {
        const loadedTools = data || []
        setTools(loadedTools)
        setLoading(false)

        // Auto-fetch AI explanation
        if (query && mcp) {
          setExplaining(true)
          fetch('/api/mcp/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              mcpName: mcp.name,
              mcpDescription: mcp.description,
              tools: loadedTools.map(t => ({ name: t.name, description: t.description })),
            }),
          })
            .then(r => r.json())
            .then(data => setExplanation(data.explanation || ''))
            .catch(() => {})
            .finally(() => setExplaining(false))
        }
      })
  }, [mcp, query])

  if (!mcp) return null

  const githubUrl = mcp.repoUrl
  const siteUrl = mcp.sourceUrl && mcp.sourceUrl !== mcp.repoUrl ? mcp.sourceUrl : null

  const trackExternalClick = (target: 'site' | 'github', url: string) => {
    fetch('/api/mcp/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'external_click',
        payload: {
          mcp_id: mcp.id,
          mcp_slug: mcp.slug,
          mcp_name: mcp.name,
          target,
          url,
        },
      }),
    }).catch(() => {})
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-medium text-zinc-100">{mcp.name}</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          {mcp.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">{mcp.description}</p>
          )}

          {/* Stats: stars, users, pricing */}
          {(mcp.githubStars || mcp.useCount || (mcp.pricingType && mcp.pricingType !== 'free')) && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {!!mcp.githubStars && mcp.githubStars > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                  {mcp.githubStars.toLocaleString()} stars
                </span>
              )}
              {!!mcp.useCount && mcp.useCount > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Users className="w-4 h-4" />
                  {mcp.useCount.toLocaleString()} utilisations
                </span>
              )}
              {mcp.pricingType === 'freemium' && (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400">
                  Freemium
                </span>
              )}
              {mcp.pricingType === 'paid' && (
                <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs text-red-400">
                  Payant
                </span>
              )}
              {mcp.pricingType === 'free' && mcp.pricingNote && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                  Gratuit
                </span>
              )}
            </div>
          )}

          {/* Pricing details */}
          {mcp.pricingNote && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Pricing</p>
              <p className="text-sm text-zinc-300">{mcp.pricingNote}</p>
            </div>
          )}

          {/* AI Explanation */}
          {(explaining || explanation) && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400/80">
                  {query ? `"${query}"` : ''}
                </span>
              </div>
              {explaining ? (
                <p className="text-sm text-zinc-400 animate-pulse">...</p>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">{explanation}</p>
              )}
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalClick('site', siteUrl)}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 rounded-lg px-3 py-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Site
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalClick('github', githubUrl)}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-800 rounded-lg px-3 py-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1.5">
            {mcp.categories.map(cat => (
              <Badge key={cat} variant="outline" className="text-xs text-zinc-500 border-zinc-800">
                {cat}
              </Badge>
            ))}
          </div>

          {/* Tools */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-300">
                {t.mcpSearch.allTools} ({mcp.toolsCount})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-zinc-900/50 border border-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tools.length === 0 ? (
              <p className="text-sm text-zinc-600">
                {mcp.toolsCount > 0
                  ? 'Tool details not available. Check the GitHub repo for documentation.'
                  : 'No tools documented.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {tools.map(tool => (
                  <div
                    key={tool.id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5"
                  >
                    <p className="text-sm font-mono text-zinc-200">{tool.name}</p>
                    {tool.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{tool.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back button */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            {t.mcpSearch.backToSearch}
          </Button>
        </div>
      </div>
    </>
  )
}
