/**
 * Enrich MCP descriptions with search keywords (synonyms, platform names, use cases).
 *
 * Writes a hidden `search_keywords` column on `mcps`, never shown in the UI,
 * used only to strengthen the embedding + LIKE keyword match in search_mcps RPC.
 *
 * Usage: npx tsx scripts/mcp/enrich-search-keywords.ts [--limit=N] [--only-missing]
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const MODEL = 'gpt-4.1-nano'
const CONCURRENCY = 10

type Mcp = { id: string; name: string; description: string | null; categories: string[] | null }

const SYSTEM_PROMPT = `You expand MCP server descriptions with search keywords to improve retrieval.
Given an MCP name + description, output a comma-separated list of 10-15 keywords that users might type to find this MCP:
- Platform/brand names (e.g. "Gmail" → "google, email, inbox, mail, workspace")
- Synonyms for terms in the description (e.g. "message" → "email, chat, dm")
- Common use cases ("send emails", "schedule meetings")
- Related tools/concepts

Return ONLY the comma-separated list, no prose, no quotes, lowercase only. Max 150 characters total.`

async function enrichOne(mcp: Mcp): Promise<string | null> {
  const input = `Name: ${mcp.name}\nCategories: ${(mcp.categories || []).join(', ') || 'none'}\nDescription: ${(mcp.description || '').slice(0, 800)}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
      max_completion_tokens: 120,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  ⚠️  ${mcp.name}: ${res.status} ${err.slice(0, 200)}`)
    return null
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) return null
  return text.slice(0, 500).toLowerCase()
}

async function runBatch(batch: Mcp[]): Promise<Array<{ id: string; keywords: string }>> {
  const results = await Promise.all(
    batch.map(async (mcp) => {
      const kw = await enrichOne(mcp)
      return kw ? { id: mcp.id, keywords: kw } : null
    })
  )
  return results.filter((r): r is { id: string; keywords: string } => r !== null)
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY missing in .env.local')
    process.exit(1)
  }

  const onlyMissing = process.argv.includes('--only-missing')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

  console.log(`📦 Loading MCPs${onlyMissing ? ' (only missing keywords)' : ''}...`)
  const mcps: Mcp[] = []
  let page = 0
  const PAGE = 1000
  while (mcps.length < limit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('mcps')
      .select('id, name, description, categories, search_keywords')
      .eq('active', true)
      .range(page * PAGE, (page + 1) * PAGE - 1)
    const { data, error } = await q
    if (error) { console.error('❌', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    const filtered = onlyMissing ? data.filter((m: { search_keywords: string | null }) => !m.search_keywords) : data
    mcps.push(...filtered)
    if (data.length < PAGE) break
    page++
  }
  const todo = mcps.slice(0, Math.min(limit, mcps.length))
  console.log(`  Found ${todo.length} MCPs to enrich`)

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY)
    const results = await runBatch(batch)

    if (results.length > 0) {
      // Update rows one by one (Supabase doesn't do bulk UPDATE with different values via insert)
      const updates = results.map((r) =>
        supabase.from('mcps').update({ search_keywords: r.keywords }).eq('id', r.id)
      )
      await Promise.all(updates)
    }
    failed += batch.length - results.length
    done += batch.length

    const elapsed = (Date.now() - startTime) / 1000
    const rate = done / elapsed
    const eta = Math.round((todo.length - done) / rate)
    console.log(`  Progress: ${done}/${todo.length} (${Math.round((done / todo.length) * 100)}%) · ${rate.toFixed(1)}/s · ETA ${eta}s · failed ${failed}`)
  }

  console.log(`\n✅ Done! ${done - failed} MCPs enriched, ${failed} failed.`)
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
