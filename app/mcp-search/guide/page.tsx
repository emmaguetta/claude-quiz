import type { Metadata } from 'next'
import { GuideClient } from './GuideClient'

export const metadata: Metadata = {
  title: 'Install Guide — MCP Search',
  description:
    'Install the claude-quiz MCP server in Claude Code, Claude Desktop, or Cursor to search 4,700+ MCP servers from your chat.',
  alternates: { canonical: '/mcp-search/guide' },
}

export default function McpGuidePage() {
  return <GuideClient />
}
