import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  analyzeMcpsCore,
  getAnalysisUsage,
  ANALYSIS_MONTHLY_LIMIT,
} from '@/lib/mcp-search-core'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 })
    }

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

    if (!query || !results?.length) {
      return NextResponse.json({ error: 'Missing query or results' }, { status: 400 })
    }

    try {
      const out = await analyzeMcpsCore({
        query,
        results: results.map(r => ({
          name: r.name,
          description: r.description,
          toolsCount: r.toolsCount,
          matchingChunk: {
            type: r.matchingChunk.toolName ? 'tool' : 'global',
            toolName: r.matchingChunk.toolName ?? undefined,
          },
        })),
        locale: locale === 'fr' ? 'fr' : 'en',
        userId: user.id,
        endpoint: '/api/mcp/deep-analyze',
      })

      return NextResponse.json(out)
    } catch (err) {
      if (err instanceof Error && err.message === 'limit_reached') {
        const e = err as Error & { used?: number; limit?: number; resetsAt?: string }
        return NextResponse.json({
          error: 'limit_reached',
          used: e.used,
          limit: e.limit ?? ANALYSIS_MONTHLY_LIMIT,
          resetsAt: e.resetsAt,
        }, { status: 429 })
      }
      throw err
    }
  } catch (err) {
    console.error('Deep analyze error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ used: 0, limit: ANALYSIS_MONTHLY_LIMIT, loggedIn: false })
    }

    const { used, limit } = await getAnalysisUsage(user.id)
    return NextResponse.json({ used, limit, loggedIn: true })
  } catch {
    return NextResponse.json({ used: 0, limit: ANALYSIS_MONTHLY_LIMIT, loggedIn: false })
  }
}
