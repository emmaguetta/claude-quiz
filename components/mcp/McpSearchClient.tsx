'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { McpSearchInput } from '@/components/mcp/McpSearchInput'
import { McpSearchResults } from '@/components/mcp/McpSearchResults'
import { McpDeepAnalysis } from '@/components/mcp/McpDeepAnalysis'
import { McpCategoryFilters } from '@/components/mcp/McpCategoryFilters'
import { McpDetailSheet } from '@/components/mcp/McpDetailSheet'
import { McpSortSelect, type SortKey } from '@/components/mcp/McpSortSelect'
import type { McpResult } from '@/components/mcp/McpCard'
import type { CategoryGroupPayload, ToolItem } from '@/lib/mcp/categories-data'

const VALID_SORTS: SortKey[] = ['quality', 'popular', 'alphabetical']

type Props = {
  initialCategoryGroups: CategoryGroupPayload[]
  initialTools: ToolItem[]
  initialTotalMcps: number
}

export function McpSearchClient({ initialCategoryGroups, initialTools, initialTotalMcps }: Props) {
  const { t, locale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialCategory = searchParams.get('category')
  const initialTool = searchParams.get('tool')
  const initialSortParam = searchParams.get('sort') as SortKey | null
  const initialSort: SortKey = initialSortParam && VALID_SORTS.includes(initialSortParam) ? initialSortParam : 'quality'

  const [results, setResults] = useState<McpResult[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryGroups] = useState<CategoryGroupPayload[]>(initialCategoryGroups)
  const [tools] = useState<ToolItem[]>(initialTools)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory)
  const [selectedTool, setSelectedTool] = useState<string | null>(initialTool)
  const [sort, setSort] = useState<SortKey>(initialSort)
  const [totalMcps] = useState(initialTotalMcps)
  const [browseTotal, setBrowseTotal] = useState(0)
  const [selectedMcp, setSelectedMcp] = useState<McpResult | null>(null)
  const [lastQuery, setLastQuery] = useState(initialQuery)
  const modeRef = useRef<'search' | 'browse'>(initialQuery ? 'search' : 'browse')

  const syncUrl = useCallback(
    (mode: 'search' | 'browse', query: string, category: string | null, tool: string | null, sortKey: SortKey) => {
      const params = new URLSearchParams()
      if (mode === 'search' && query) params.set('q', query)
      if (mode === 'browse') {
        if (category) params.set('category', category)
        if (tool) params.set('tool', tool)
        if (sortKey !== 'quality') params.set('sort', sortKey)
      }
      const qs = params.toString()
      router.replace(qs ? `/mcp-search?${qs}` : '/mcp-search', { scroll: false })
    },
    [router]
  )

  const handleSearch = useCallback(
    async (query: string) => {
      modeRef.current = 'search'
      setSelectedCategory(null)
      setSelectedTool(null)
      setLoading(true)
      setLastQuery(query)
      syncUrl('search', query, null, null, sort)

      try {
        const res = await fetch('/api/mcp/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [syncUrl, sort]
  )

  const handleBrowse = useCallback(
    async (category: string | null, tool: string | null, sortKey: SortKey) => {
      modeRef.current = 'browse'
      setLastQuery('')
      setLoading(true)
      syncUrl('browse', '', category, tool, sortKey)
      try {
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        if (tool) params.set('tool', tool)
        params.set('sort', sortKey)
        params.set('limit', '30')
        const res = await fetch(`/api/mcp/browse?${params.toString()}`)
        const data = await res.json()
        setResults(data.results || [])
        setBrowseTotal(data.total || 0)
      } catch {
        setResults([])
        setBrowseTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [syncUrl]
  )

  const handleCategoryChange = useCallback(
    (cat: string | null) => {
      setSelectedCategory(cat)
      handleBrowse(cat, selectedTool, sort)
    },
    [selectedTool, sort, handleBrowse]
  )

  const handleToolChange = useCallback(
    (tool: string | null) => {
      setSelectedTool(tool)
      handleBrowse(selectedCategory, tool, sort)
    },
    [selectedCategory, sort, handleBrowse]
  )

  const handleSortChange = useCallback(
    (s: SortKey) => {
      setSort(s)
      if (modeRef.current === 'browse') {
        handleBrowse(selectedCategory, selectedTool, s)
      }
    },
    [selectedCategory, selectedTool, handleBrowse]
  )

  const handleClearSearch = useCallback(() => {
    setLastQuery('')
    setSelectedCategory(null)
    setSelectedTool(null)
    handleBrowse(null, null, sort)
  }, [handleBrowse, sort])

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategory(null)
    setSelectedTool(null)
    handleBrowse(null, null, sort)
  }, [handleBrowse, sort])

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    } else {
      handleBrowse(initialCategory, initialTool, initialSort)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isBrowse = modeRef.current === 'browse'
  const activeFilterLabel = (() => {
    if (!isBrowse) return null
    const cat = selectedCategory
      ? categoryGroups.flatMap(g => g.categories).find(c => c.id === selectedCategory)
      : null
    const toolItem = selectedTool ? tools.find(tt => tt.id === selectedTool) : null
    if (cat && toolItem) return `${locale === 'fr' ? cat.labelFr : cat.label} · ${toolItem.label}`
    if (cat) return locale === 'fr' ? cat.labelFr : cat.label
    if (toolItem) return toolItem.label
    return locale === 'fr' ? 'Tous les MCPs' : 'All MCPs'
  })()

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← {t.quiz.home.replace('← ', '')}
          </Link>
          <LocaleToggle />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center space-y-4 mb-10">
          <h1 className="text-4xl font-bold text-zinc-50">{t.mcpSearch.title}</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">{t.mcpSearch.subtitle}</p>
        </div>

        <div className="mb-10">
          <McpSearchInput onSearch={handleSearch} onClear={handleClearSearch} loading={loading} initialValue={lastQuery} />
        </div>

        <div className="flex gap-8">
          {categoryGroups.length > 0 && (
            <aside className="hidden md:block w-56 shrink-0 space-y-6">
              <Link
                href="/mcp-search/saved"
                className="flex items-center gap-2 w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                {t.mcpSearch.saved}
              </Link>
              <McpCategoryFilters
                groups={categoryGroups}
                tools={tools}
                selectedCategory={selectedCategory}
                selectedTool={selectedTool}
                onCategoryChange={handleCategoryChange}
                onToolChange={handleToolChange}
                onClearAll={handleClearAllFilters}
                total={totalMcps}
              />
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {isBrowse && !loading && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{activeFilterLabel}</span>
                  <span className="text-zinc-600"> · {browseTotal} MCPs</span>
                </p>
                <McpSortSelect value={sort} onChange={handleSortChange} />
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <p className="text-zinc-500 animate-pulse">{t.mcpSearch.searching}</p>
              </div>
            ) : (
              <>
                {modeRef.current === 'search' && results.length > 0 && (
                  <McpDeepAnalysis query={lastQuery} results={results} onSelectMcp={setSelectedMcp} />
                )}
                <McpSearchResults
                  results={results}
                  onSelect={setSelectedMcp}
                  showCount={modeRef.current === 'search'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <McpDetailSheet mcp={selectedMcp} query={lastQuery} onClose={() => setSelectedMcp(null)} />
    </main>
  )
}
