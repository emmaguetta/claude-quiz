'use client'

import { useState } from 'react'
import { useLocale } from '@/components/LocaleProvider'

type CategoryItem = {
  id: string
  label: string
  labelFr: string
  count: number
}

type CategoryGroup = {
  id: string
  label: string
  labelFr: string
  categories: CategoryItem[]
}

type ToolItem = {
  id: string
  label: string
  count: number
}

type Props = {
  groups: CategoryGroup[]
  tools: ToolItem[]
  selectedCategory: string | null
  selectedTool: string | null
  onCategoryChange: (category: string | null) => void
  onToolChange: (tool: string | null) => void
  onClearAll: () => void
  total: number
}

const TOOLS_COLLAPSED_LIMIT = 10

export function McpCategoryFilters({
  groups,
  tools,
  selectedCategory,
  selectedTool,
  onCategoryChange,
  onToolChange,
  onClearAll,
  total,
}: Props) {
  const { locale, t } = useLocale()
  const [toolsExpanded, setToolsExpanded] = useState(false)

  const visibleTools = toolsExpanded ? tools : tools.slice(0, TOOLS_COLLAPSED_LIMIT)
  const hasMoreTools = tools.length > TOOLS_COLLAPSED_LIMIT

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-zinc-500 px-3 mb-2">
        {t.mcpSearch.filterByCategory}
      </p>

      {/* All button — clears BOTH axes in one go */}
      <button
        onClick={onClearAll}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedCategory === null && selectedTool === null
            ? 'bg-zinc-800 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
        }`}
      >
        <span>{t.mcpSearch.allCategories}</span>
        <span
          className={`text-xs tabular-nums ${
            selectedCategory === null && selectedTool === null ? 'text-zinc-400' : 'text-zinc-700'
          }`}
        >
          {total}
        </span>
      </button>

      {/* Use-case categories (one axis) */}
      {groups.map((group) => (
        <div key={group.id} className="pt-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-3 pb-1 font-medium">
            {locale === 'fr' ? group.labelFr : group.label}
          </p>
          {group.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
              }`}
            >
              <span className="truncate">{locale === 'fr' ? cat.labelFr : cat.label}</span>
              <span
                className={`text-xs tabular-nums ml-2 ${
                  selectedCategory === cat.id ? 'text-zinc-400' : 'text-zinc-700'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      ))}

      {/* Tools — second, combinable axis */}
      {tools.length > 0 && (
        <div className="pt-5 mt-3 border-t border-zinc-900">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-3 pb-1 pt-2 font-medium">
            {locale === 'fr' ? 'Outils' : 'Tools'}
          </p>
          {visibleTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(selectedTool === tool.id ? null : tool.id)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedTool === tool.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
              }`}
            >
              <span className="truncate">{tool.label}</span>
              <span
                className={`text-xs tabular-nums ml-2 ${
                  selectedTool === tool.id ? 'text-zinc-400' : 'text-zinc-700'
                }`}
              >
                {tool.count}
              </span>
            </button>
          ))}
          {hasMoreTools && (
            <button
              onClick={() => setToolsExpanded((v) => !v)}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {toolsExpanded
                ? locale === 'fr' ? '− Voir moins' : '− Show less'
                : locale === 'fr' ? `+ ${tools.length - TOOLS_COLLAPSED_LIMIT} de plus` : `+ ${tools.length - TOOLS_COLLAPSED_LIMIT} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
