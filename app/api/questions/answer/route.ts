import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed } = rateLimit(`answer:${getClientIp(request)}`, { maxRequests: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json()
  const { question_id, selected_idx, shuffle_map } = body as {
    question_id: string
    selected_idx: number
    shuffle_map: number[]
  }

  if (
    !question_id ||
    typeof selected_idx !== 'number' ||
    selected_idx < 0 || selected_idx > 3 ||
    !Array.isArray(shuffle_map) ||
    shuffle_map.length !== 4 ||
    !shuffle_map.every((v: number, i: number, a: number[]) => v >= 0 && v <= 3 && a.indexOf(v) === i)
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('questions')
    .select('correct_idx, explanation, learn_more, source_url')
    .eq('id', question_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const q = data as { correct_idx: number; explanation: string; learn_more: string | null; source_url: string | null }
  const shuffledCorrectIdx = shuffle_map.indexOf(q.correct_idx)

  return NextResponse.json({
    correct_idx: shuffledCorrectIdx,
    is_correct: selected_idx === shuffledCorrectIdx,
    explanation: q.explanation,
    learn_more: q.learn_more,
    source_url: q.source_url,
  })
}
