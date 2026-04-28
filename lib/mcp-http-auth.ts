import { createAdminClient } from '@/lib/supabase'
import { createHash, randomBytes } from 'node:crypto'

export const FREE_USES_LIMIT = 3
export const API_KEY_PREFIX = 'mcps_'
const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-:]{1,200}$/

export type AuthResult =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'free'; sessionId: string; usesAfter: number; remainingFree: number }
  | { kind: 'free_exhausted'; sessionId: string }
  | { kind: 'no_session' }
  | { kind: 'invalid_session' }

/**
 * Authenticates an HTTP MCP request.
 * Priority: Bearer API key (unlimited) > Mcp-Session-Id (3 free uses) > unauthenticated.
 *
 * Note: this also CONSUMES a free use if the session is in free tier — it must be called
 * once per tool invocation, not per request (initialize/tools/list shouldn't consume).
 */
export async function authenticateMcpHttp(request: Request, consumeFreeUse: boolean): Promise<AuthResult> {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const key = auth.slice(7).trim()
    const userId = await validateApiKey(key)
    if (userId) return { kind: 'authenticated', userId }
    // Invalid key falls through to session-based auth
  }

  const sessionId = request.headers.get('mcp-session-id')
  if (!sessionId) return { kind: 'no_session' }
  if (!SESSION_ID_REGEX.test(sessionId)) return { kind: 'invalid_session' }

  const admin = createAdminClient()
  const { data: existing } = await (admin.from('mcp_http_sessions') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { uses_count: number } | null }>
      }
    }
  })
    .select('uses_count')
    .eq('session_id', sessionId)
    .maybeSingle()

  const current = existing?.uses_count ?? 0
  if (current >= FREE_USES_LIMIT) {
    return { kind: 'free_exhausted', sessionId }
  }

  if (!consumeFreeUse) {
    return { kind: 'free', sessionId, usesAfter: current, remainingFree: FREE_USES_LIMIT - current }
  }

  const newCount = current + 1
  await admin.from('mcp_http_sessions').upsert(
    {
      session_id: sessionId,
      uses_count: newCount,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  )

  return { kind: 'free', sessionId, usesAfter: newCount, remainingFree: FREE_USES_LIMIT - newCount }
}

async function validateApiKey(rawKey: string): Promise<string | null> {
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null
  const hash = hashApiKey(rawKey)
  const admin = createAdminClient()
  const { data } = await (admin.from('mcp_api_keys') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { user_id: string; revoked_at: string | null } | null }>
      }
    }
  })
    .select('user_id, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle()

  if (!data || data.revoked_at) return null

  // Fire-and-forget last_used_at update
  void admin
    .from('mcp_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash)
    .then(
      () => {},
      () => {}
    )

  return data.user_id
}

export function generateApiKey(): { rawKey: string; hash: string; prefix: string } {
  // 32 random bytes → 43 chars base64url. Total length: prefix(5) + 43 = 48 chars.
  const random = randomBytes(32).toString('base64url')
  const rawKey = `${API_KEY_PREFIX}${random}`
  const hash = hashApiKey(rawKey)
  const prefix = rawKey.slice(0, 12) // "mcps_xxxxxxx" — first 12 chars for UI display
  return { rawKey, hash, prefix }
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}
