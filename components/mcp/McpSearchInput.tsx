'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useLocale } from '@/components/LocaleProvider'

type Props = {
  onSearch: (query: string) => void
  onClear?: () => void
  loading?: boolean
  initialValue?: string
}

export function McpSearchInput({ onSearch, onClear, loading, initialValue = '' }: Props) {
  const { t } = useLocale()
  const [value, setValue] = useState(initialValue)

  // Sync with external initialValue changes (e.g. browser back)
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.trim().length >= 2) onSearch(value.trim())
    },
    [value, onSearch]
  )

  const handleClear = useCallback(() => {
    setValue('')
    onClear?.()
  }, [onClear])

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={t.mcpSearch.searchPlaceholder}
          className="w-full pl-12 pr-10 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-base transition-colors"
          disabled={loading}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  )
}
