'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Question } from '@/lib/supabase'

const CATEGORY_LABELS: Record<Question['category'], string> = {
  commands: 'Commande',
  shortcuts: 'Raccourci',
  concepts: 'Concept',
  mcp: 'MCP',
  workflow: 'Workflow',
}

const DIFFICULTY_LABELS: Record<Question['difficulty'], string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

const DIFFICULTY_COLORS: Record<Question['difficulty'], string> = {
  easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

type Props = {
  question: Question
  selectedIdx: number | null
  onSelect: (idx: number) => void
}

export function QuizCard({ question, selectedIdx, onSelect }: Props) {
  const answered = selectedIdx !== null

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm text-zinc-400 border-zinc-700 px-3 py-1">
            {CATEGORY_LABELS[question.category as Question['category']] ?? question.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-sm border px-3 py-1 ${DIFFICULTY_COLORS[question.difficulty as Question['difficulty']] ?? ''}`}
          >
            {DIFFICULTY_LABELS[question.difficulty as Question['difficulty']] ?? question.difficulty}
          </Badge>
        </div>
        <CardTitle className="text-xl font-medium text-zinc-100 leading-relaxed">
          {question.question}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedIdx === idx
          const isCorrect = answered && idx === question.correct_idx
          const isWrong = answered && isSelected && idx !== question.correct_idx

          let optionClass =
            'w-full text-left px-5 py-4 rounded-lg border text-base transition-all duration-200 flex items-center gap-3 '

          if (!answered) {
            optionClass += 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 cursor-pointer'
          } else if (isCorrect) {
            optionClass += 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 cursor-default'
          } else if (isWrong) {
            optionClass += 'border-red-500/50 bg-red-500/10 text-red-300 cursor-default'
          } else {
            optionClass += 'border-zinc-800 bg-zinc-900/30 text-zinc-500 cursor-default'
          }

          return (
            <button
              key={idx}
              className={optionClass}
              onClick={() => !answered && onSelect(idx)}
              disabled={answered}
            >
              <span className="shrink-0 w-7 h-7 rounded-md border border-current flex items-center justify-center text-sm font-mono font-bold">
                {OPTION_LABELS[idx]}
              </span>
              <span>{option}</span>
              {isCorrect && <span className="ml-auto text-emerald-400">✓</span>}
              {isWrong && <span className="ml-auto text-red-400">✗</span>}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
