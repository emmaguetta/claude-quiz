/**
 * Re-embed only the MCP-level chunks (chunk_type='mcp') using the enriched content:
 *   description + categories + tools_count + search_keywords
 *
 * Tool chunks are left untouched. Run after enrich-search-keywords.ts.
 *
 * Usage: npx tsx scripts/mcp/reembed-mcp-chunks.ts
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
const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100

type Mcp = {
  id: string
  name: string
  description: string | null
  categories: string[] | null
  tools_count: number | null
  search_keywords: string | null
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

function buildContent(mcp: Mcp): string {
  const cats = (mcp.categories || []).join(', ')
  const keywords = mcp.search_keywords ? ` Keywords: ${mcp.search_keywords}.` : ''
  return `${mcp.description || mcp.name}. Categories: ${cats}. ${mcp.tools_count || 0} tools available.${keywords} [MCP: ${mcp.name}]`
}

async function main() {
  if (!OPENAI_API_KEY) { console.error('❌ OPENAI_API_KEY missing'); process.exit(1) }

  console.log('📦 Loading MCPs with keywords...')
  const mcps: Mcp[] = []
  let page = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('mcps')
      .select('id, name, description, categories, tools_count, search_keywords')
      .eq('active', true)
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) { console.error('❌', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    mcps.push(...(data as Mcp[]))
    if (data.length < PAGE) break
    page++
  }
  console.log(`  Found ${mcps.length} active MCPs`)

  console.log('🧮 Re-embedding mcp chunks...')
  let processed = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < mcps.length; i += BATCH_SIZE) {
    const batch = mcps.slice(i, i + BATCH_SIZE)
    const texts = batch.map(buildContent)

    try {
      const embeddings = await getEmbeddings(texts)

      // Upsert into mcp_chunks: update existing mcp-type chunk if exists, else insert
      const updates = batch.map(async (mcp, idx) => {
        const content = texts[idx]
        const embedding = JSON.stringify(embeddings[idx])
        // Try update first
        const { data: updated, error: updErr } = await supabase
          .from('mcp_chunks')
          .update({ content, embedding })
          .eq('mcp_id', mcp.id)
          .eq('chunk_type', 'mcp')
          .select('id')
        if (updErr) { console.error(`  ⚠️ update ${mcp.name}:`, updErr.message); return false }
        // If no existing mcp-chunk, insert new
        if (!updated || updated.length === 0) {
          const { error: insErr } = await supabase
            .from('mcp_chunks')
            .insert({ mcp_id: mcp.id, chunk_type: 'mcp', content, embedding, tool_name: null })
          if (insErr) { console.error(`  ⚠️ insert ${mcp.name}:`, insErr.message); return false }
        }
        return true
      })

      const results = await Promise.all(updates)
      processed += results.filter(Boolean).length
      failed += results.filter((r) => !r).length

      const elapsed = (Date.now() - startTime) / 1000
      const rate = processed / elapsed
      const eta = Math.round((mcps.length - processed) / rate)
      console.log(`  Progress: ${processed}/${mcps.length} (${Math.round((processed / mcps.length) * 100)}%) · ${rate.toFixed(1)}/s · ETA ${eta}s · failed ${failed}`)
    } catch (err) {
      console.error(`  ❌ Batch ${i} error:`, err)
      failed += batch.length
    }
  }

  console.log(`\n✅ Done! ${processed} mcp chunks re-embedded, ${failed} failed.`)
}

main().catch((err) => { console.error('❌ Fatal:', err); process.exit(1) })
