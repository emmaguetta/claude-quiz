import { supabase } from '@/lib/supabase'
import { CATEGORIES, CATEGORY_GROUPS, type CategoryGroup } from '@/lib/mcp-categories'
import { TOOL_TAGS } from '@/lib/mcp-tools'

export type CategoryGroupPayload = {
  id: CategoryGroup
  label: string
  labelFr: string
  categories: Array<{ id: string; label: string; labelFr: string; count: number }>
}

export type ToolItem = { id: string; label: string; count: number }

export type CategoriesPayload = {
  groups: CategoryGroupPayload[]
  tools: ToolItem[]
  total: number
}

export async function loadMcpCategories(): Promise<CategoriesPayload> {
  const { count: totalCount } = await supabase
    .from('mcps')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  let allRows: { categories: string[]; tool_tags: string[] | null }[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: batch, error: batchError } = (await supabase
      .from('mcps')
      .select('categories, tool_tags')
      .eq('active', true)
      .range(page * pageSize, (page + 1) * pageSize - 1)) as {
      data: { categories: string[]; tool_tags: string[] | null }[] | null
      error: { message: string } | null
    }

    if (batchError) throw new Error(batchError.message)
    if (!batch || batch.length === 0) break
    allRows = allRows.concat(batch)
    if (batch.length < pageSize) break
    page++
  }

  const catCounts: Record<string, number> = {}
  const toolCounts: Record<string, number> = {}
  for (const row of allRows) {
    for (const cat of row.categories || []) {
      catCounts[cat] = (catCounts[cat] || 0) + 1
    }
    for (const tag of row.tool_tags || []) {
      toolCounts[tag] = (toolCounts[tag] || 0) + 1
    }
  }

  const groups: CategoryGroupPayload[] = []
  const seenGroups = new Set<CategoryGroup>()
  for (const cat of CATEGORIES) {
    if (cat.id === 'other') continue
    if (!seenGroups.has(cat.group)) {
      seenGroups.add(cat.group)
      groups.push({
        id: cat.group,
        ...CATEGORY_GROUPS[cat.group],
        categories: [],
      })
    }
    const group = groups.find(g => g.id === cat.group)!
    group.categories.push({
      id: cat.id,
      label: cat.label,
      labelFr: cat.labelFr,
      count: catCounts[cat.id] || 0,
    })
  }

  const otherCount = catCounts['other'] || 0
  if (otherCount > 0) {
    const lastGroup = groups[groups.length - 1]
    lastGroup.categories.push({
      id: 'other',
      label: 'Other',
      labelFr: 'Autre',
      count: otherCount,
    })
  }

  const tools = TOOL_TAGS
    .map(t => ({ id: t.id, label: t.label, count: toolCounts[t.id] || 0 }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)

  return {
    groups,
    tools,
    total: totalCount ?? allRows.length,
  }
}
