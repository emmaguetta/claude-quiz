import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import {
  searchMcpsCore,
  getMcpDetailsCore,
  analyzeMcpsCore,
  ANALYSIS_MONTHLY_LIMIT,
  type SearchResult,
} from '@/lib/mcp-search-core'
import {
  authenticateMcpHttp,
  type AuthResult,
  FREE_USES_LIMIT,
} from '@/lib/mcp-http-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const SETUP_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'}/mcp-setup`

const SERVER_INFO = { name: 'claude-quiz-mcp-search', version: '0.2.0' }
const PROTOCOL_VERSION = '2024-11-05'

const TOOLS = [
  {
    name: 'search_mcps',
    description:
      'Search the claude-quiz database of 4,700+ MCP servers using natural language. ' +
      'IMPORTANT: pass the user\'s query VERBATIM in their own words. Do not rephrase, summarize, or split into multiple searches. ' +
      'The semantic search handles natural language well, including vague or multi-intent queries. ' +
      'Returns 30 raw vector-search results, ranked by hybrid similarity (cosine + keyword). ' +
      'If the user thinks the ranking is off, follow up with `analyze_mcps` (uses 1 monthly AI credit, requires API key) to AI-rerank and filter false positives. ' +
      'The first 3 calls are free per session; beyond that, the user must add an API key from ' +
      SETUP_URL +
      '.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          description:
            'The user\'s exact natural-language query, passed verbatim. Do not rephrase.',
        },
        limit: { type: 'number', minimum: 1, maximum: 50, description: 'Max results (default 30)' },
        categories: { type: 'array', items: { type: 'string' }, description: 'Optional: filter by categories' },
        toolTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: filter by brand/tool tags (e.g. ["github", "slack"])',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_mcp_details',
    description:
      'Fetch full details of a specific MCP by its slug: every tool with input schema, repo URL, install info. Use after search_mcps when the user wants to drill into a specific result.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          minLength: 1,
          description: 'MCP slug from search_mcps (e.g. "gmail-mcp")',
        },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'analyze_mcps',
    description:
      'AI-rerank a previous `search_mcps` result. For each MCP, GPT-4.1-nano evaluates whether it can DIRECTLY accomplish the query (strict platform matching: a Slack MCP is not relevant to a Discord query). Returns a re-ordered list with relevant MCPs first, plus a 1-2 sentence explanation per item. ' +
      'Use this when the user complains the raw ranking has false positives or is too noisy. ' +
      'Requires an API key (free tier cannot use this). Consumes 1 of ' +
      ANALYSIS_MONTHLY_LIMIT +
      ' monthly credits per call.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          description: 'The same query that was passed to search_mcps.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 30,
          description: 'How many top results to analyze (default 15). Each one costs ~1 GPT call.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'start_login',
    description:
      'Returns the URL where the user can sign up / log in and generate an API key to lift the free-tier limit and unlock analyze_mcps.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = rateLimit(`mcp-http:${ip}`, { maxRequests: 30, windowMs: 60_000 })
  if (!allowed) {
    return jsonRpcError(null, -32000, 'Too many requests')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  if (!isJsonRpcRequest(body)) {
    return jsonRpcError(null, -32600, 'Invalid Request')
  }

  const { id, method, params } = body

  // Notifications (no response expected)
  if (method.startsWith('notifications/')) {
    return new NextResponse(null, { status: 202 })
  }

  if (method === 'initialize') {
    // Per MCP Streamable HTTP spec: server MAY assign Mcp-Session-Id at initialize.
    // If we issue one, the client MUST echo it back on subsequent requests.
    // Reuse an existing session id if the client already has one (rare but spec-compliant).
    const existing = request.headers.get('mcp-session-id')
    const sessionId = existing && existing.length > 0 ? existing : randomUUID()
    return jsonRpcResult(
      id,
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
      { 'Mcp-Session-Id': sessionId }
    )
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    return handleToolCall(request, id, params)
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`)
}

// CORS preflight + Allow header
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
      'Access-Control-Max-Age': '86400',
    },
  })
}

async function handleToolCall(request: Request, id: unknown, params: unknown) {
  const callParams = params as { name?: string; arguments?: Record<string, unknown> } | undefined
  const name = callParams?.name
  const args = callParams?.arguments ?? {}

  if (!name) {
    return jsonRpcResult(id, toolError('Missing tool name'))
  }

  const auth = await authenticateMcpHttp(request, /* consumeFreeUse */ true)

  try {
    let text: string
    switch (name) {
      case 'search_mcps':
        text = await runSearch(args, auth)
        break
      case 'get_mcp_details':
        text = await runDetails(args, auth)
        break
      case 'analyze_mcps':
        text = await runAnalyze(args, auth)
        break
      case 'start_login':
        text = runStartLogin(auth)
        break
      default:
        return jsonRpcResult(id, toolError(`Unknown tool: ${name}`))
    }
    return jsonRpcResult(id, { content: [{ type: 'text', text }] })
  } catch (err) {
    return jsonRpcResult(id, toolError(err instanceof Error ? err.message : String(err)))
  }
}

