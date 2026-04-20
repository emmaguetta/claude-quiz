'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/components/LocaleProvider'
import { Sparkles, Lock } from 'lucide-react'
import { McpCard, type McpResult } from './McpCard'

type AnalysisItem = {
  name: string
  rank: number
  relevant: boolean
  explanation: string
}

type CachedAnalysis = {
  analysis: AnalysisItem[]
  timestamp: number
}

const CACHE_KEY_PREFIX = 'mcp-deep-analysis:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function getCached(query: string): AnalysisItem[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + query)
    if (!raw) return null
    const cached: CachedAnalysis = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + query)
      return null
    }
    return cached.analysis
  } catch { return null }
}

function setCache(query: string, analysis: AnalysisItem[]) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + query, JSON.stringify({ analysis, timestamp: Date.now() }))
  } catch { /* storage full — ignore */ }
}

type Props = {
  query: string
  results: McpResult[]
  onSelectMcp: (mcp: McpResult) => void
}

export function McpDeepAnalysis({ query, results, onSelectMcp }: Props) {
  const { t, locale } = useLocale()
  const [analysis, setAnalysis] = useState<AnalysisItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState<{ used: number; limit: number; loggedIn: boolean } | null>(null)

  // Check credits on mount
  useEffect(() => {
    fetch('/api/mcp/deep-analyze')
      .then(r => r.json())
      .then(setCredits)
      .catch(() => {})
  }, [])

  // Restore cached analysis or reset when query changes
  useEffect(() => {
    const cached = getCached(query)
    if (cached) {
      setAnalysis(cached)
    } else {
      setAnalysis(null)
    }
    setError('')
  }, [query])

  const runAnalysis = useCallback(async () => {
    // Check cache first
    const cached = getCached(query)
    if (cached) {
      setAnalysis(cached)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mcp/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          locale,
          results: results.map(r => ({
            name: r.name,
            description: r.description,
            toolsCount: r.toolsCount,
            matchingChunk: r.matchingChunk,
            similarity: r.similarity,
          })),
        }),
      })

      const data = await res.json()

      if (data.error === 'login_required') {
        setError('login_required')
        setLoading(false)
        return
      }

      if (data.error === 'limit_reached') {
        setCredits({ used: data.used, limit: data.limit, loggedIn: true })
        setError('limit_reached')
        setLoading(false)
        return
      }

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      const analysisData = data.analysis as AnalysisItem[]
      setAnalysis(analysisData)
      setCache(query, analysisData)

      if (data.used !== undefined) {
        setCredits(prev => prev ? { ...prev, used: data.used } : prev)
      }
    } catch {
      setError('network')
    }
    setLoading(false)
  }, [query, locale, results])

  const remaining = credits ? credits.limit - credits.used : null
  const hasAnalysis = analysis && analysis.length > 0
  const relevant = hasAnalysis ? analysis.filter(a => a.relevant).sort((a, b) => a.rank - b.rank) : []

  return (
    <div className="mb-8">
      {/* Banner — show when no analysis yet */}
      {!hasAnalysis && (
        <div className="mb-6">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-300">
                      {t.mcpSearch.deepAnalysisDesc}
                    </p>
                    {credits && credits.loggedIn && remaining !== null && (
                      <p className="text-xs text-zinc-600 mt-1">
                        {t.mcpSearch.creditsRemaining(remaining, credits.limit)}
                      </p>
                    )}
                    {error === 'login_required' && (
                      <p className="text-xs text-amber-400/70 mt-1">{t.mcpSearch.loginRequired}</p>
                    )}
                    {error === 'limit_reached' && (
                      <p className="text-xs text-red-400/70 mt-1">{t.mcpSearch.limitReached}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={runAnalysis}
                  disabled={loading || error === 'limit_reached'}
                  size="sm"
                  className="shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40"
                >
                  {loading ? (
                    <span className="animate-pulse">{t.mcpSearch.analyzing}</span>
                  ) : credits && !credits.loggedIn ? (
                    <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />{t.mcpSearch.deepAnalysisCta}</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />{t.mcpSearch.deepAnalysisCta}</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI results — show when analysis exists */}
      {hasAnalysis && relevant.length > 0 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-400/80">{t.mcpSearch.deepAnalysisTitle}</p>
          </div>

          {/* Relevant MCPs — full cards with AI explanation */}
          <div className="grid gap-3 md:grid-cols-2">
            {relevant.map(item => {
              const mcp = results.find(r => r.name === item.name)
              if (!mcp) return null
              return (
                <div key={item.name}>
                  <McpCard mcp={mcp} onSelect={onSelectMcp} />
                  <div className="mx-1 -mt-1 rounded-b-lg border border-t-0 border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400/80">{item.explanation}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Separator before full results */}
          <div className="flex items-center gap-3 pt-6">
            <div className="flex-1 border-t border-zinc-800" />
            <p className="text-xs text-zinc-600 uppercase tracking-wide shrink-0">{t.mcpSearch.allResults}</p>
            <div className="flex-1 border-t border-zinc-800" />
          </div>
        </div>
      )}
    </div>
  )
}
