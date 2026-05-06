import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/api-auth'
import { SUPPORTED_SCOPE } from '@/lib/oauth'
import { ConsentForm } from './ConsentForm'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

function pickStr(v: string | string[] | undefined): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0]
  return null
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams

  const responseType = pickStr(sp.response_type)
  const clientId = pickStr(sp.client_id)
  const redirectUri = pickStr(sp.redirect_uri)
  const codeChallenge = pickStr(sp.code_challenge)
  const codeChallengeMethod = pickStr(sp.code_challenge_method)
  const scope = pickStr(sp.scope) ?? SUPPORTED_SCOPE
  const state = pickStr(sp.state)
  const resource = pickStr(sp.resource)

  if (responseType !== 'code') {
    return <ErrorScreen title="Invalid request" message="Only response_type=code is supported." />
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return <ErrorScreen title="Invalid request" message="Missing client_id, redirect_uri, or code_challenge." />
  }
  if (codeChallengeMethod !== 'S256') {
    return <ErrorScreen title="Invalid request" message="Only code_challenge_method=S256 is supported." />
  }

  const admin = createAdminClient()
  const { data: client } = await (admin.from('oauth_clients') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { client_id: string; client_name: string; redirect_uris: string[] } | null }>
      }
    }
  })
    .select('client_id, client_name, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!client) {
    return <ErrorScreen title="Unknown client" message="This OAuth client is not registered." />
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return <ErrorScreen title="Invalid redirect_uri" message="redirect_uri does not match the one registered for this client." />
  }

  const user = await getAuthUser()
  if (!user) {
    const params = new URLSearchParams()
    params.set('response_type', responseType)
    params.set('client_id', clientId)
    params.set('redirect_uri', redirectUri)
    params.set('code_challenge', codeChallenge)
    params.set('code_challenge_method', codeChallengeMethod)
    params.set('scope', scope)
    if (state) params.set('state', state)
    if (resource) params.set('resource', resource)
    const back = `/oauth/authorize?${params.toString()}`
    redirect(`/login?redirectTo=${encodeURIComponent(back)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Authorize {client.client_name}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            This app is requesting access to <strong>mcp-search</strong> on your behalf.
          </p>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300 space-y-1">
          <div><span className="text-zinc-500">Account:</span> {user.email}</div>
          <div><span className="text-zinc-500">Scope:</span> {scope}</div>
          <div className="text-xs text-zinc-500 pt-1">
            Lifts the 3-calls-per-session anonymous cap and unlocks <code className="text-zinc-300">analyze_mcps</code>. Free.
          </div>
        </div>

        <ConsentForm
          clientId={clientId}
          redirectUri={redirectUri}
          codeChallenge={codeChallenge}
          codeChallengeMethod={codeChallengeMethod}
          scope={scope}
          state={state ?? ''}
          resource={resource ?? ''}
        />
      </div>
    </div>
  )
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-red-900/50 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold text-red-400">{title}</h1>
        <p className="text-sm text-zinc-400 mt-2">{message}</p>
      </div>
    </div>
  )
}