function authGuard(auth: AuthResult, toolName: string): string | null {
  if (auth.kind === 'authenticated' || auth.kind === 'free') return null
  if (auth.kind === 'free_exhausted') {
    return `Free tier exhausted (${FREE_USES_LIMIT} calls used). Get an API key at ${SETUP_URL} and add it to your MCP client config under "Authorization: Bearer <your-key>".`
  }
  if (auth.kind === 'invalid_session') {
    return `Invalid session. Reconnect via ${SETUP_URL}.`
  }
  return `This MCP requires either an API key or a session. Get an API key at ${SETUP_URL}, or use a client (Claude Code, Cursor) that sends Mcp-Session-Id automatically. Tool: ${toolName}`
}

async function runSearch(
  args: Record<string, unknown>,
  auth: AuthResult
): Promise<string> {
  const guard = authGuard(auth, 'search_mcps')
  if (guard) return guard

  const query = typeof args.query === 'string' ? args.query : ''
  if (query.length < 2) return 'Error: query must be at least 2 characters.'

  const limit = typeof args.limit === 'number' ? args.limit : 30
  const categories = Array.isArray(args.categories)
    ? (args.categories.filter(c => typeof c === 'string') as string[])
    : undefined
  const toolTags = Array.isArray(args.toolTags)
    ? (args.toolTags.filter(t => typeof t === 'string') as string[])
    : undefined

  const userId = auth.kind === 'authenticated' ? auth.userId : null
  const data = await searchMcpsCore({
    query,
    limit,
    categories,
    toolTags,
    userId,
    endpoint: '/api/mcp',
  })

  return formatSearchResults({ query, results: data.results, auth })
}

async function runAnalyze(
  args: Record<string, unknown>,
  auth: AuthResult
): Promise<string> {
  if (auth.kind !== 'authenticated') {
    return `analyze_mcps requires an API key (free tier doesn\'t include AI analysis). Generate one at ${SETUP_URL}.`
  }

  const query = typeof args.query === 'string' ? args.query : ''
  if (query.length < 2) return 'Error: query must be at least 2 characters.'

  const limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 30) : 15

  // Re-run the underlying search to get the candidate set, then analyze.
  const search = await searchMcpsCore({
    query,
    limit,
    userId: auth.userId,
    endpoint: '/api/mcp',
  })

  if (search.results.length === 0) {
    return `No MCPs found for "${query}". Nothing to analyze.`
  }

  try {
    const out = await analyzeMcpsCore({
      query,
      results: search.results.map(r => ({
        name: r.name,
        description: r.description,
        toolsCount: r.toolsCount,
        matchingChunk: r.matchingChunk,
      })),
      userId: auth.userId,
      endpoint: '/api/mcp/analyze',
    })

    // Merge analysis with search metadata to format a final ranked list.
    const bySlug = new Map<string, SearchResult>(search.results.map(r => [r.name, r]))
    const ranked = [...out.analysis].sort((a, b) => a.rank - b.rank)

    const lines: string[] = []
    lines.push(`# AI re-rank for "${query}"`)
    lines.push('')
    lines.push(`Used **${out.used}/${out.limit}** monthly analyses. ${ranked.filter(r => r.relevant).length} of ${ranked.length} MCPs marked relevant.`)
    lines.push('')

    const relevant = ranked.filter(r => r.relevant)
    const irrelevant = ranked.filter(r => !r.relevant)

    if (relevant.length > 0) {
      lines.push('## ✓ Relevant')
      lines.push('')
      for (const item of relevant) {
        const r = bySlug.get(item.name)
        if (!r) continue
        lines.push(formatMcpEntry(item.rank, r, item.explanation))
        lines.push('')
      }
    }

    if (irrelevant.length > 0) {
      lines.push('## ✗ Not relevant (filtered)')
      lines.push('')
      for (const item of irrelevant) {
        const r = bySlug.get(item.name)
        if (!r) continue
        lines.push(`- **${r.name}** \`${r.slug}\` : ${item.explanation}`)
      }
    }

    return lines.join('\n').trim()
  } catch (err) {
    if (err instanceof Error && err.message === 'limit_reached') {
      const e = err as Error & { limit?: number; resetsAt?: string }
      return `Monthly analysis limit reached (${e.limit ?? ANALYSIS_MONTHLY_LIMIT}). Resets on ${e.resetsAt ?? 'the 1st of next month'}.`
    }
    throw err
  }
}

