import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generateQuestionsFromDocs } from '@/lib/generate'
import { pingIndexNow } from '@/lib/indexnow'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const count = Math.min(Number(body.count) || 10, 100)

  const admin = createAdminClient()

  // Récupère les questions existantes pour éviter les doublons
  const { data: existing } = await admin
    .from('questions')
    .select('question')
    .eq('active', true)
  const existingQuestions = (existing ?? []).map((q: { question: string }) => q.question)

  const questions = await generateQuestionsFromDocs(count, existingQuestions)
  const { data, error } = await admin
    .from('questions')
    .insert(questions)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const inserted = data?.length ?? 0
  let indexnow: Awaited<ReturnType<typeof pingIndexNow>> | null = null
  if (inserted > 0) {
    indexnow = await pingIndexNow([
      'https://claudequiz.app/',
      'https://claudequiz.app/faq',
    ])
  }

  return NextResponse.json({ inserted, indexnow })
}
