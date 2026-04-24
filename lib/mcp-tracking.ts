import { createAdminClient } from './supabase'

export type McpEventType = 'browse' | 'detail_viewed' | 'external_click'

export async function logMcpEvent(params: {
  eventType: McpEventType
  userId?: string | null
  payload?: Record<string, unknown>
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('mcp_events').insert({
      event_type: params.eventType,
      user_id: params.userId ?? null,
      payload: params.payload ?? {},
    })
  } catch {
    // Fire-and-forget: never fail the request because tracking failed
  }
}
