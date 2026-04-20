'use client'

import { useLocale } from '@/components/LocaleProvider'
import { McpCard, type McpResult } from './McpCard'

type Props = {
  results: McpResult[]
  onSelect: (mcp: McpResult) => void
  showCount?: boolean
}

export function McpSearchResults({ results, onSelect, showCount = false }: Props) {
  const { t } = useLocale()

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">{t.mcpSearch.noResults}</p>
        <p className="text-sm text-zinc-600 mt-1">{t.mcpSearch.tryAnother}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showCount && <p className="text-sm text-zinc-600">{t.mcpSearch.results(results.length)}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {results.map(mcp => (
          <McpCard key={mcp.id} mcp={mcp} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
