'use client'

import { useLocale } from '@/components/LocaleProvider'

type Counts = {
  categories: Record<string, number>
  difficulties: Record<string, number>
  developerCount: number
}

export type DeveloperFilter = null | 'only' | 'exclude'

type Props = {
  counts: Counts
  categories: string[]
  difficulties: string[]
  developerFilter: DeveloperFilter
  onCategoriesChange: (c: string[]) => void
  onDifficultiesChange: (d: string[]) => void
  onDeveloperFilterChange: (f: DeveloperFilter) => void
}

const DIFFICULTY_DOT: Record<string, string> = {
  easy:   'bg-emerald-400',
  medium: 'bg-amber-400',
  hard:   'bg-red-400',
}

export function QuizFilters({ counts, categories, difficulties, developerFilter, onCategoriesChange, onDifficultiesChange, onDeveloperFilterChange }: Props) {
  const { t } = useLocale()
  const totalQuestions = Object.values(counts.categories).reduce((a, b) => a + b, 0)

  function toggleCategory(key: string) {
    const next = categories.includes(key)
      ? categories.filter(c => c !== key)
      : [...categories, key]
    onCategoriesChange(next)
  }

  function toggleDifficulty(key: string) {
    const next = difficulties.includes(key)
      ? difficulties.filter(d => d !== key)
      : [...difficulties, key]
    onDifficultiesChange(next)
  }

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-widest text-zinc-500 px-3">{t.filters.title}</p>

      {/* Catégorie */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 px-3">{t.filters.category}</p>
        <div className="space-y-0.5">
          <FilterItem
            label={t.filters.all}
            count={totalQuestions}
            active={categories.length === 0}
            onClick={() => onCategoriesChange([])}
          />
          {Object.entries(t.filters.categories).map(([key, label]) =>
            counts.categories[key] ? (
              <FilterItem
                key={key}
                label={label}
                count={counts.categories[key]}
                active={categories.includes(key)}
                onClick={() => toggleCategory(key)}
              />
            ) : null
          )}
        </div>
      </div>

      {/* Difficulté */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 px-3">{t.filters.difficulty}</p>
        <div className="space-y-0.5">
          <FilterItem
            label={t.filters.all}
            count={Object.values(counts.difficulties).reduce((a, b) => a + b, 0)}
            active={difficulties.length === 0}
            onClick={() => onDifficultiesChange([])}
          />
          {Object.entries(t.filters.difficulties).map(([key, label]) =>
            counts.difficulties[key] ? (
              <FilterItem
                key={key}
                label={label}
                count={counts.difficulties[key]}
                active={difficulties.includes(key)}
                dot={DIFFICULTY_DOT[key]}
                onClick={() => toggleDifficulty(key)}
              />
            ) : null
          )}
        </div>
      </div>

      {/* Type */}
      {counts.developerCount > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 px-3">{t.filters.type}</p>
          <div className="space-y-0.5">
            <FilterItem
              label={t.filters.all}
              count={totalQuestions}
              active={developerFilter === null}
              onClick={() => onDeveloperFilterChange(null)}
            />
            <FilterItem
              label={t.filters.dev}
              count={counts.developerCount}
              active={developerFilter === 'only'}
              dot="bg-indigo-400"
              onClick={() => onDeveloperFilterChange(developerFilter === 'only' ? null : 'only')}
            />
            <FilterItem
              label={t.filters.nonDev}
              count={totalQuestions - counts.developerCount}
              active={developerFilter === 'exclude'}
              dot="bg-zinc-400"
              onClick={() => onDeveloperFilterChange(developerFilter === 'exclude' ? null : 'exclude')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FilterItem({
  label,
  count,
  active,
  dot,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
      }`}
    >
      <span className="flex items-center gap-2">
        {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
        {label}
      </span>
      <span className={`text-xs tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
        {count}
      </span>
    </button>
  )
}
