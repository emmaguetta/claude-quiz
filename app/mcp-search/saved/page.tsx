'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { McpCard, getSavedMcps } from '@/components/mcp/McpCard'
import { McpDetailSheet } from '@/components/mcp/McpDetailSheet'
import type { McpResult } from '@/components/mcp/McpCard'

export default function SavedMcpsPage() {
  const { t } = useLocale()
  const [mcps, setMcps] = useState<McpResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMcp, setSelectedMcp] = useState<McpResult | null>(null)

  useEffect(() => {
    const ids = getSavedMcps()
    if (ids.length === 0) { setLoading(false); return }

    fetch('/api/mcp/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMcps(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/mcp-search" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← {t.mcpSearch.backToSearch.replace('← ', '')}
          </Link>
          <LocaleToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center space-y-2 mb-10">
          <h1 className="text-3xl font-bold text-zinc-50">{t.mcpSearch.saved}</h1>
          <p className="text-zinc-500">{t.mcpSearch.savedSubtitle}</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 animate-pulse">Loading...</p>
          </div>
        ) : mcps.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600">{t.mcpSearch.savedEmpty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mcps.map(mcp => (
              <McpCard key={mcp.id} mcp={mcp} onSelect={setSelectedMcp} />
            ))}
          </div>
        )}
      </div>

      <McpDetailSheet mcp={selectedMcp} query="" onClose={() => setSelectedMcp(null)} />
    </main>
  )
}
