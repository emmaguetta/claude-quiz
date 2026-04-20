'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'

type DiffStat = { difficulty: string; total: number; correct: number; pct: number | null }
type CatStat = { category: string; pct: number; total: number } | null

type Stats = {
  total: number
  correct: number
  pct: number
  difficulties: DiffStat[]
  bestCategory: CatStat
  worstCategory: CatStat
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
}

export function UserStats() {
  const { user } = useAuth()
  const { t } = useLocale()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user || loading || !stats) return null

  const catLabels = t.filters.categories as Record<string, string>
  const diffLabels = t.filters.difficulties as Record<string, string>

  return (
    <div className="mt-10 font-mono">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 border-t border-dashed border-zinc-800" />
        <span className="text-xs tracking-[0.25em] uppercase text-cyan-500/70 animate-pulse select-none">
          {t.userStats.header}
        </span>
        <div className="flex-1 border-t border-dashed border-zinc-800" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total questions */}
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-200 tabular-nums">{stats.total}</div>
          <div className="text-xs text-zinc-600 mt-1">{t.userStats.totalQuestions}</div>
        </div>

        {/* Global accuracy */}
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-200 tabular-nums">{stats.pct}%</div>
          <div className="text-xs text-zinc-600 mt-1">{t.userStats.accuracy}</div>
        </div>

        {/* Best category */}
        {stats.bestCategory && (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-center">
            <div className="text-sm font-bold text-emerald-400">{catLabels[stats.bestCategory.category] ?? stats.bestCategory.category}</div>
            <div className="text-lg font-bold text-zinc-300 tabular-nums">{stats.bestCategory.pct}%</div>
            <div className="text-xs text-zinc-600 mt-1">{t.userStats.bestCategory}</div>
          </div>
        )}

        {/* Worst category */}
        {stats.worstCategory && (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 text-center">
            <div className="text-sm font-bold text-red-400">{catLabels[stats.worstCategory.category] ?? stats.worstCategory.category}</div>
            <div className="text-lg font-bold text-zinc-300 tabular-nums">{stats.worstCategory.pct}%</div>
            <div className="text-xs text-zinc-600 mt-1">{t.userStats.worstCategory}</div>
          </div>
        )}
      </div>

      {/* Per-difficulty breakdown */}
      <div className="mt-4 flex gap-3">
        {stats.difficulties.map(d => (
          <div key={d.difficulty} className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 text-center">
            <div className={`text-xs font-bold uppercase tracking-wider ${DIFF_COLORS[d.difficulty] ?? 'text-zinc-400'}`}>
              {diffLabels[d.difficulty] ?? d.difficulty}
            </div>
            {d.pct !== null ? (
              <>
                <div className="text-lg font-bold text-zinc-300 tabular-nums mt-1">{d.pct}%</div>
                <div className="text-xs text-zinc-600 tabular-nums">{d.correct}/{d.total}</div>
              </>
            ) : (
              <div className="text-xs text-zinc-700 mt-2">—</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
