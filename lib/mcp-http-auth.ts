import { createAdminClient } from '@/lib/supabase'
import { createHash, randomBytes } from 'node:crypto'
import { isAccessToken, validateOAuthAccessToken } from '@/lib/oauth'

export const API_KEY_PREFIX = 'mcps_'

export type AuthResult =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'unauthenticated' }

/**
 * Authenticates an HTTP MCP request via Bearer (OAuth access token or API key).
 * Anonymous access is no longer supported — every tool call requires sign-in.
 */
export async function authenticateMcpHttp(request: Request): Promise<AuthResult> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return { kind: 'unauthenticated' }

  const token = auth.slice(7).trim()
  if (isAccessToken(token)) {
    const result = await validateOAuthAccessToken(token)
    if (result.ok) return { kind: 'authenticated', userId: result.userId }
    return { kind: 'unauthenticated' }
  }

  const userId = await validateApiKey(token)
  if (userId) return { kind: 'authenticated', userId }
  return { kind: 'unauthenticated' }
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
  const random = randomBytes(32).toString('base64url')
  const rawKey = `${API_KEY_PREFIX}${random}`
  const hash = hashApiKey(rawKey)
  const prefix = rawKey.slice(0, 12)
  return { rawKey, hash, prefix }
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}
