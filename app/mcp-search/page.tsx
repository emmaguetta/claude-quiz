import { McpSearchClient } from '@/components/mcp/McpSearchClient'
import { loadMcpCategories } from '@/lib/mcp/categories-data'

export const revalidate = 3600

export default async function McpSearchPage() {
  let groups: Awaited<ReturnType<typeof loadMcpCategories>>['groups'] = []
  let tools: Awaited<ReturnType<typeof loadMcpCategories>>['tools'] = []
  let total = 0

  try {
    const payload = await loadMcpCategories()
    groups = payload.groups
    tools = payload.tools
    total = payload.total
  } catch {
    // Fall back to client-side fetch via useEffect — page still works
  }

  return (
    <McpSearchClient
      initialCategoryGroups={groups}
      initialTools={tools}
      initialTotalMcps={total}
    />
  )
}
