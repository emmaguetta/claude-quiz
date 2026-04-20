import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { logAiUsage } from '@/lib/ai-usage'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  // Log embedding usage
  const usage = data.usage
  if (usage) {
    logAiUsage({ endpoint: '/api/mcp/search', model: 'text-embedding-3-small', inputTokens: usage.total_tokens || 0, outputTokens: 0 })
  }
  return data.data[0].embedding
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, categories, toolTags, limit = 30 } = body as {
      query: string
      categories?: string[]
      toolTags?: string[]
      limit?: number
    }

    // Auth check
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 20 searches per minute per IP
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`mcp-search:${ip}`, { maxRequests: 10, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Search not configured' }, { status: 500 })
    }

    // Generate embedding for the query
    const queryEmbedding = await getEmbedding(query.trim())
    const embeddingStr = `[${queryEmbedding.join(',')}]`

    // Call the RPC function
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('search_mcps', {
      query_embedding: embeddingStr,
      match_threshold: 0.1,
      match_count: Math.min(limit, 50),
      filter_categories: categories && categories.length > 0 ? categories : null,
      query_text: query.trim(),
      filter_tool_tags: toolTags && toolTags.length > 0 ? toolTags : null,
    })

    if (error) {
      console.error('Search RPC error:', JSON.stringify(error))
      return NextResponse.json({
        error: 'Search failed',
        detail: error.message,
        code: error.code,
        hint: (error as unknown as { hint?: string }).hint,
      }, { status: 500 })
    }

    // Sort by similarity descending
    const sorted = (data || []).sort(
      (a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity
    )

    const results = sorted.map((r: {
      mcp_id: string
      mcp_name: string
      mcp_description: string | null
      mcp_slug: string
      mcp_categories: string[]
      mcp_tool_tags: string[] | null
      mcp_source_url: string | null
      mcp_repo_url: string | null
      mcp_icon_url: string | null
      mcp_verified: boolean
      mcp_tools_count: number
      mcp_quality_score: number
      mcp_github_stars: number
      mcp_use_count: number
      mcp_pricing_type: string | null
      mcp_pricing_note: string | null
      chunk_type: string
      chunk_content: string
      chunk_tool_name: string | null
      similarity: number
    }) => ({
      id: r.mcp_id,
      name: r.mcp_name,
      description: r.mcp_description,
      slug: r.mcp_slug,
      categories: r.mcp_categories,
      toolTags: r.mcp_tool_tags || [],
      sourceUrl: r.mcp_source_url,
      repoUrl: r.mcp_repo_url,
      iconUrl: r.mcp_icon_url,
      verified: r.mcp_verified,
      toolsCount: r.mcp_tools_count,
      qualityScore: r.mcp_quality_score,
      githubStars: r.mcp_github_stars,
      useCount: r.mcp_use_count,
      pricingType: r.mcp_pricing_type,
      pricingNote: r.mcp_pricing_note,
      matchingChunk: {
        type: r.chunk_type,
        content: r.chunk_content,
        toolName: r.chunk_tool_name,
      },
      similarity: r.similarity,
      tier: r.similarity > 0.4 ? 'high' : r.similarity > 0.25 ? 'medium' : 'low',
    }))

    return NextResponse.json({ results, total: results.length })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Internal error', detail: String(err) }, { status: 500 })
  }
}
