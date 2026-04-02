'use client'

import { Button } from '@/components/ui/button'
import type { Question } from '@/lib/supabase'

type Props = {
  question: Question
  selectedIdx: number
  onNext: () => void
  sessionCount: number
}

export function AnswerFeedback({ question, selectedIdx, onNext, sessionCount }: Props) {
  const isCorrect = selectedIdx === question.correct_idx

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
            {isCorrect ? '✓ Correct !' : '✗ Incorrect'}
          </span>
          {!isCorrect && (
            <span className="text-base text-zinc-400">
              Bonne réponse :{' '}
              <span className="text-emerald-400 font-medium">
                {String.fromCharCode(65 + question.correct_idx)}. {question.options[question.correct_idx]}
              </span>
            </span>
          )}
        </div>
        <p className="text-base text-zinc-300 leading-relaxed mt-2">{question.explanation}</p>
        {question.source_url && (
          <a
            href={question.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            Voir dans la doc →
          </a>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{sessionCount} question{sessionCount > 1 ? 's' : ''} cette session</span>
        <Button onClick={onNext} className="bg-zinc-100 text-zinc-900 hover:bg-white">
          Question suivante →
        </Button>
      </div>
    </div>
  )
}
