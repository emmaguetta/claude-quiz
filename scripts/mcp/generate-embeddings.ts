/**
 * Generate embeddings for all MCPs and their tools.
 *
 * Usage: npx tsx scripts/mcp/generate-embeddings.ts
 *
 * This script:
 * 1. Reads all active MCPs from Supabase
 * 2. Creates text chunks (1 per MCP + 1 per tool)
 * 3. Generates embeddings via OpenAI text-embedding-3-small
 * 4. Stores chunks + embeddings in mcp_chunks
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Use OpenAI directly for embeddings (cheaper, no need for AI Gateway here)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required. Set it in .env.local')
    process.exit(1)
  }

  // Clear existing chunks
  console.log('🗑️  Clearing existing chunks...')
  const { error: delErr } = await supabase.from('mcp_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) console.error('  Warning clearing chunks:', delErr.message)

  // Load all active MCPs (paginate to avoid 1000 row limit)
  console.log('📦 Loading MCPs...')
  const mcps: Array<{ id: string; name: string; description: string | null; categories: string[]; tools_count: number; search_keywords: string | null }> = []
  let mcpPage = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('mcps')
      .select('id, name, description, categories, tools_count, search_keywords')
      .eq('active', true)
      .range(mcpPage * PAGE, (mcpPage + 1) * PAGE - 1)
    if (error) { console.error('❌ Error loading MCPs:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    mcps.push(...data)
    mcpPage++
  }
  console.log(`  Found ${mcps.length} active MCPs`)

  // Load all tools (paginate)
  console.log('🔧 Loading tools...')
  const tools: Array<{ id: string; mcp_id: string; name: string; description: string | null }> = []
  let toolPage = 0
  while (true) {
    const { data, error } = await supabase
      .from('mcp_tools')
      .select('id, mcp_id, name, description')
      .range(toolPage * PAGE, (toolPage + 1) * PAGE - 1)
    if (error) { console.error('❌ Error loading tools:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    tools.push(...data)
    toolPage++
  }
  console.log(`  Found ${tools.length} tools`)

  // Build tool lookup
  const toolsByMcp = new Map<string, typeof tools>()
  for (const tool of tools || []) {
    const list = toolsByMcp.get(tool.mcp_id) || []
    list.push(tool)
    toolsByMcp.set(tool.mcp_id, list)
  }

  // Generate chunks
  console.log('📝 Generating chunks...')
  const chunks: Array<{
    mcp_id: string
    chunk_type: 'mcp' | 'tool'
    content: string
    tool_name: string | null
  }> = []

  for (const mcp of mcps) {
    // MCP-level chunk (enriched with search_keywords when available)
    const cats = (mcp.categories || []).join(', ')
    const keywords = mcp.search_keywords ? ` Keywords: ${mcp.search_keywords}.` : ''
    const mcpContent = `${mcp.description || mcp.name}. Categories: ${cats}. ${mcp.tools_count} tools available.${keywords} [MCP: ${mcp.name}]`
    chunks.push({
      mcp_id: mcp.id,
      chunk_type: 'mcp',
      content: mcpContent,
      tool_name: null,
    })

    // Tool-level chunks
    const mcpTools = toolsByMcp.get(mcp.id) || []
    for (const tool of mcpTools) {
      const toolContent = `${tool.description || tool.name} [MCP: ${mcp.name}]`
      chunks.push({
        mcp_id: mcp.id,
        chunk_type: 'tool',
        content: toolContent,
        tool_name: tool.name,
      })
    }
  }

  console.log(`  Generated ${chunks.length} chunks (${mcps.length} MCP + ${chunks.length - mcps.length} tool)`)

  // Generate embeddings in batches
  console.log('🧮 Generating embeddings...')
  let processed = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map(c => c.content)

    try {
      const embeddings = await getEmbeddings(texts)

      // Insert chunks with embeddings
      const rows = batch.map((chunk, idx) => ({
        ...chunk,
        embedding: JSON.stringify(embeddings[idx]),
      }))

      const { error: insertErr } = await supabase.from('mcp_chunks').insert(rows)
      if (insertErr) {
        console.error(`  ❌ Error inserting batch at ${i}: ${insertErr.message}`)
      }

      processed += batch.length
      console.log(`  Progress: ${processed}/${chunks.length} chunks embedded`)
    } catch (err) {
      console.error(`  ❌ Embedding error at batch ${i}:`, err)
    }
  }

  console.log(`\n✅ Done! ${processed} chunks embedded.`)
}

main().catch(console.error)
