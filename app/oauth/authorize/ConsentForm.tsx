'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ConsentForm(props: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  scope: string
  state: string
  resource: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(approve: boolean) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...props, approve }),
      })
      const data = (await res.json()) as { redirect: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Authorization failed')
        setSubmitting(false)
        return
      }
      window.location.href = data.redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-sm text-red-400">{error}</div> : null}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => decide(true)}
        >
          {submitting ? 'Authorizing…' : 'Authorize'}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={submitting}
          onClick={() => decide(false)}
        >
          Deny
        </Button>
      </div>
    </div>
  )
}
