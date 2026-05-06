import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  generateAccessToken,
  generateRefreshToken,
  hashSecret,
  verifyPkceS256,
} from '@/lib/oauth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = rateLimit(`oauth-token:${ip}`, { maxRequests: 30, windowMs: 60_000 })
  if (!allowed) {
    return tokenError('slow_down', 429)
  }

  const ct = request.headers.get('content-type') ?? ''
  let params: URLSearchParams
  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    params = new URLSearchParams(text)
  } else if (ct.includes('application/json')) {
    try {
      const body = (await request.json()) as Record<string, string>
      params = new URLSearchParams(body)
    } catch {
      return tokenError('invalid_request')
    }
  } else {
    return tokenError('invalid_request')
  }

  const grantType = params.get('grant_type')
  if (grantType === 'authorization_code') {
    return handleAuthCodeGrant(params)
  }
  if (grantType === 'refresh_token') {
    return handleRefreshGrant(params)
  }
  return tokenError('unsupported_grant_type')
}

async function handleAuthCodeGrant(params: URLSearchParams) {
  const code = params.get('code')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const codeVerifier = params.get('code_verifier')

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return tokenError('invalid_request')
  }

  const codeHash = hashSecret(code)
  const admin = createAdminClient()

  const { data: row } = await (admin.from('oauth_codes') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: {
            code_hash: string
            client_id: string
            user_id: string
            redirect_uri: string
            code_challenge: string
            code_challenge_method: string
            scope: string
            resource: string | null
            expires_at: string
            used_at: string | null
          } | null
        }>
      }
    }
  })
    .select('code_hash, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, scope, resource, expires_at, used_at')
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (!row) return tokenError('invalid_grant')

  // One-time use: mark used immediately to prevent replay races.
  // Per RFC 6749 §10.5, if a code is reused, the AS SHOULD revoke all tokens issued from it.
  if (row.used_at) {
    await admin
      .from('oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('client_id', row.client_id)
      .eq('user_id', row.user_id)
    return tokenError('invalid_grant')
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return tokenError('invalid_grant')
  }
  if (row.client_id !== clientId) return tokenError('invalid_grant')
  if (row.redirect_uri !== redirectUri) return tokenError('invalid_grant')
  if (!verifyPkceS256(codeVerifier, row.code_challenge)) {
    return tokenError('invalid_grant')
  }

  const { data: updated } = await (admin.from('oauth_codes') as unknown as {
    update: (vals: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          select: () => Promise<{ data: Array<{ code_hash: string }> | null }>
        }
      }
    }
  })
    .update({ used_at: new Date().toISOString() })
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .select()

  if (!updated || updated.length === 0) {
    // Lost the race: another request consumed the code first.
    return tokenError('invalid_grant')
  }

  return issueTokens(row.client_id, row.user_id, row.scope, row.resource)
}

async function handleRefreshGrant(params: URLSearchParams) {
  const refreshToken = params.get('refresh_token')
  const clientId = params.get('client_id')

  if (!refreshToken || !clientId) {
    return tokenError('invalid_request')
  }

  const refreshHash = hashSecret(refreshToken)
  const admin = createAdminClient()

  const { data: row } = await (admin.from('oauth_tokens') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: {
            id: string
            client_id: string
            user_id: string
            scope: string
            resource: string | null
            refresh_expires_at: string | null
            revoked_at: string | null
          } | null
        }>
      }
    }
  })
    .select('id, client_id, user_id, scope, resource, refresh_expires_at, revoked_at')
    .eq('refresh_token_hash', refreshHash)
    .maybeSingle()

  if (!row || row.revoked_at || row.client_id !== clientId) {
    return tokenError('invalid_grant')
  }
  if (row.refresh_expires_at && new Date(row.refresh_expires_at).getTime() < Date.now()) {
    return tokenError('invalid_grant')
  }

  // Rotation: revoke the old token before issuing new ones (RFC 6749 §10.4 best practice).
  await admin.from('oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', row.id)

  return issueTokens(row.client_id, row.user_id, row.scope, row.resource)
}

async function issueTokens(clientId: string, userId: string, scope: string, resource: string | null) {
  const accessToken = generateAccessToken()
  const refreshToken = generateRefreshToken()
  const accessExp = new Date(Date.now() + ACCESS_TOKEN_TTL_MS)
  const refreshExp = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

  const admin = createAdminClient()
  const { error } = await admin.from('oauth_tokens').insert({
    access_token_hash: hashSecret(accessToken),
    refresh_token_hash: hashSecret(refreshToken),
    client_id: clientId,
    user_id: userId,
    scope,
    resource,
    access_expires_at: accessExp.toISOString(),
    refresh_expires_at: refreshExp.toISOString(),
  })

  if (error) {
    return tokenError('server_error', 500)
  }

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refreshToken,
      scope,
    },
    { headers: CORS_HEADERS }
  )
}

function tokenError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: CORS_HEADERS })
}
