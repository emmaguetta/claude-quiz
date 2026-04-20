'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type UsageData = {
  total_cost_usd: number
  cost_last_24h_usd: number
  total_calls: number
  by_endpoint: Record<string, {
    calls: number
    cost_usd: number
    input_tokens: number
    output_tokens: number
  }>
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!secret) { setError('Enter your CRON_SECRET'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mcp/usage', {
        headers: { 'Authorization': `Bearer ${secret}` },
      })
      if (res.status === 401) { setError('Wrong secret'); setLoading(false); return }
      setData(await res.json())
    } catch {
      setError('Failed to load')
    }
    setLoading(false)
  }

  function fmt(n: number) {
    if (n === 0) return '$0.00'
    if (n < 0.000001) return `$${n.toExponential(1)}`
    if (n < 0.01) return `$${n.toFixed(6)}`
    if (n < 1) return `$${n.toFixed(4)}`
    return `$${n.toFixed(2)}`
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">AI Usage & Costs</h1>

      {!data ? (
        <div className="space-y-3">
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="CRON_SECRET"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600"
          />
          <Button onClick={load} disabled={loading} className="w-full bg-zinc-100 text-zinc-900 hover:bg-white">
            {loading ? 'Loading...' : 'View costs'}
          </Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Total cost</p>
                <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{fmt(data.total_cost_usd)}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Last 24h</p>
                <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{fmt(data.cost_last_24h_usd)}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Total calls</p>
                <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{data.total_calls}</p>
              </CardContent>
            </Card>
          </div>

          {/* By endpoint */}
          <div className="space-y-3">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide">By endpoint</h2>
            {Object.entries(data.by_endpoint).map(([endpoint, info]) => (
              <Card key={endpoint} className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="p-4">
                  <p className="font-mono text-sm text-zinc-300">{endpoint}</p>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-center">
                    <div>
                      <p className="text-xs text-zinc-600">Calls</p>
                      <p className="font-mono text-zinc-300">{info.calls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Cost</p>
                      <p className="font-mono text-zinc-300">{fmt(info.cost_usd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Input tokens</p>
                      <p className="font-mono text-zinc-300">{info.input_tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-600">Output tokens</p>
                      <p className="font-mono text-zinc-300">{info.output_tokens.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={() => setData(null)} variant="outline" className="border-zinc-700 text-zinc-400">
            Logout
          </Button>
        </div>
      )}
    </main>
  )
}
