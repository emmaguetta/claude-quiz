'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { QuizCard } from '@/components/QuizCard'
import { AnswerFeedback } from '@/components/AnswerFeedback'
import { QuizFilters } from '@/components/QuizFilters'
import type { DeveloperFilter } from '@/components/QuizFilters'
import { HiScores } from '@/components/HiScores'
import type { HiScore } from '@/components/HiScores'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/lib/supabase'

const SESSION_KEY = 'claude-quiz-session'
const HI_SCORES_KEY = 'claude-quiz-hiscores'
const FILTERS_KEY = 'claude-quiz-filters'
const PROFILE_BANNER_KEY = 'claude-quiz-profile-filters-applied'
const RECAP_KEY = 'claude-quiz-recap'
const TARGET = 10
const MAX_HI_SCORES = 10

type SessionData = { seen: string[]; correct: number; total: number }
type FiltersData = { categories: string[]; difficulties: string[]; developer: DeveloperFilter }
type Counts = { categories: Record<string, number>; difficulties: Record<string, number>; developerCount: number }

function loadFilters(): FiltersData {
  if (typeof window === 'undefined') return { categories: [], difficulties: [], developer: null }
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) ?? 'null') ?? { categories: [], difficulties: [], developer: null }
  } catch {
    return { categories: [], difficulties: [], developer: null }
  }
}

function saveFilters(f: FiltersData) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(f))
}

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

type RecapData = {
  score: { correct: number; total: number }
  filters: { categories: string[]; difficulties: string[]; developer: DeveloperFilter }
  history: { question: Question; selectedIdx: number }[]
}

function loadRecap(): RecapData | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(RECAP_KEY) ?? 'null')
  } catch {
    return null
  }
}

function saveRecap(data: RecapData) {
  localStorage.setItem(RECAP_KEY, JSON.stringify(data))
}

