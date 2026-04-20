import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'fr'

  const { data, error } = await supabase
    .from('questions')
    .select('category, difficulty, developer')
    .eq('active', true)
    .eq('lang', lang)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const categories: Record<string, number> = {}
  const difficulties: Record<string, number> = {}
  let developerCount = 0

  for (const q of (data ?? []) as { category: string; difficulty: string; developer: boolean }[]) {
    categories[q.category] = (categories[q.category] ?? 0) + 1
    difficulties[q.difficulty] = (difficulties[q.difficulty] ?? 0) + 1
    if (q.developer) developerCount++
  }

  return NextResponse.json({ categories, difficulties, developerCount })
}
