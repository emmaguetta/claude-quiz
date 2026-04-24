import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logMcpEvent, type McpEventType } from '@/lib/mcp-tracking'

const ALLOWED_EVENTS: McpEventType[] = ['detail_viewed', 'external_click']

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`mcp-track:${ip}`, { maxRequests: 60, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json() as {
      eventType?: string
      payload?: Record<string, unknown>
    }

    if (!body.eventType || !ALLOWED_EVENTS.includes(body.eventType as McpEventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const user = await getAuthUser()
    await logMcpEvent({
      eventType: body.eventType as McpEventType,
      userId: user?.id,
      payload: body.payload ?? {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
