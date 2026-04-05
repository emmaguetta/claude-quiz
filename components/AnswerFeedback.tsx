'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/LocaleProvider'
import type { Question } from '@/lib/supabase'

type Props = {
  question: Question
  selectedIdx: number
  onNext: () => void
  sessionCount: number
  hideNext?: boolean
  nextLabel?: string
}

export function AnswerFeedback({ question, selectedIdx, onNext, sessionCount, hideNext, nextLabel }: Props) {
  const { t } = useLocale()
  const isCorrect = selectedIdx === question.correct_idx
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [reported, setReported] = useState(false)
  const [reporting, setReporting] = useState(false)

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border p-4 ${
          isCorrect
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xl font-medium ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {isCorrect ? t.feedback.correct : t.feedback.incorrect}
          </span>
          {!isCorrect && (
            <span className="text-base text-zinc-400">
              {t.feedback.correctAnswer}{' '}
              <span className="text-emerald-400 font-medium">
                {String.fromCharCode(65 + question.correct_idx)}. {question.options[question.correct_idx]}
              </span>
            </span>
          )}
        </div>
        <p className="text-base text-zinc-300 leading-relaxed mt-2">{question.explanation}</p>

        <div className="flex items-center gap-3 mt-3">
          {question.learn_more && (
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {showLearnMore ? t.feedback.learnMoreHide : t.feedback.learnMoreShow}
            </button>
          )}
          {question.source_url && (
            <a
              href={question.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              {t.feedback.viewDocs}
            </a>
          )}
          <button
            onClick={async () => {
              if (reported || reporting) return
              setReporting(true)
              try {
                await fetch('/api/questions/report', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ question_id: question.id, reason: 'wrong_answer' }),
                })
                setReported(true)
              } finally {
                setReporting(false)
              }
            }}
            disabled={reported || reporting}
            className={`text-sm transition-colors ml-auto ${
              reported
                ? 'text-amber-400 cursor-default'
                : 'text-zinc-600 hover:text-amber-400'
            }`}
          >
            {reported ? t.feedback.reported : reporting ? '…' : t.feedback.report}
          </button>
        </div>

        {showLearnMore && question.learn_more && (
          <div className="mt-3 pt-3 border-t border-zinc-700/50">
            <p className="text-sm text-zinc-300 leading-relaxed">{question.learn_more}</p>
          </div>
        )}
      </div>

      {!hideNext && (
        <div className="flex justify-end">
          <Button onClick={onNext} className="bg-zinc-100 text-zinc-900 hover:bg-white">
            {nextLabel ?? t.quiz.nextQuestion}
          </Button>
        </div>
      )}
    </div>
  )
}
