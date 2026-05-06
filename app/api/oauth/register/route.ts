import { NextResponse } from 'next/server'
import { generateClientId, SUPPORTED_SCOPE } from '@/lib/oauth'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = rateLimit(`oauth-register:${ip}`, { maxRequests: 10, windowMs: 60_000 })
  if (!allowed) {
    return jsonError('rate_limit_exceeded', 'Too many registrations from this IP', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('invalid_client_metadata', 'Invalid JSON body')
  }

  const meta = body as Record<string, unknown> | null
  if (!meta || typeof meta !== 'object') {
    return jsonError('invalid_client_metadata', 'Body must be an object')
  }

  const clientName = typeof meta.client_name === 'string' ? meta.client_name.slice(0, 200) : 'mcp-client'
  const redirectUris = Array.isArray(meta.redirect_uris)
    ? meta.redirect_uris.filter((u): u is string => typeof u === 'string')
    : []

  if (redirectUris.length === 0) {
    return jsonError('invalid_redirect_uri', 'redirect_uris is required')
  }
  for (const uri of redirectUris) {
    if (!isValidRedirectUri(uri)) {
      return jsonError('invalid_redirect_uri', `Invalid redirect_uri: ${uri}`)
    }
  }

  const clientId = generateClientId()
  const admin = createAdminClient()
  const { error } = await admin.from('oauth_clients').insert({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    scope: SUPPORTED_SCOPE,
  })

  if (error) {
    return jsonError('server_error', 'Failed to register client', 500)
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SUPPORTED_SCOPE,
    },
    { status: 201, headers: CORS_HEADERS }
  )
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri)
    if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return false
    }
    return url.protocol === 'http:' || url.protocol === 'https:' || /^[a-z][a-z0-9+\-.]*:$/i.test(url.protocol)
  } catch {
    return false
  }
}

function jsonError(error: string, error_description: string, status = 400) {
  return NextResponse.json({ error, error_description }, { status, headers: CORS_HEADERS })
}
