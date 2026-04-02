'use client'

type Counts = {
  categories: Record<string, number>
  difficulties: Record<string, number>
}

type Props = {
  counts: Counts
  categories: string[]
  difficulties: string[]
  onCategoriesChange: (c: string[]) => void
  onDifficultiesChange: (d: string[]) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  commands: 'Commandes',
  shortcuts: 'Raccourcis',
  concepts: 'Concepts',
  mcp: 'MCP',
  workflow: 'Workflow',
}

const DIFFICULTY_CONFIG: Record<string, { label: string; dot: string }> = {
  easy:   { label: 'Facile',   dot: 'bg-emerald-400' },
  medium: { label: 'Moyen',    dot: 'bg-amber-400'   },
  hard:   { label: 'Difficile', dot: 'bg-red-400'    },
}

export function QuizFilters({ counts, categories, difficulties, onCategoriesChange, onDifficultiesChange }: Props) {
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
      {/* Catégorie */}
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 px-3">Catégorie</p>
        <div className="space-y-0.5">
          <FilterItem
            label="Toutes"
            count={totalQuestions}
            active={categories.length === 0}
            onClick={() => onCategoriesChange([])}
          />
          {Object.entries(CATEGORY_LABELS).map(([key, label]) =>
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
        <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2 px-3">Difficulté</p>
        <div className="space-y-0.5">
          <FilterItem
            label="Toutes"
            count={Object.values(counts.difficulties).reduce((a, b) => a + b, 0)}
            active={difficulties.length === 0}
            onClick={() => onDifficultiesChange([])}
          />
          {Object.entries(DIFFICULTY_CONFIG).map(([key, { label, dot }]) =>
            counts.difficulties[key] ? (
              <FilterItem
                key={key}
                label={label}
                count={counts.difficulties[key]}
                active={difficulties.includes(key)}
                dot={dot}
                onClick={() => toggleDifficulty(key)}
              />
            ) : null
          )}
        </div>
      </div>
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
