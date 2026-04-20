import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json() as { ids: string[] }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json([])
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('mcps')
    .select('id, name, slug, description, categories, source_url, repo_url, icon_url, verified, tools_count, quality_score, github_stars')
    .in('id', ids)
    .eq('active', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to load MCPs' }, { status: 500 })
  }

  const results = (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    slug: m.slug,
    categories: m.categories ?? [],
    sourceUrl: m.source_url,
    repoUrl: m.repo_url,
    iconUrl: m.icon_url,
    verified: m.verified,
    toolsCount: m.tools_count ?? 0,
    qualityScore: m.quality_score ?? 0,
    githubStars: m.github_stars ?? 0,
    matchingChunk: { type: 'mcp', content: m.description ?? '', toolName: null },
    similarity: 1,
    tier: 'high' as const,
  }))

  return NextResponse.json(results)
}
