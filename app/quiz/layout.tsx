import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'Test your Claude Code knowledge with interactive quizzes covering commands, shortcuts, MCP, workflows and more.',
  alternates: { canonical: '/quiz' },
}

const quizJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Quiz',
  name: 'Claude Code Knowledge Quiz',
  about: { '@type': 'Thing', name: 'Claude Code' },
  educationalLevel: 'Beginner to Advanced',
  provider: { '@type': 'Organization', name: 'Claude Code Quiz' },
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={quizJsonLd} />
      {children}
    </>
  )
}
