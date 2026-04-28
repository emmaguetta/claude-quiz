import { NextResponse } from 'next/server'
import { searchMcpsCore, getMcpDetailsCore } from '@/lib/mcp-search-core'
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
      'Search the claude-quiz database of 4,700+ MCP servers using natural language. Returns a ranked list of MCPs with their tools, repo, stars, and pricing. The first 3 calls are free per session; after that, the user must add an API key from ' +
      SETUP_URL +
      '.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          description:
            'Natural language description of what the user wants to do (e.g. "automate Gmail", "manage Google Calendar")',
        },
        limit: { type: 'number', minimum: 1, maximum: 25, description: 'Max results (default 10)' },
        categories: { type: 'array', items: { type: 'string' }, description: 'Filter by categories' },
        toolTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by brand/tool tags (e.g. ["github", "slack"])',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_mcp_details',
    description:
      'Fetch full details of a specific MCP by its slug — every tool with input schema, repo URL, install info. Use after search_mcps when the user wants to know more.',
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
    name: 'start_login',
    description:
      'Returns the URL where the user can sign up / log in and generate an API key to lift the free-tier limit.',
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
    return jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    })
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

  const limit = typeof args.limit === 'number' ? args.limit : undefined
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

  const lines: string[] = []
  if (auth.kind === 'free') {
    lines.push(`Free tier: ${auth.usesAfter}/${FREE_USES_LIMIT} calls used.`)
    if (auth.remainingFree === 0) {
      lines.push(`(next call requires an API key from ${SETUP_URL})`)
    }
    lines.push('')
  }
  lines.push(`${data.results.length} MCP(s) found for "${query}":`)
  lines.push('')
  lines.push(JSON.stringify(data.results, null, 2))
  return lines.join('\n')
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
3. Click "Generate API key" — copy the key shown ONCE.
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

function jsonRpcResult(id: unknown, result: unknown): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id, result },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
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
