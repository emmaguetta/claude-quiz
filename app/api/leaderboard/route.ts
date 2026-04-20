import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const VALID_DIFFICULTIES = ['all', 'easy', 'medium', 'hard']
const MIN_ATTEMPTS = 10
const MAX_RESULTS = 50

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed } = rateLimit(`leaderboard:${getClientIp(request)}`, { maxRequests: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

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

  // For the "all" tab, also fetch per-difficulty breakdown for each user
  let difficultyBreakdown: Record<string, string[]> = {}
  if (difficulty === 'all' && data && data.length > 0) {
    const userIds = data.map((r: any) => r.user_id)
    const { data: breakdown } = await supabase
      .from('leaderboard_stats')
      .select('user_id, difficulty, total_attempts')
      .in('user_id', userIds)
      .gte('total_attempts', 1)

    if (breakdown) {
      for (const row of breakdown as any[]) {
        if (!difficultyBreakdown[row.user_id]) difficultyBreakdown[row.user_id] = []
        difficultyBreakdown[row.user_id].push(row.difficulty)
      }
    }
  }

  const entries = (data ?? []).map((row: any, i: number) => ({
    rank: i + 1,
    user_id: row.user_id,
    display_name: row.display_name || row.first_name || 'Anonyme',
    total_attempts: row.total_attempts,
    correct_attempts: row.correct_attempts,
    accuracy_pct: Number(row.accuracy_pct),
    unique_questions: row.unique_questions,
    difficulties: difficultyBreakdown[row.user_id] ?? [],
  }))

  return NextResponse.json(entries, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  })
}
