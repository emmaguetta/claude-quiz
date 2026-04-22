import { createAdminClient } from './supabase'

// Cost per 1M tokens (USD) — update when prices change
const PRICING: Record<string, { input: number; output: number }> = {
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'gpt-4.1-nano':           { input: 0.10, output: 0.40 },
  'gpt-4.1-mini':           { input: 0.40, output: 1.60 },
}

export async function logAiUsage(params: {
  endpoint: string
  model: string
  inputTokens: number
  outputTokens: number
  userId?: string | null
  queryText?: string | null
}) {
  const pricing = PRICING[params.model] || { input: 0, output: 0 }
  const cost =
    (params.inputTokens / 1_000_000) * pricing.input +
    (params.outputTokens / 1_000_000) * pricing.output

  try {
    const supabase = createAdminClient()
    await supabase.from('ai_usage_logs').insert({
      endpoint: params.endpoint,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: cost,
      user_id: params.userId ?? null,
      query_text: params.queryText ?? null,
    })
  } catch {
    // Don't fail the request if logging fails
  }
}
