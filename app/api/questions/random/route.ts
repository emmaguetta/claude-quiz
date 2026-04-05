import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Question } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exclude = searchParams.get('exclude')?.split(',').filter(Boolean) ?? []
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) ?? []
  const difficulties = searchParams.get('difficulties')?.split(',').filter(Boolean) ?? []
  const developer = searchParams.get('developer') // 'only' | 'exclude' | null
  const lang = searchParams.get('lang') || 'fr'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from('questions').select('*').eq('active', true).eq('lang', lang)
  if (categories.length > 0) query = query.in('category', categories)
  if (difficulties.length > 0) query = query.in('difficulty', difficulties)
  if (developer === 'only') query = query.eq('developer', true)
  else if (developer === 'exclude') query = query.eq('developer', false)

  const { data, error } = await query as { data: Question[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'No questions found' }, { status: 404 })

  let pool = exclude.length > 0 ? data.filter(q => !exclude.includes(q.id)) : data
  const _resetSeen = pool.length === 0
  if (_resetSeen) pool = data

  const random = pool[Math.floor(Math.random() * pool.length)]
  return NextResponse.json({ ...random, _resetSeen })
}