// ─── Formatting helpers ────────────────────────────────────────────────

function formatSearchResults(params: {
  query: string
  results: SearchResult[]
  auth: AuthResult
}): string {
  const { query, results, auth } = params
  const lines: string[] = []

  // Header
  lines.push(`# ${results.length} MCP${results.length === 1 ? '' : 's'} found for "${query}"`)
  lines.push('')

  if (auth.kind === 'free') {
    lines.push(`> **Free tier:** ${auth.usesAfter}/${FREE_USES_LIMIT} calls used. ${
      auth.remainingFree === 0
        ? `Next call requires an API key from ${SETUP_URL}.`
        : `${auth.remainingFree} free call${auth.remainingFree === 1 ? '' : 's'} remaining.`
    }`)
    lines.push('')
  }

  if (auth.kind === 'authenticated') {
    lines.push('> Tip: if the ranking has too many false positives, call `analyze_mcps` with the same query to AI-rerank (uses 1 monthly credit).')
    lines.push('')
  }

  if (results.length === 0) {
    lines.push('No matches. Try a more specific query, or different keywords.')
    return lines.join('\n')
  }

  for (let i = 0; i < results.length; i++) {
    lines.push(formatMcpEntry(i + 1, results[i]))
    lines.push('')
  }

  lines.push('---')
  lines.push('Use `get_mcp_details(slug)` to see every tool of a specific MCP.')
  return lines.join('\n').trim()
}

function formatMcpEntry(rank: number, r: SearchResult, explanation?: string): string {
  const meta: string[] = []
  if (r.githubStars > 0) meta.push(`⭐ ${formatCount(r.githubStars)}`)
  if (r.useCount > 0) meta.push(`👤 ${formatCount(r.useCount)}`)
  if (r.toolsCount > 0) meta.push(`🛠️ ${r.toolsCount} tool${r.toolsCount === 1 ? '' : 's'}`)
  if (r.pricingType) meta.push(r.pricingType)
  if (r.verified) meta.push('✓ verified')

  const desc = (r.description ?? '').trim().replace(/\s+/g, ' ')
  const truncatedDesc = desc.length > 220 ? desc.slice(0, 217) + '…' : desc

  const matched =
    r.matchingChunk.type === 'tool' && r.matchingChunk.toolName
      ? `matched on \`${r.matchingChunk.toolName}\``
      : 'matched globally'

  const lines: string[] = []
  lines.push(`### ${rank}. ${r.name}`)
  if (meta.length > 0) lines.push(meta.join(' · '))
  if (truncatedDesc) lines.push(truncatedDesc)
  if (explanation) lines.push(`_${explanation}_`)

  const refs: string[] = [`slug: \`${r.slug}\``, matched]
  if (r.repoUrl) refs.push(`[repo](${r.repoUrl})`)
  else if (r.sourceUrl) refs.push(`[site](${r.sourceUrl})`)
  lines.push(refs.join(' · '))

  return lines.join('\n')
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

async function runDetails(
  args: Record<string, unknown>,
  auth: AuthResult
): Promise<string> {
  const guard = authGuard(auth, 'get_mcp_details')
  if (guard) return guard

  const slug = typeof args.slug === 'string' ? args.slug : ''
  if (!slug) return 'Error: slug is required.'

  const data = await getMcpDetailsCore(slug)
  if (!data) return `MCP "${slug}" not found. Use search_mcps to find the right slug.`
  return JSON.stringify(data, null, 2)
}

function runStartLogin(auth: AuthResult): string {
  if (auth.kind === 'authenticated') {
    return `You are already authenticated. No further action needed.`
  }
  return `To lift the free-tier limit and unlock unlimited searches:

1. Open ${SETUP_URL} in your browser.
2. Sign up or log in (GitHub, Google, or email).
3. Click "Generate API key", then copy the key shown ONCE.
4. Add it to your MCP client config under "headers": { "Authorization": "Bearer <your-key>" }.
5. Restart your MCP client.

The key is shown once and never displayed again. If you lose it, generate a new one.`
}

// ─── JSON-RPC helpers ───────────────────────────────────────────────────

function isJsonRpcRequest(body: unknown): body is { jsonrpc: '2.0'; id: unknown; method: string; params?: unknown } {
  if (!body || typeof body !== 'object') return false
  const r = body as Record<string, unknown>
  return r.jsonrpc === '2.0' && typeof r.method === 'string'
}

function jsonRpcResult(id: unknown, result: unknown, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id, result },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id',
        ...(extraHeaders ?? {}),
      },
    }
  )
}

function jsonRpcError(id: unknown, code: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  )
}

function toolError(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] }
}