function clearRecap() {
  localStorage.removeItem(RECAP_KEY)
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback: should never hit on modern browsers
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function RecapRow({ entry, index, t }: { entry: { question: Question; selectedIdx: number }; index: number; t: any }) {
  const [open, setOpen] = useState(false)
  const isCorrect = entry.selectedIdx === entry.question.correct_idx

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-4">
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium bg-zinc-800 text-zinc-500">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-lg text-zinc-200 leading-relaxed">{entry.question.question}</p>
          <div className="mt-2.5 space-y-1.5">
            <p className="text-base flex items-center gap-2">
              <span className={isCorrect ? 'text-emerald-500' : 'text-red-400'}>
                {isCorrect ? '✓' : '✗'}
              </span>
              <span className="text-zinc-400">{entry.question.options[entry.selectedIdx]}</span>
            </p>
            {!isCorrect && (
              <p className="text-base flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span className="text-zinc-300">{entry.question.options[entry.question.correct_idx]}</span>
              </p>
            )}
          </div>
          {entry.question.explanation && (
            <>
              <button
                onClick={() => setOpen(!open)}
                className="mt-2.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {t.quiz.summaryWhy} {open ? '▾' : '▸'}
              </button>
              {open && (
                <p className="mt-2 text-base text-zinc-500 leading-relaxed">{entry.question.explanation}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const { user } = useAuth()
  const { locale, t } = useLocale()
  const supabase = useMemo(() => createClient(), [])
  const sessionIdRef = useRef<string>(newSessionId())
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [session, setSession] = useState<SessionData>({ seen: [], correct: 0, total: 0 })
  const [prevQuestion, setPrevQuestion] = useState<{ question: Question; selectedIdx: number } | null>(null)
  const [viewingPrev, setViewingPrev] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [difficulties, setDifficulties] = useState<string[]>([])
  const [developerFilter, setDeveloperFilter] = useState<DeveloperFilter>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [hiScores, setHiScores] = useState<HiScore[]>([])
  const [showProfileBanner, setShowProfileBanner] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<{ question: Question; selectedIdx: number }[]>([])
  const [showRecap, setShowRecap] = useState(false)
  const [recapScore, setRecapScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
  const [recapFilters, setRecapFilters] = useState<{ categories: string[]; difficulties: string[]; developer: DeveloperFilter }>({ categories: [], difficulties: [], developer: null })

  const fetchQuestion = useCallback(async (opts: {
    seen: string[]
    categories: string[]
    difficulties: string[]
    developer?: DeveloperFilter
  }) => {
    setLoading(true)
    setError(null)
    setSelectedIdx(null)

    const params = new URLSearchParams()
    if (opts.categories.length > 0) params.set('categories', opts.categories.join(','))
    if (opts.difficulties.length > 0) params.set('difficulties', opts.difficulties.join(','))
    if (opts.seen.length > 0) params.set('exclude', opts.seen.join(','))
    if (opts.developer) params.set('developer', opts.developer)
    params.set('lang', locale)

    try {
      const res = await fetch(`/api/questions/random?${params}`)
      if (!res.ok) throw new Error(t.quiz.loadError)
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
      setError(e instanceof Error ? e.message : t.quiz.unknownError)
    } finally {
      setLoading(false)
    }
  }, [t, locale])

  // Initial mount
  useEffect(() => {
    const savedFilters = loadFilters()
    setHiScores(loadHiScores())
    setCategories(savedFilters.categories)
    setDifficulties(savedFilters.difficulties)
    setDeveloperFilter(savedFilters.developer)

    // Show profile banner if filters were just applied from onboarding
    if (localStorage.getItem(PROFILE_BANNER_KEY) === 'true') {
      setShowProfileBanner(true)
      localStorage.removeItem(PROFILE_BANNER_KEY)
    }

    // Restore recap if it was saved
    const savedRecap = loadRecap()
    if (savedRecap) {
      setShowRecap(true)
      setRecapScore(savedRecap.score)
      setRecapFilters(savedRecap.filters)
      setSessionHistory(savedRecap.history)
      setLoading(false)
    } else {
      const saved = loadSession()
      // If previous session was completed, start fresh
      if (saved.total >= TARGET) {
        const fresh = { seen: [], correct: 0, total: 0 }
        setSession(fresh)
        saveSession(fresh)
        sessionIdRef.current = newSessionId()
        fetchQuestion({ seen: [], ...savedFilters })
      } else {
        setSession(saved)
        fetchQuestion({ seen: saved.seen, ...savedFilters })
      }
    }

    fetch(`/api/questions/counts?lang=${locale}`)
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {})
  }, [fetchQuestion, locale])

  function handleSelect(idx: number) {
    if (selectedIdx !== null || !question || session.total >= TARGET) return
    setSelectedIdx(idx)
    const isCorrect = idx === question.correct_idx
    const next: SessionData = {
      seen: [...session.seen, question.id],
      correct: session.correct + (isCorrect ? 1 : 0),
      total: session.total + 1,
    }
    setSession(next)
    saveSession(next)
    setSessionHistory(prev => [...prev, { question, selectedIdx: idx }])

    // Persist attempt to DB for logged-in users (RLS enforces user_id = auth.uid())
    if (user) {
      const attemptQuestionId = question.id
      const attemptSelectedIdx = idx
      const attemptIsCorrect = isCorrect
      const attemptSessionId = sessionIdRef.current
      void supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          question_id: attemptQuestionId,
          selected_idx: attemptSelectedIdx,
          is_correct: attemptIsCorrect,
          session_id: attemptSessionId,
        })
        .then(({ error }) => {
          if (error) {
            // Non-fatal — local session keeps working even if tracking fails
            console.warn('[quiz_attempts] insert failed', error.message)
          }
        })
    }

    // Save hi-score when session reaches exactly TARGET
    if (next.total === TARGET) {
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
    if (session.total >= TARGET) return
    if (question && selectedIdx !== null) {
      setPrevQuestion({ question, selectedIdx })
    }
    setViewingPrev(false)
    fetchQuestion({ seen: session.seen, categories, difficulties, developer: developerFilter })
  }

  function handleCategoriesChange(cats: string[]) {
    setCategories(cats)
    saveFilters({ categories: cats, difficulties, developer: developerFilter })
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    setSessionHistory([])
    sessionIdRef.current = newSessionId()
    fetchQuestion({ seen: [], categories: cats, difficulties, developer: developerFilter })
  }

  function handleDifficultiesChange(diffs: string[]) {
    setDifficulties(diffs)
    saveFilters({ categories, difficulties: diffs, developer: developerFilter })
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    setSessionHistory([])
    sessionIdRef.current = newSessionId()
    fetchQuestion({ seen: [], categories, difficulties: diffs, developer: developerFilter })
  }

  function handleDeveloperFilterChange(f: DeveloperFilter) {
    setDeveloperFilter(f)
    saveFilters({ categories, difficulties, developer: f })
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    setSessionHistory([])
    sessionIdRef.current = newSessionId()
    fetchQuestion({ seen: [], categories, difficulties, developer: f })
  }

  function resetSession() {
    const fresh = { seen: [], correct: 0, total: 0 }
    setSession(fresh)
    saveSession(fresh)
    setSessionHistory([])
    setShowRecap(false)
    clearRecap()
    sessionIdRef.current = newSessionId()
    fetchQuestion({ seen: [], categories, difficulties, developer: developerFilter })
  }

  const progress = showRecap ? 100 : Math.min((session.total / TARGET) * 100, 100)
  const sessionComplete = session.total === TARGET

  // Which question to display
  const displayQuestion = viewingPrev ? prevQuestion?.question ?? null : question
  const displaySelectedIdx = viewingPrev ? prevQuestion?.selectedIdx ?? null : selectedIdx

  return (
    <main className="min-h-screen text-zinc-100">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-base text-zinc-500 hover:text-zinc-300 transition-colors">
            {t.quiz.home}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={resetSession}
              title={t.quiz.newSession}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <span className="text-sm sm:text-base text-zinc-400">
              {showRecap ? recapScore.correct : session.correct}/{showRecap ? recapScore.total : session.total} {t.quiz.correct}
            </span>
            <LocaleToggle />
          </div>
        </div>

        {/* Profile banner */}
        {showProfileBanner && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-sm text-amber-300/80">
              {t.quiz.profileBanner}
            </p>
            <button
              onClick={() => setShowProfileBanner(false)}
              className="text-sm text-zinc-500 hover:text-zinc-300 ml-4 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8 space-y-1">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t.quiz.session}</span>
            <span>{showRecap ? TARGET : session.total}/{TARGET}</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>

        {/* Mobile filters toggle */}
        {counts && (
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showMobileFilters ? t.quiz.filtersToggleHide : t.quiz.filtersToggleShow}
            </button>
            {showMobileFilters && (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <QuizFilters
                  counts={counts}
                  categories={categories}
                  difficulties={difficulties}
                  developerFilter={developerFilter}
                  onCategoriesChange={handleCategoriesChange}
                  onDifficultiesChange={handleDifficultiesChange}
                  onDeveloperFilterChange={handleDeveloperFilterChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Quiz + Filters */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Quiz content */}
          <div className="flex-1 min-w-0 w-full space-y-4">

            {/* --- Recap screen --- */}
            {showRecap ? (
              <div className="space-y-8">
                {/* Score */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4">
                  <div className="text-4xl font-bold text-zinc-100">{recapScore.correct}/{recapScore.total}</div>
                  <p className="text-lg text-zinc-400">
                    {recapScore.correct >= recapScore.total * 0.8
                      ? t.quiz.summaryExcellent
                      : recapScore.correct >= recapScore.total * 0.5
                      ? t.quiz.summaryGood
                      : t.quiz.summaryKeepGoing}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500">
                    {recapFilters.categories.length > 0
                      ? recapFilters.categories.map(c => (
                          <span key={c} className="rounded-full border border-zinc-700 px-3 py-1 capitalize">{c}</span>
                        ))
                      : <span className="rounded-full border border-zinc-700 px-3 py-1">{locale === 'fr' ? 'Toutes catégories' : 'All categories'}</span>
                    }
                    {recapFilters.difficulties.length > 0
                      ? recapFilters.difficulties.map(d => (
                          <span key={d} className="rounded-full border border-zinc-700 px-3 py-1 capitalize">{d}</span>
                        ))
                      : <span className="rounded-full border border-zinc-700 px-3 py-1">{locale === 'fr' ? 'Toutes difficultés' : 'All difficulties'}</span>
                    }
                    {recapFilters.developer && (
                      <span className="rounded-full border border-zinc-700 px-3 py-1">
                        {recapFilters.developer === 'only' ? 'Dev' : 'Non-dev'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={resetSession}
                    className="mt-2 inline-block rounded-lg bg-zinc-800 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                  >
                    {t.quiz.newSession}
                  </button>
                </div>

                {/* Question list */}
                {sessionHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">{t.quiz.summaryTitle}</h3>
                    <div className="divide-y divide-zinc-800/60">
                      {sessionHistory.map((entry, i) => (
                        <RecapRow key={entry.question.id} entry={entry} index={i} t={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* --- Normal quiz flow --- */}
                {loading && !viewingPrev && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-zinc-500 text-base animate-pulse">{t.quiz.loading}</div>
                  </div>
                )}

                {error && !viewingPrev && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                    {error}
                    <button
                      onClick={() => fetchQuestion({ seen: session.seen, categories, difficulties })}
                      className="ml-3 underline hover:no-underline"
                    >
                      {t.quiz.retry}
                    </button>
                  </div>
                )}

                {viewingPrev && prevQuestion && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span>{t.quiz.prevReadonly}</span>
                    </div>
                    <QuizCard question={prevQuestion.question} selectedIdx={prevQuestion.selectedIdx} onSelect={() => {}} />
                    <AnswerFeedback
                      question={prevQuestion.question}
                      selectedIdx={prevQuestion.selectedIdx}
                      onNext={() => setViewingPrev(false)}
                      sessionCount={session.total}
                      hideNext={false}
                      nextLabel={t.quiz.backToCurrent}
                    />
                  </>
                )}

                {!viewingPrev && !loading && !error && question && (
                  <>
                    {prevQuestion && selectedIdx === null && (
                      <button
                        onClick={() => setViewingPrev(true)}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {t.quiz.prevQuestion}
                      </button>
                    )}
                    <QuizCard question={question} selectedIdx={selectedIdx} onSelect={handleSelect} />
                    {selectedIdx !== null && (
                      <>
                        <AnswerFeedback
                          question={question}
                          selectedIdx={selectedIdx}
                          onNext={sessionComplete ? () => {
                          const score = { correct: session.correct, total: session.total }
                          const filters = { categories, difficulties, developer: developerFilter }
                          setRecapScore(score)
                          setRecapFilters(filters)
                          setShowRecap(true)
                          saveRecap({ score, filters, history: sessionHistory })
                        } : handleNext}
                          sessionCount={session.total}
                          hideNext={false}
                          nextLabel={sessionComplete ? t.quiz.viewRecap : undefined}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Filter sidebar — hidden on mobile, shown on lg+ */}
          {counts && (
            <div className="hidden lg:block w-44 shrink-0 sticky top-8">
              <QuizFilters
                counts={counts}
                categories={categories}
                difficulties={difficulties}
                developerFilter={developerFilter}
                onCategoriesChange={handleCategoriesChange}
                onDifficultiesChange={handleDifficultiesChange}
                onDeveloperFilterChange={handleDeveloperFilterChange}
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
