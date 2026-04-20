import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — Claude Code, MCP & Quiz',
  description:
    'Everything about Claude Code, MCP protocol, semantic MCP server search, and the interactive Claude Code Quiz.',
  alternates: { canonical: '/faq' },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
