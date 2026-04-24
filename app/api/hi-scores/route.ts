import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const PER_DIFFICULTY = 5

type Row = {
  session_id: string
  correct: number
  total: number
  finished_at: string
  categories: string[]
  difficulties: string[]
}

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`hi-scores:${getClientIp(request)}`, { maxRequests: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = createAdminClient()

  const queries = DIFFICULTIES.map(d =>
    supabase
      .from('user_hi_scores')
      .select('session_id, correct, total, finished_at, categories, difficulties')
      .eq('user_id', user.id)
      .contains('difficulties', [d])
      .order('correct', { ascending: false })
      .order('finished_at', { ascending: false })
      .limit(PER_DIFFICULTY)
  )

  const results = await Promise.all(queries)
  const firstError = results.find(r => r.error)
  if (firstError?.error) {
    console.error('[hi-scores] query failed:', firstError.error.message)
    return NextResponse.json({ error: 'Failed to load hi-scores' }, { status: 500 })
  }

  // Merge and dedupe by session_id (a mixed session may appear in multiple tabs).
  const seen = new Set<string>()
  const merged: Row[] = []
  for (const res of results) {
    for (const row of (res.data ?? []) as Row[]) {
      if (seen.has(row.session_id)) continue
      seen.add(row.session_id)
      merged.push(row)
    }
  }

  // Sort overall so the client, which filters by tab, sees each tab in correct order.
  merged.sort((a, b) => {
    if (b.correct !== a.correct) return b.correct - a.correct
    return b.finished_at.localeCompare(a.finished_at)
  })

  return NextResponse.json(merged)
}
