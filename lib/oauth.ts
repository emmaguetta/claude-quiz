import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase'

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000

export const SUPPORTED_SCOPE = 'mcp:search'

const CLIENT_ID_PREFIX = 'mcpc_'
const ACCESS_TOKEN_PREFIX = 'mcpat_'
const REFRESH_TOKEN_PREFIX = 'mcprt_'

export function getIssuer(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'
}

export function getResourceUrl(): string {
  return `${getIssuer()}/api/mcp`
}

export function generateClientId(): string {
  return `${CLIENT_ID_PREFIX}${randomBytes(16).toString('base64url')}`
}

export function generateAuthCode(): string {
  return randomBytes(32).toString('base64url')
}

export function generateAccessToken(): string {
  return `${ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function generateRefreshToken(): string {
  return `${REFRESH_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function isAccessToken(value: string): boolean {
  return value.startsWith(ACCESS_TOKEN_PREFIX)
}

// PKCE S256: BASE64URL(SHA256(verifier)) === code_challenge
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = createHash('sha256').update(verifier).digest()
  const computedB64 = computed.toString('base64url')
  if (computedB64.length !== challenge.length) return false
  return timingSafeEqual(Buffer.from(computedB64), Buffer.from(challenge))
}

export type TokenValidation =
  | { ok: true; userId: string; scope: string; tokenId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'revoked' }

export async function validateOAuthAccessToken(rawToken: string): Promise<TokenValidation> {
  if (!isAccessToken(rawToken)) return { ok: false, reason: 'invalid' }
  const hash = hashSecret(rawToken)
  const admin = createAdminClient()
  const { data } = await (admin.from('oauth_tokens') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: {
            id: string
            user_id: string
            scope: string
            access_expires_at: string
            revoked_at: string | null
          } | null
        }>
      }
    }
  })
    .select('id, user_id, scope, access_expires_at, revoked_at')
    .eq('access_token_hash', hash)
    .maybeSingle()

  if (!data) return { ok: false, reason: 'invalid' }
  if (data.revoked_at) return { ok: false, reason: 'revoked' }
  if (new Date(data.access_expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' }

  void admin
    .from('oauth_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(
      () => {},
      () => {}
    )

  return { ok: true, userId: data.user_id, scope: data.scope, tokenId: data.id }
}
