'use client'

import { useLocale } from '@/components/LocaleProvider'

export type HiScore = {
  correct: number
  total: number
  categories: string[]
  difficulties: string[]
  date: string
}

const CAT_SHORT: Record<string, string> = {
  commands: 'CMD',
  shortcuts: 'SHRT',
  concepts: 'CONC',
  mcp: 'MCP',
  workflow: 'WF',
}

const DIFF_COLOR: Record<string, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
}

const RANK_COLOR = [
  'text-yellow-400',
  'text-zinc-300',
  'text-amber-600',
  'text-zinc-500',
  'text-zinc-600',
]

export function HiScores({ scores }: { scores: HiScore[] }) {
  const { t } = useLocale()
  return (
    <div className="mt-10 font-mono">
      {/* Retro divider header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 border-t border-dashed border-zinc-800" />
        <span className="text-xs tracking-[0.25em] uppercase text-emerald-500/70 animate-pulse select-none">
          {t.scores.header}
        </span>
        <div className="flex-1 border-t border-dashed border-zinc-800" />
      </div>

      {scores.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <div className="text-zinc-700 text-sm tracking-[0.2em] uppercase">{t.scores.empty}</div>
          <div className="text-zinc-700 text-xs tracking-widest animate-pulse">
            {t.scores.insertCoin}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {scores.map((s, i) => {
            const pct = Math.round((s.correct / s.total) * 100)
            const noFilters = s.categories.length === 0 && s.difficulties.length === 0

            return (
              <div
                key={i}
                className={`flex items-center gap-4 px-4 py-3 rounded text-sm border transition-colors ${
                  i === 0
                    ? 'border-yellow-500/20 bg-yellow-500/5'
                    : 'border-zinc-800/60 bg-zinc-900/40'
                }`}
              >
                {/* Rank */}
                <span className={`w-8 font-bold shrink-0 ${RANK_COLOR[i] ?? 'text-zinc-600'}`}>
                  #{i + 1}
                </span>

                {/* Score */}
                <span
                  className={`tabular-nums w-24 font-bold shrink-0 ${
                    i === 0 ? 'text-yellow-400' : 'text-zinc-300'
                  }`}
                >
                  {s.correct}/{s.total}
                  <span
                    className={`ml-1.5 text-xs font-normal ${
                      i === 0 ? 'text-yellow-600' : 'text-zinc-600'
                    }`}
                  >
                    {pct}%
                  </span>
                </span>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {noFilters ? (
                    <span className="text-xs text-zinc-700 uppercase tracking-wide">{t.scores.all}</span>
                  ) : (
                    <>
                      {s.categories.map(c => (
                        <span
                          key={c}
                          className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wide"
                        >
                          {CAT_SHORT[c] ?? c}
                        </span>
                      ))}
                      {s.difficulties.map(d => (
                        <span
                          key={d}
                          className={`text-xs px-2 py-1 rounded bg-zinc-800 uppercase tracking-wide ${
                            DIFF_COLOR[d] ?? 'text-zinc-400'
                          }`}
                        >
                          {t.scores.difficulties[d] ?? d}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                {/* Date */}
                <span className="text-xs text-zinc-600 tabular-nums whitespace-nowrap shrink-0">
                  {s.date}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
