import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'MCP Search Engine',
  description: 'Search and discover 4700+ Model Context Protocol servers and tools. Find the right MCP by describing what you want to do.',
  alternates: { canonical: '/mcp-search' },
}

const mcpJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MCP Search Engine',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: 'Semantic search engine for Model Context Protocol servers and tools',
}

export default function McpSearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={mcpJsonLd} />
      {children}
    </>
  )
}
