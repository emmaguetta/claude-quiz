import { NextResponse } from 'next/server'
import { logAiUsage } from '@/lib/ai-usage'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: Request) {
  try {
    // Auth + rate limit
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`mcp-explain:${ip}`, { maxRequests: 5, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { query, mcpName, mcpDescription, tools } = await request.json() as {
      query: string
      mcpName: string
      mcpDescription: string | null
      tools: Array<{ name: string; description: string | null }>
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const toolList = tools
      .slice(0, 30)
      .map(t => `- ${t.name}${t.description ? ': ' + t.description : ''}`)
      .join('\n')

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
            content: `You explain what an MCP server can do for a user, based on their search query. Be concise (3-4 sentences max). Write in the same language as the user's query. Focus on concrete actions the user can accomplish. Don't repeat the MCP name.`,
          },
          {
            role: 'user',
            content: `Search query: "${query}"

MCP: ${mcpName}
Description: ${mcpDescription || 'No description'}

Tools available:
${toolList || 'No tools documented'}

Explain what this MCP lets the user do in relation to their search.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'AI error' }, { status: 500 })
    }

    const data = await res.json()
    const explanation = data.choices?.[0]?.message?.content || ''

    // Log usage
    const usage = data.usage
    if (usage) {
      logAiUsage({ endpoint: '/api/mcp/explain', model: 'gpt-4.1-nano', inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0, userId: user.id })
    }

    return NextResponse.json({ explanation })
  } catch (err) {
    console.error('Explain error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
