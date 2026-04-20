/**
 * Scrape MCPs from Smithery.ai registry and store in Supabase.
 *
 * Usage: npx tsx scripts/mcp/scrape-smithery.ts
 *
 * This script:
 * 1. Paginates the Smithery registry API to get all servers
 * 2. For each server, fetches tool details
 * 3. Computes a quality score
 * 4. Stores everything in the mcps + mcp_tools tables
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const SMITHERY_BASE = 'https://registry.smithery.ai'
const PAGE_SIZE = 100
const DELAY_MS = 300 // be polite with rate limiting

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

function computeQualityScore(server: {
  useCount?: number
  verified?: boolean
  score?: number
}): number {
  const useCountNorm = Math.min(Math.log10((server.useCount || 0) + 1) / 5, 1) // log scale, max at 100k
  const verifiedBonus = server.verified ? 1 : 0
  const smitheryScore = server.score || 0

  return useCountNorm * 0.4 + verifiedBonus * 0.3 + smitheryScore * 0.3
}

// Re-export from shared taxonomy
import { inferPrimaryCategory } from '../../lib/mcp-categories'

type SmitheryServer = {
  qualifiedName: string
  displayName?: string
  description?: string
  iconUrl?: string
  verified?: boolean
  useCount?: number
  remote?: boolean
  homepage?: string
  score?: number
}

type SmitheryServerDetail = SmitheryServer & {
  tools?: Array<{
    name: string
    description?: string
    inputSchema?: Record<string, unknown>
  }>
}

async function fetchServerList(): Promise<SmitheryServer[]> {
  const all: SmitheryServer[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(`  Fetching page ${page}...`)
    const res = await fetch(`${SMITHERY_BASE}/servers?pageSize=${PAGE_SIZE}&page=${page}`)
    if (!res.ok) {
      console.error(`  Error fetching page ${page}: ${res.status}`)
      break
    }
    const data = await res.json()
    const servers = data.servers || data.data || data || []

    if (Array.isArray(servers) && servers.length > 0) {
      all.push(...servers)
      page++
      if (servers.length < PAGE_SIZE) hasMore = false
    } else {
      hasMore = false
    }

    await sleep(DELAY_MS)
  }

  return all
}

async function fetchServerDetail(qualifiedName: string): Promise<SmitheryServerDetail | null> {
  try {
    const res = await fetch(`${SMITHERY_BASE}/servers/${encodeURIComponent(qualifiedName)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function main() {
  console.log('🔍 Fetching MCP server list from Smithery...')
  const servers = await fetchServerList()
  console.log(`  Found ${servers.length} servers\n`)

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i]
    const name = server.displayName || server.qualifiedName
    const slug = slugify(server.qualifiedName)

    if (i > 0 && i % 50 === 0) {
      console.log(`\n  Progress: ${i}/${servers.length} (inserted: ${inserted}, skipped: ${skipped}, errors: ${errors})\n`)
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('mcps')
      .select('id')
      .eq('smithery_id', server.qualifiedName)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // Fetch details with tools
    console.log(`  [${i + 1}/${servers.length}] ${name}`)
    const detail = await fetchServerDetail(server.qualifiedName)
    await sleep(DELAY_MS)

    const tools = detail?.tools || []
    const primary = inferPrimaryCategory({
      name: server.displayName || server.qualifiedName,
      description: server.description,
      tools: tools.map(t => ({ name: t.name, description: t.description })),
    })
    const categories = [primary]
    const qualityScore = computeQualityScore(server)

    // Insert MCP
    const { data: mcpRow, error: mcpErr } = await supabase
      .from('mcps')
      .insert({
        name,
        slug,
        description: server.description || null,
        categories,
        source_url: server.homepage || null,
        repo_url: server.homepage?.includes('github.com') ? server.homepage : null,
        icon_url: server.iconUrl || null,
        smithery_id: server.qualifiedName,
        tools_count: tools.length,
        verified: server.verified || false,
        use_count: server.useCount || 0,
        quality_score: qualityScore,
      })
      .select('id')
      .single()

    if (mcpErr) {
      console.error(`    ❌ Error inserting ${name}: ${mcpErr.message}`)
      errors++
      continue
    }

    // Insert tools
    if (tools.length > 0 && mcpRow) {
      const toolRows = tools.map(t => ({
        mcp_id: mcpRow.id,
        name: t.name,
        description: t.description || null,
        input_schema: t.inputSchema || null,
      }))

      const { error: toolErr } = await supabase.from('mcp_tools').insert(toolRows)
      if (toolErr) {
        console.error(`    ⚠ Error inserting tools for ${name}: ${toolErr.message}`)
      }
    }

    inserted++
  }

  console.log(`\n✅ Done!`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped (already exists): ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

main().catch(console.error)
