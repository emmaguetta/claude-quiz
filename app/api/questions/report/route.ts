import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { question_id, reason } = await request.json()

  if (!question_id) {
    return NextResponse.json({ error: 'question_id requis' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').upsert(
    { question_id, user_id: user.id, reason: reason || 'wrong_answer' },
    { onConflict: 'question_id,user_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
