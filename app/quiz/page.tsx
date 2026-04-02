'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { QuizCard } from '@/components/QuizCard'
import { AnswerFeedback } from '@/components/AnswerFeedback'
import { QuizFilters } from '@/components/QuizFilters'
import { HiScores } from '@/components/HiScores'
import type { HiScore } from '@/components/HiScores'
import type { Question } from '@/lib/supabase'

const SESSION_KEY = 'claude-quiz-session'
const HI_SCORES_KEY = 'claude-quiz-hiscores'
const TARGET = 15
const MAX_HI_SCORES = 5

type SessionData = { seen: string[]; correct: number; total: number }
type Counts = { categories: Record<string, number>; difficulties: Record<string, number> }

function loadSession(): SessionData {
  if (typeof window === 'undefined') return { seen: [], correct: 0, total: 0 }
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') ?? { seen: [], correct: 0, total: 0 }
  } catch {
    return { seen: [], correct: 0, total: 0 }
  }
}

function saveSession(s: SessionData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

function loadHiScores(): HiScore[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HI_SCORES_KEY) ?? '[]') ?? []
  } catch {
    return []
  }
}

function addHiScore(entry: HiScore): HiScore[] {
  const all = loadHiScores()
  all.push(entry)
  all.sort((a, b) => b.correct / b.total - a.correct / a.total)
  const top = all.slice(0, MAX_HI_SCORES)
  localStorage.setItem(HI_SCORES_KEY, JSON.stringify(top))
  return top
}

export default function QuizPage() {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [session, setSession] = useState<SessionData>({ seen: [], correct: 0, total: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [difficulties, setDifficulties] = useState<string[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [hiScores, setHiScores] = useState<HiScore[]>([])

  const fetchQuestion = useCallback(async (opts: {
    seen: string[]
    categories: string[]
    difficulties: string[]
  }) => {
    setLoading(true)
    setError(null)
    setSelectedIdx(null)

    const params = new URLSearchParams()
    if (opts.categories.length > 0) params.set('categories', opts.categories.join(','))
    if (opts.difficulties.length > 0) params.set('difficulties', opts.difficulties.join(','))
    if (opts.seen.length > 0) params.set('exclude', opts.seen.join(','))

    try {
      const res = await fetch(`/api/questions/random?${params}`)
      if (!res.ok) throw new Error('Impossible de charger une question')
      const { _resetSeen, ...questionData } = await res.json()

      if (_resetSeen) {
        // Pool exhausted — seen cleared server-side, sync client
        setSession(prev => {
          const updated = { ...prev, seen: [] }
          saveSession(updated)
          return updated
        })
      }

      setQuestion(questionData as Question)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial mount
  useEffect(() => {
    const saved = loadSession()
    setSession(saved)
    setHiScores(loadHiScores())
    fetchQuestion({ seen: saved.seen, categories: [], difficulties: [] })

    fetch('/api/questions/counts')
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {})
  }, [fetchQuestion])

  function handleSelect(idx: number) {
    if (selectedIdx !== null || !question) return
    setSelectedIdx(idx)
    const isCorrect = idx === question.correct_idx
    const next: SessionData = {
      seen: [...session.seen, question.id],
      correct: session.correct + (isCorrect ? 1 : 0),
      total: session.total + 1,
    }
    setSession(next)
    saveSession(next)

    // Save hi-score at the end of every TARGET-question block
    if (next.total % TARGET === 0) {
      const entry: HiScore = {
        correct: next.correct,
        total: next.total,
        categories,
        difficulties,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      }
      setHiScores(addHiScore(entry))
    }
  }

  function handleNext() {
    fetchQuestion({ seen: session.seen, categories, difficulties })
  }

  function handleCategoriesChange(cats: string[]) {
    setCategories(cats)
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    fetchQuestion({ seen: [], categories: cats, difficulties })
  }

  function handleDifficultiesChange(diffs: string[]) {
    setDifficulties(diffs)
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    fetchQuestion({ seen: [], categories, difficulties: diffs })
  }

  function resetSession() {
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    fetchQuestion({ seen: [], categories, difficulties })
  }

  const progress = Math.min((session.total / TARGET) * 100, 100)
  const showSummary = session.total > 0 && session.total % TARGET === 0 && selectedIdx !== null

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl w-full mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-base text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Accueil
          </Link>
          <div className="text-base text-zinc-400">
            {session.correct}/{session.total} correctes
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 space-y-1">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>Session</span>
            <span>{session.total}/{TARGET}</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>

        {/* Quiz + Filters */}
        <div className="flex gap-8 items-start">

          {/* Quiz content */}
          <div className="flex-1 min-w-0 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-zinc-500 text-base animate-pulse">Chargement…</div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                {error}
                <button
                  onClick={() => fetchQuestion({ seen: session.seen, categories, difficulties })}
                  className="ml-3 underline hover:no-underline"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && question && (
              <>
                <QuizCard question={question} selectedIdx={selectedIdx} onSelect={handleSelect} />
                {selectedIdx !== null && (
                  <AnswerFeedback
                    question={question}
                    selectedIdx={selectedIdx}
                    onNext={handleNext}
                    sessionCount={session.total}
                  />
                )}
              </>
            )}

            {showSummary && (
              <div className="mt-6 rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-center space-y-3">
                <div className="text-3xl font-bold">{session.correct}/{session.total}</div>
                <p className="text-zinc-400 text-base">
                  {session.correct >= session.total * 0.8
                    ? 'Excellent ! Tu maîtrises bien Claude Code.'
                    : session.correct >= session.total * 0.5
                    ? "Pas mal ! Continue à t'entraîner."
                    : 'Continue à apprendre — tu progresseras vite !'}
                </p>
                <button
                  onClick={resetSession}
                  className="text-sm text-zinc-400 hover:text-zinc-100 underline underline-offset-2"
                >
                  Nouvelle session
                </button>
              </div>
            )}
          </div>

          {/* Filter sidebar */}
          {counts && (
            <div className="w-44 shrink-0 sticky top-8">
              <QuizFilters
                counts={counts}
                categories={categories}
                difficulties={difficulties}
                onCategoriesChange={handleCategoriesChange}
                onDifficultiesChange={handleDifficultiesChange}
              />
            </div>
          )}

        </div>

        {/* Hi-score table */}
        <HiScores scores={hiScores} />

      </div>
    </main>
  )
}
