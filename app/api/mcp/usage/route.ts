import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: Request) {
  // Simple auth: require CRON_SECRET as bearer token
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Total costs
  const { data: totals } = await supabase
    .from('ai_usage_logs')
    .select('endpoint, cost_usd, input_tokens, output_tokens')

  if (!totals || totals.length === 0) {
    return NextResponse.json({ message: 'No usage yet', total_cost_usd: 0 })
  }

  // Aggregate by endpoint
  const byEndpoint: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {}
  let totalCost = 0

  for (const row of totals) {
    const ep = row.endpoint
    if (!byEndpoint[ep]) byEndpoint[ep] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 }
    byEndpoint[ep].calls++
    byEndpoint[ep].cost += row.cost_usd
    byEndpoint[ep].inputTokens += row.input_tokens
    byEndpoint[ep].outputTokens += row.output_tokens
    totalCost += row.cost_usd
  }

  // Last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('ai_usage_logs')
    .select('cost_usd')
    .gte('created_at', oneDayAgo)

  const cost24h = (recent || []).reduce((sum, r) => sum + r.cost_usd, 0)

  return NextResponse.json({
    total_cost_usd: totalCost,
    cost_last_24h_usd: cost24h,
    total_calls: totals.length,
    by_endpoint: Object.fromEntries(
      Object.entries(byEndpoint).map(([ep, data]) => [ep, {
        calls: data.calls,
        cost_usd: data.cost,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
      }])
    ),
  })
}
