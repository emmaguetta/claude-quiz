'use client'

import { useState } from 'react'
import { useLocale } from '@/components/LocaleProvider'

export type HiScore = {
  correct: number
  total: number
  categories: string[]
  difficulties: string[]
  date: string
}

const TABS = ['easy', 'medium', 'hard'] as const
type Tab = typeof TABS[number]

const TAB_COLORS: Record<Tab, string> = {
  easy: 'text-emerald-400 border-emerald-400',
  medium: 'text-amber-400 border-amber-400',
  hard: 'text-red-400 border-red-400',
}

const RANK_COLOR = 'text-zinc-500'

const MAX_DISPLAY = 5

export function HiScores({ scores }: { scores: HiScore[] }) {
  const { t } = useLocale()
  const [tab, setTab] = useState<Tab>('easy')

  // Filter scores that include the selected difficulty.
  // Legacy scores saved without difficulty tracking (empty array) are shown in every tab.
  const filtered = scores
    .filter(s => s.difficulties.length === 0 || s.difficulties.includes(tab))
    .slice(0, MAX_DISPLAY)

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

      {/* Subtitle */}
      <p className="text-xs text-zinc-600 mb-4">{t.scores.subtitle}</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {TABS.map(d => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition-colors border ${
              tab === d
                ? `${TAB_COLORS[d]} bg-zinc-900 border-current`
                : 'text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-700'
            }`}
          >
            {t.scores.difficulties[d] ?? d}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <div className="text-zinc-700 text-sm tracking-[0.2em] uppercase">{t.scores.empty}</div>
          <div className="text-zinc-700 text-xs tracking-widest animate-pulse">
            {t.scores.insertCoin}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s, i) => {
            const pct = Math.round((s.correct / s.total) * 100)

            return (
              <div
                key={i}
                className="flex items-center gap-3 sm:gap-4 px-4 py-3 rounded text-sm border border-zinc-800/60 bg-zinc-900/40 transition-colors"
              >
                {/* Rank */}
                <span className={`w-8 font-bold shrink-0 ${RANK_COLOR}`}>
                  #{i + 1}
                </span>

                {/* Score fraction */}
                <span className="w-14 tabular-nums font-normal shrink-0 text-zinc-400">
                  {s.correct}/{s.total}
                </span>

                {/* Percentage */}
                <span className="w-12 text-xs tabular-nums text-zinc-600 shrink-0">
                  {pct}%
                </span>

                {/* Categories (empty for legacy scores) */}
                <div className="flex flex-wrap gap-1 min-w-0 flex-1 justify-end sm:justify-start">
                  {s.categories.slice(0, 4).map((cat) => (
                    <span
                      key={cat}
                      className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400 whitespace-nowrap"
                    >
                      {t.card.categories[cat] ?? cat}
                    </span>
                  ))}
                  {s.categories.length > 4 && (
                    <span className="text-[10px] text-zinc-600 self-center">+{s.categories.length - 4}</span>
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
