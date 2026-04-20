/**
 * Recategorize all MCPs using the new use-case oriented taxonomy AND infer tool tags.
 *
 * Usage: npx tsx scripts/mcp/recategorize.ts
 *
 * Writes two columns:
 *   - categories TEXT[]  single-element array with the primary use-case category
 *   - tool_tags  TEXT[]  zero or more tool-brand tags (Google, LinkedIn, Discord, …)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { inferPrimaryCategory, CATEGORIES, CATEGORY_GROUPS, type CategoryGroup } from '../../lib/mcp-categories'
import { inferToolTags, TOOL_TAGS } from '../../lib/mcp-tools'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BATCH_SIZE = 200

async function main() {
  console.log('🏷️  Recategorizing MCPs + inferring tool tags…\n')

  // Fetch all active MCPs (pagination because Supabase caps at 1000 rows)
  let mcps: Array<{ id: string; name: string; description: string | null }> = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('mcps')
      .select('id, name, description')
      .eq('active', true)
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Failed to fetch MCPs:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    mcps = mcps.concat(data)
    if (data.length < pageSize) break
    page++
  }

  console.log(`  Found ${mcps.length} active MCPs\n`)

  // Fetch tools in pages too
  let allTools: Array<{ mcp_id: string; name: string; description: string | null }> = []
  page = 0
  while (true) {
    const { data } = await supabase
      .from('mcp_tools')
      .select('mcp_id, name, description')
      .order('mcp_id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (!data || data.length === 0) break
    allTools = allTools.concat(data)
    if (data.length < pageSize) break
    page++
  }

  const toolsByMcp = new Map<string, Array<{ name: string; description: string | null }>>()
  for (const tool of allTools) {
    const list = toolsByMcp.get(tool.mcp_id) || []
    list.push(tool)
    toolsByMcp.set(tool.mcp_id, list)
  }

  // Compute updates
  const updates: Array<{ id: string; categories: string[]; tool_tags: string[] }> = []
  const catStats: Record<string, number> = {}
  const toolStats: Record<string, number> = {}

  for (const mcp of mcps) {
    const tools = toolsByMcp.get(mcp.id) || []
    const primary = inferPrimaryCategory({
      name: mcp.name,
      description: mcp.description,
      tools: tools.map(t => ({ name: t.name, description: t.description })),
    })
    const toolTags = inferToolTags({ name: mcp.name, description: mcp.description })

    updates.push({ id: mcp.id, categories: [primary], tool_tags: toolTags })
    catStats[primary] = (catStats[primary] || 0) + 1
    for (const tag of toolTags) toolStats[tag] = (toolStats[tag] || 0) + 1
  }

  // Print category distribution
  console.log('📊 Category distribution:\n')
  const groups = new Map<CategoryGroup, Array<{ id: string; count: number }>>()
  for (const cat of CATEGORIES) {
    const count = catStats[cat.id] || 0
    const list = groups.get(cat.group) || []
    list.push({ id: cat.id, count })
    groups.set(cat.group, list)
  }

  for (const [group, cats] of groups) {
    const groupTotal = cats.reduce((s, c) => s + c.count, 0)
    console.log(`  ${CATEGORY_GROUPS[group].label} (${groupTotal})`)
    for (const { id, count } of cats) {
      const bar = '█'.repeat(Math.ceil(count / 50))
      console.log(`    ${id.padEnd(18)} ${String(count).padStart(5)}  ${bar}`)
    }
    console.log()
  }

  // Print tool distribution
  console.log('🔖 Tool-tag distribution (MCPs tagged):\n')
  const sortedTools = TOOL_TAGS
    .map(t => ({ id: t.id, label: t.label, count: toolStats[t.id] || 0 }))
    .sort((a, b) => b.count - a.count)
  for (const t of sortedTools) {
    if (t.count === 0) continue
    const bar = '█'.repeat(Math.ceil(t.count / 10))
    console.log(`  ${t.label.padEnd(20)} ${String(t.count).padStart(4)}  ${bar}`)
  }
  console.log()

  // Batch update
  console.log('💾 Updating database…\n')
  let updated = 0
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const { error: updateErr } = await supabase
        .from('mcps')
        .update({ categories: row.categories, tool_tags: row.tool_tags })
        .eq('id', row.id)

      if (updateErr) {
        console.error(`  Error updating ${row.id}: ${updateErr.message}`)
      } else {
        updated++
      }
    }
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`)
  }

  console.log(`\n✅ Done! Updated ${updated}/${mcps.length} MCPs`)
}

main().catch(console.error)
