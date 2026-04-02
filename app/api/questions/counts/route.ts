import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('questions')
    .select('category, difficulty')
    .eq('active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const categories: Record<string, number> = {}
  const difficulties: Record<string, number> = {}

  for (const q of (data ?? []) as { category: string; difficulty: string }[]) {
    categories[q.category] = (categories[q.category] ?? 0) + 1
    difficulties[q.difficulty] = (difficulties[q.difficulty] ?? 0) + 1
  }

  return NextResponse.json({ categories, difficulties })
}
