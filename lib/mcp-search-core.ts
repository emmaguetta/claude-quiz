import { createAdminClient } from '@/lib/supabase'
import { logAiUsage } from '@/lib/ai-usage'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

type RpcRow = {
  mcp_id: string; mcp_name: string; mcp_description: string | null; mcp_slug: string
  mcp_categories: string[]; mcp_tool_tags: string[] | null
  mcp_repo_url: string | null; mcp_source_url: string | null; mcp_icon_url: string | null
  mcp_verified: boolean; mcp_tools_count: number; mcp_quality_score: number
  mcp_github_stars: number; mcp_use_count: number
  mcp_pricing_type: string | null; mcp_pricing_note: string | null
  chunk_type: string; chunk_content: string; chunk_tool_name: string | null
  similarity: number
}

export type SearchInput = {
  query: string
  limit?: number
  categories?: string[]
  toolTags?: string[]
  userId: string | null
  endpoint: string
}

export type SearchResult = {
  slug: string
  name: string
  description: string | null
  categories: string[]
  toolTags: string[]
  toolsCount: number
  repoUrl: string | null
  sourceUrl: string | null
  githubStars: number
  useCount: number
  pricingType: string | null
  pricingNote: string | null
  verified: boolean
  qualityScore: number
  similarity: number
  matchingChunk: { type: string; toolName?: string }
}

async function getEmbedding(text: string, userId: string | null, endpoint: string): Promise<number[]> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`Embedding API error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (data.usage) {
    logAiUsage({
      endpoint,
      model: 'text-embedding-3-small',
      inputTokens: data.usage.total_tokens || 0,
      outputTokens: 0,
      userId,
      queryText: text,
    })
  }
  return data.data[0].embedding
}

export async function searchMcpsCore(input: SearchInput): Promise<{ results: SearchResult[]; total: number }> {
  const queryEmbedding = await getEmbedding(input.query.trim(), input.userId, input.endpoint)
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('search_mcps', {
    query_embedding: embeddingStr,
    match_threshold: 0.1,
    match_count: Math.min(input.limit ?? 30, 50),
    filter_categories: input.categories && input.categories.length > 0 ? input.categories : null,
    query_text: input.query.trim(),
    filter_tool_tags: input.toolTags && input.toolTags.length > 0 ? input.toolTags : null,
  })

  if (error) throw new Error(`Search RPC failed: ${error.message}`)

  const sorted = ((data || []) as RpcRow[]).sort((a, b) => b.similarity - a.similarity)
  const seen = new Set<string>()
  const results = sorted
    .filter(r => {
      if (seen.has(r.mcp_id)) return false
      seen.add(r.mcp_id)
      return true
    })
    .map(r => ({
      slug: r.mcp_slug,
      name: r.mcp_name,
      description: r.mcp_description,
      categories: r.mcp_categories,
      toolTags: r.mcp_tool_tags || [],
      toolsCount: r.mcp_tools_count,
      repoUrl: r.mcp_repo_url,
      sourceUrl: r.mcp_source_url,
      githubStars: r.mcp_github_stars,
      useCount: r.mcp_use_count,
      pricingType: r.mcp_pricing_type,
      pricingNote: r.mcp_pricing_note,
      verified: r.mcp_verified,
      qualityScore: r.mcp_quality_score,
      similarity: Math.round(r.similarity * 1000) / 1000,
      matchingChunk:
        r.chunk_type === 'tool' && r.chunk_tool_name
          ? { type: 'tool' as const, toolName: r.chunk_tool_name }
          : { type: r.chunk_type },
    }))

  return { results, total: results.length }
}

type McpDetailsRow = {
  id: string; name: string; slug: string; description: string | null
  categories: string[]; tool_tags: string[] | null
  source_url: string | null; repo_url: string | null; icon_url: string | null
  verified: boolean; tools_count: number; quality_score: number
  use_count: number; github_stars: number
  pricing_type: string | null; pricing_note: string | null
  smithery_id: string | null
}

type McpToolRow = {
  id: string; name: string; description: string | null
  input_schema: Record<string, unknown> | null
}

export type DetailsResult = {
  slug: string
  name: string
  description: string | null
  categories: string[]
  toolTags: string[]
  sourceUrl: string | null
  repoUrl: string | null
  iconUrl: string | null
  verified: boolean
  toolsCount: number
  qualityScore: number
  useCount: number
  githubStars: number
  pricingType: string | null
  pricingNote: string | null
  smitheryId: string | null
  tools: Array<{ name: string; description: string | null; inputSchema: Record<string, unknown> | null }>
}

export async function getMcpDetailsCore(slug: string): Promise<DetailsResult | null> {
  const supabase = createAdminClient()

  const { data: mcp, error: mcpErr } = await (supabase.from('mcps') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: boolean) => {
          maybeSingle: () => Promise<{ data: McpDetailsRow | null; error: { message: string } | null }>
        }
      }
    }
  })
    .select(
      'id, name, slug, description, categories, tool_tags, source_url, repo_url, icon_url, verified, tools_count, quality_score, use_count, github_stars, pricing_type, pricing_note, smithery_id'
    )
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (mcpErr) throw new Error(mcpErr.message)
  if (!mcp) return null

  const { data: tools } = await (supabase.from('mcp_tools') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string) => Promise<{ data: McpToolRow[] | null }>
      }
    }
  })
    .select('id, name, description, input_schema')
    .eq('mcp_id', mcp.id)
    .order('name')

  return {
    slug: mcp.slug,
    name: mcp.name,
    description: mcp.description,
    categories: mcp.categories,
    toolTags: mcp.tool_tags || [],
    sourceUrl: mcp.source_url,
    repoUrl: mcp.repo_url,
    iconUrl: mcp.icon_url,
    verified: mcp.verified,
    toolsCount: mcp.tools_count,
    qualityScore: mcp.quality_score,
    useCount: mcp.use_count,
    githubStars: mcp.github_stars,
    pricingType: mcp.pricing_type,
    pricingNote: mcp.pricing_note,
    smitheryId: mcp.smithery_id,
    tools: (tools || []).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.input_schema,
    })),
  }
}

// ─── Deep analysis (re-rank with GPT-4.1-nano per-MCP) ─────────────────

export const ANALYSIS_MONTHLY_LIMIT = 80

export type AnalysisItem = {
  name: string
  rank: number
  relevant: boolean
  explanation: string
}

export type AnalysisInput = {
  query: string
  results: Array<{
    name: string
    description: string | null
    toolsCount: number
    matchingChunk: { type: string; toolName?: string }
  }>
  locale?: 'fr' | 'en'
  userId: string
  endpoint: string
}

export type AnalysisOutput = {
  analysis: AnalysisItem[]
  used: number
  limit: number
}

export async function getAnalysisUsage(userId: string): Promise<{ used: number; limit: number; resetsAt: string }> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const admin = createAdminClient()

  const { count } = await admin
    .from('deep_analysis_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart)

  return {
    used: count ?? 0,
    limit: ANALYSIS_MONTHLY_LIMIT,
    resetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  }
}

export async function analyzeMcpsCore(input: AnalysisInput): Promise<AnalysisOutput> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
  if (!input.query || !input.results.length) throw new Error('query and results are required')

  const usage = await getAnalysisUsage(input.userId)
  if (usage.used >= ANALYSIS_MONTHLY_LIMIT) {
    const err = new Error('limit_reached') as Error & { used: number; limit: number; resetsAt: string }
    err.used = usage.used
    err.limit = usage.limit
    err.resetsAt = usage.resetsAt
    throw err
  }

  const lang = input.locale === 'fr' ? 'French' : 'English'
  const BATCH_SIZE = 10
  let totalInputTokens = 0
  let totalOutputTokens = 0

  async function evaluateOne(r: AnalysisInput['results'][number]): Promise<AnalysisItem> {
    const tool = r.matchingChunk.toolName
      ? `Best matching tool: ${r.matchingChunk.toolName}`
      : ''
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: `You evaluate whether an MCP (Model Context Protocol server) can DIRECTLY accomplish the user's search query. Reply ONLY with a JSON object: {"relevant": true/false, "explanation": "1-2 sentences"}. You MUST write the explanation in ${lang}.

