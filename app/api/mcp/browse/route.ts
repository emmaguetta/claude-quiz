import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logMcpEvent } from '@/lib/mcp-tracking'
import { getAuthUser } from '@/lib/api-auth'

/**
 * Browse MCPs — no semantic search, just filter + sort by quality.
 * Supports two combinable filter axes:
 *   ?category=X  → primary use-case category (one value)
 *   ?tool=X      → tool-brand tag (one value)
 */
type SortKey = 'quality' | 'popular' | 'alphabetical'

const SORT_CONFIG: Record<SortKey, { column: string; ascending: boolean; nullsFirst?: boolean }> = {
  quality: { column: 'quality_score', ascending: false },
  popular: { column: 'use_count', ascending: false },
  alphabetical: { column: 'name', ascending: true },
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const tool = url.searchParams.get('tool')
  const sortParam = url.searchParams.get('sort') as SortKey | null
  const sort: SortKey = sortParam && sortParam in SORT_CONFIG ? sortParam : 'quality'
  const limit = Math.min(Number(url.searchParams.get('limit') || 30), 50)
  const offset = Number(url.searchParams.get('offset') || 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('mcps') as any)
    .select(
      'id, name, slug, description, categories, tool_tags, source_url, repo_url, icon_url, verified, tools_count, quality_score, use_count, github_stars, pricing_type, pricing_note',
      { count: 'exact' }
    )
    .eq('active', true)

  if (category) {
    query = query.contains('categories', [category])
  }
  if (tool) {
    query = query.contains('tool_tags', [tool])
  }

  const sortCfg = SORT_CONFIG[sort]
  const { data, error, count } = await query
    .order(sortCfg.column, { ascending: sortCfg.ascending, nullsFirst: sortCfg.nullsFirst })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Track interaction only when the user actively filters or changes sort —
  // skip the default landing load (no filter + quality sort) to avoid noise.
  if (category || tool || sort !== 'quality') {
    const user = await getAuthUser()
    logMcpEvent({
      eventType: 'browse',
      userId: user?.id,
      payload: {
        category,
        tool,
        sort,
        results_count: count ?? (data?.length ?? 0),
      },
    })
  }

  const results = (data || []).map((r: {
    id: string; name: string; slug: string; description: string | null
    categories: string[]; tool_tags: string[] | null
    source_url: string | null; repo_url: string | null; icon_url: string | null
    verified: boolean; tools_count: number; quality_score: number; use_count: number
    github_stars: number; pricing_type: string | null; pricing_note: string | null
  }) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    categories: r.categories,
    toolTags: r.tool_tags || [],
    sourceUrl: r.source_url,
    repoUrl: r.repo_url,
    iconUrl: r.icon_url,
    verified: r.verified,
    toolsCount: r.tools_count,
    qualityScore: r.quality_score,
    useCount: r.use_count,
    githubStars: r.github_stars,
    pricingType: r.pricing_type,
    pricingNote: r.pricing_note,
    tier: r.quality_score > 0.5 ? 'high' : r.quality_score > 0.3 ? 'medium' : 'low',
  }))

  return NextResponse.json({ results, total: count ?? results.length })
}
