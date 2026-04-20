import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all attempts with question info
  const { data: attempts, error } = await admin
    .from('quiz_attempts')
    .select('is_correct, question_id, questions!inner(difficulty, category)')
    .eq('user_id', user.id)

  if (error) {
    console.error('[stats] query failed:', error.message)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }

  if (!attempts || attempts.length === 0) {
    return NextResponse.json(null)
  }

  const total = attempts.length
  const correct = attempts.filter((a: any) => a.is_correct).length

  // By difficulty
  const byDifficulty: Record<string, { total: number; correct: number }> = {}
  // By category
  const byCategory: Record<string, { total: number; correct: number }> = {}

  for (const a of attempts as any[]) {
    const diff = a.questions.difficulty
    const cat = a.questions.category

    if (!byDifficulty[diff]) byDifficulty[diff] = { total: 0, correct: 0 }
    byDifficulty[diff].total++
    if (a.is_correct) byDifficulty[diff].correct++

    if (!byCategory[cat]) byCategory[cat] = { total: 0, correct: 0 }
    byCategory[cat].total++
    if (a.is_correct) byCategory[cat].correct++
  }

  // Format difficulties
  const difficulties = ['easy', 'medium', 'hard'].map(d => ({
    difficulty: d,
    total: byDifficulty[d]?.total ?? 0,
    correct: byDifficulty[d]?.correct ?? 0,
    pct: byDifficulty[d] ? Math.round(100 * byDifficulty[d].correct / byDifficulty[d].total) : null,
  }))

  // Best and worst categories (min 3 questions to count)
  const catEntries = Object.entries(byCategory)
    .filter(([, v]) => v.total >= 3)
    .map(([cat, v]) => ({ category: cat, pct: Math.round(100 * v.correct / v.total), total: v.total }))
    .sort((a, b) => b.pct - a.pct)

  const bestCategory = catEntries.length > 0 ? catEntries[0] : null
  const worstCategory = catEntries.length > 1 ? catEntries[catEntries.length - 1] : null

  return NextResponse.json({
    total,
    correct,
    pct: Math.round(100 * correct / total),
    difficulties,
    bestCategory,
    worstCategory,
  })
}
