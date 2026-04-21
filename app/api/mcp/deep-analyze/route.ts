import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase'
import { logAiUsage } from '@/lib/ai-usage'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MONTHLY_LIMIT = 80

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

    // Check monthly usage
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const admin = createAdminClient()

    const { count } = await admin
      .from('deep_analysis_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart)

    const used = count || 0
    if (used >= MONTHLY_LIMIT) {
      return NextResponse.json({
        error: 'limit_reached',
        used,
        limit: MONTHLY_LIMIT,
        resetsAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      }, { status: 429 })
    }

    // Parse request
    const { query, results, locale } = await request.json() as {
      query: string
      locale?: string
      results: Array<{
        name: string
        description: string | null
        toolsCount: number
        matchingChunk: { toolName: string | null; content: string }
        similarity: number
      }>
    }
    const lang = locale === 'fr' ? 'French' : 'English'

    if (!query || !results?.length) {
      return NextResponse.json({ error: 'Missing query or results' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    // Evaluate each MCP individually in parallel (batches of 10 to avoid rate limits)
    const BATCH_SIZE = 10
    let totalInputTokens = 0
    let totalOutputTokens = 0

    async function evaluateOne(r: typeof results[number]): Promise<AnalysisItem> {
      const tool = r.matchingChunk.toolName
        ? `Best matching tool: ${r.matchingChunk.toolName}`
        : ''
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
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
              content: `Search query: "${query}"

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
      const usage = data.usage
      if (usage) {
        totalInputTokens += usage.prompt_tokens || 0
        totalOutputTokens += usage.completion_tokens || 0
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

    type AnalysisItem = { name: string; rank: number; relevant: boolean; explanation: string }
    const analysis: AnalysisItem[] = []

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(evaluateOne))
      analysis.push(...batchResults)
    }

    // Assign ranks: relevant ones first, preserving original order as tiebreaker
    let rank = 1
    for (const item of analysis) {
      if (item.relevant) item.rank = rank++
    }
    for (const item of analysis) {
      if (!item.relevant) item.rank = rank++
    }

    // Log total usage
    logAiUsage({
      endpoint: '/api/mcp/deep-analyze',
      model: 'gpt-4.1-nano',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    })

    // Record usage for rate limiting
    await admin.from('deep_analysis_usage').insert({
      user_id: user.id,
      query,
    })

    return NextResponse.json({
      analysis,
      used: used + 1,
      limit: MONTHLY_LIMIT,
    })
  } catch (err) {
    console.error('Deep analyze error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET: check remaining credits
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ used: 0, limit: MONTHLY_LIMIT, loggedIn: false })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const admin = createAdminClient()

    const { count } = await admin
      .from('deep_analysis_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart)

    return NextResponse.json({
      used: count || 0,
      limit: MONTHLY_LIMIT,
      loggedIn: true,
    })
  } catch {
    return NextResponse.json({ used: 0, limit: MONTHLY_LIMIT, loggedIn: false })
  }
}