STRICT RULES:
- If the query mentions a specific platform (e.g. LinkedIn, Slack, GitHub), the MCP MUST target that EXACT platform to be relevant. An MCP for Instagram or Notion is NOT relevant to a LinkedIn query, even if it has similar features like "comments".
- The MCP must directly perform the requested action on the requested platform. Having a similar feature on a different platform does NOT count.`,
          },
          {
            role: 'user',
            content: `Search query: "${input.query}"

MCP: ${r.name} (${r.toolsCount} tools)
Description: ${r.description || 'No description'}
${tool}

Is this MCP relevant to the search query?`,
          },
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      return { name: r.name, rank: 999, relevant: false, explanation: 'Analysis failed' }
    }

    const data = await res.json()
    if (data.usage) {
      totalInputTokens += data.usage.prompt_tokens || 0
      totalOutputTokens += data.usage.completion_tokens || 0
    }

    try {
      const content = data.choices?.[0]?.message?.content || '{}'
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        name: r.name,
        rank: 0,
        relevant: !!parsed.relevant,
        explanation: parsed.explanation || '',
      }
    } catch {
      return { name: r.name, rank: 999, relevant: false, explanation: 'Analysis failed' }
    }
  }

  const analysis: AnalysisItem[] = []
  for (let i = 0; i < input.results.length; i += BATCH_SIZE) {
    const batch = input.results.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(evaluateOne))
    analysis.push(...batchResults)
  }

  // Relevant first, irrelevant after — preserving original order as tiebreaker
  let rank = 1
  for (const item of analysis) if (item.relevant) item.rank = rank++
  for (const item of analysis) if (!item.relevant) item.rank = rank++

  logAiUsage({
    endpoint: input.endpoint,
    model: 'gpt-4.1-nano',
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    userId: input.userId,
  })

  const admin = createAdminClient()
  await admin.from('deep_analysis_usage').insert({
    user_id: input.userId,
    query: input.query,
  })

  return {
    analysis,
    used: usage.used + 1,
    limit: ANALYSIS_MONTHLY_LIMIT,
  }
}
