import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase'
import {
  AUTH_CODE_TTL_MS,
  generateAuthCode,
  hashSecret,
  SUPPORTED_SCOPE,
} from '@/lib/oauth'

export const runtime = 'nodejs'

interface ConsentBody {
  clientId?: unknown
  redirectUri?: unknown
  codeChallenge?: unknown
  codeChallengeMethod?: unknown
  scope?: unknown
  state?: unknown
  resource?: unknown
  approve?: unknown
}

export async function POST(request: Request) {
  let body: ConsentBody
  try {
    body = (await request.json()) as ConsentBody
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const clientId = strField(body.clientId)
  const redirectUri = strField(body.redirectUri)
  const codeChallenge = strField(body.codeChallenge)
  const codeChallengeMethod = strField(body.codeChallengeMethod)
  const scope = strField(body.scope) ?? SUPPORTED_SCOPE
  const state = strField(body.state) ?? ''
  const resource = strField(body.resource)
  const approve = body.approve === true

  if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: client } = await (admin.from('oauth_clients') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { client_id: string; redirect_uris: string[] } | null }>
      }
    }
  })
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_client_or_redirect' }, { status: 400 })
  }

  if (!approve) {
    const url = appendQuery(redirectUri, { error: 'access_denied', state })
    return NextResponse.json({ redirect: url })
  }

  const code = generateAuthCode()
  const codeHash = hashSecret(code)
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString()

  const { error: insertErr } = await admin.from('oauth_codes').insert({
    code_hash: codeHash,
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
    resource: resource ?? null,
    expires_at: expiresAt,
  })

  if (insertErr) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const url = appendQuery(redirectUri, { code, state })
  return NextResponse.json({ redirect: url })
}

function strField(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function appendQuery(uri: string, params: Record<string, string>): string {
  const u = new URL(uri)
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v)
  }
  return u.toString()
}
