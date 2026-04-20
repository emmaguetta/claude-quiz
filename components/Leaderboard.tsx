'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/components/LocaleProvider'
import { useAuth } from '@/components/AuthProvider'

type LeaderboardEntry = {
  rank: number
  user_id: string
  display_name: string
  total_attempts: number
  correct_attempts: number
  accuracy_pct: number
  unique_questions: number
}

const TABS = ['easy', 'medium', 'hard'] as const
type Tab = typeof TABS[number]

const TAB_COLORS: Record<Tab, string> = {
  easy: 'text-emerald-400 border-emerald-400',
  medium: 'text-amber-400 border-amber-400',
  hard: 'text-red-400 border-red-400',
}

const RANK_STYLES: Record<number, string> = {
  1: 'font-bold',
  2: 'font-bold',
  3: 'font-bold',
}

const RANK_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-400'
  if (pct >= 60) return 'text-amber-400'
  return 'text-red-400'
}

export function Leaderboard() {
  const { t } = useLocale()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('easy')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async (difficulty: Tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?difficulty=${difficulty}`)
      if (!res.ok) throw new Error()
      setEntries(await res.json())
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(tab)
  }, [tab, fetchLeaderboard])

  return (
    <div className="mt-10 font-mono">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 border-t border-dashed border-zinc-800" />
        <span className="text-xs tracking-[0.25em] uppercase text-purple-500/70 animate-pulse select-none">
          {t.leaderboard.header}
        </span>
        <div className="flex-1 border-t border-dashed border-zinc-800" />
      </div>

      {/* Subtitle */}
      <p className="text-xs text-zinc-600 mb-4">{t.leaderboard.subtitle}</p>

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
            {t.leaderboard.tabs[d]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-zinc-600 text-sm animate-pulse tracking-wider">LOADING...</div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <div className="text-zinc-700 text-sm tracking-[0.2em] uppercase">{t.leaderboard.empty}</div>
          <div className="text-zinc-700 text-xs tracking-widest">{t.leaderboard.minGames}</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map(entry => {
            const isYou = user?.id === entry.user_id

            return (
              <div
                key={`${entry.user_id}-${tab}`}
                className={`flex items-center gap-3 sm:gap-4 px-4 py-3 rounded text-sm border transition-colors ${
                  isYou
                    ? 'border-purple-500/30 bg-purple-500/5'
                    : 'border-zinc-800/60 bg-zinc-900/40'
                }`}
              >
                {/* Rank */}
                <span
                  className={`w-8 shrink-0 text-base ${RANK_STYLES[entry.rank] ?? 'text-zinc-600'}`}
                  style={RANK_COLORS[entry.rank] ? { color: RANK_COLORS[entry.rank] } : undefined}
                >
                  #{entry.rank}
                </span>

                {/* Player name + difficulty tags */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`truncate ${isYou ? 'text-purple-300 font-medium' : 'text-zinc-200'}`}>
                    {entry.display_name}
                    {isYou && (
                      <span className="ml-1.5 text-xs text-purple-500">{t.leaderboard.you}</span>
                    )}
                  </span>
                </div>

                {/* Accuracy % */}
                <span className="w-16 text-right text-sm font-bold tabular-nums shrink-0 text-zinc-200">
                  {entry.accuracy_pct}%
                </span>

                {/* Correct / Total */}
                <span className="w-14 text-right text-xs text-zinc-500 tabular-nums shrink-0">
                  {entry.correct_attempts}/{entry.total_attempts}
                </span>

                {/* Unique questions played */}
                <span className="w-10 text-right text-xs text-zinc-600 tabular-nums shrink-0">
                  {entry.unique_questions}q
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
