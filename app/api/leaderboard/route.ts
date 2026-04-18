import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const VALID_DIFFICULTIES = ['all', 'easy', 'medium', 'hard']
const MIN_ATTEMPTS = 10
const MAX_RESULTS = 50

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const difficulty = searchParams.get('difficulty') ?? 'all'

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const view = difficulty === 'all' ? 'leaderboard_all' : 'leaderboard_stats'

  let query = supabase
    .from(view)
    .select('user_id, display_name, first_name, difficulty, total_attempts, correct_attempts, accuracy_pct, unique_questions, last_played_at')
    .gte('total_attempts', MIN_ATTEMPTS)
    .order('accuracy_pct', { ascending: false })
    .order('total_attempts', { ascending: false })
    .limit(MAX_RESULTS)

  if (difficulty !== 'all') {
    query = query.eq('difficulty', difficulty)
  }

  const { data, error } = await query

  if (error) {
    console.error('[leaderboard] query failed:', error.message)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }

  const entries = (data ?? []).map((row: any, i: number) => ({
    rank: i + 1,
    user_id: row.user_id,
    display_name: row.display_name || row.first_name || 'Anonyme',
    total_attempts: row.total_attempts,
    correct_attempts: row.correct_attempts,
    accuracy_pct: Number(row.accuracy_pct),
    unique_questions: row.unique_questions,
  }))

  return NextResponse.json(entries, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  })
}
