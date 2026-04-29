'use client'

import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { JsonLd } from '@/components/JsonLd'

const CATEGORY_ORDER = ['shortcuts', 'commands', 'concepts', 'mcp', 'workflow'] as const

export default function FaqPage() {
  const { t } = useLocale()
  const faq = t.faqPage

  const catLabels: Record<string, string> = {
    shortcuts: faq.catShortcuts,
    commands: faq.catCommands,
    concepts: faq.catConcepts,
    mcp: faq.catMcp,
    workflow: faq.catWorkflow,
  }

  // Group quiz questions by category
  const groupedQuiz: Record<string, typeof faq.quiz> = {}
  for (const q of faq.quiz) {
    if (!groupedQuiz[q.category]) groupedQuiz[q.category] = []
    groupedQuiz[q.category].push(q)
  }

  // JSON-LD schema
  const allItems = [
    ...faq.claudeCode,
    ...faq.site,
    ...faq.quiz.map((item) => ({ q: item.q, a: `${item.answer}. ${item.explanation}` })),
  ]
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <JsonLd data={faqSchema} />

      {/* Header with nav + locale toggle */}
      <div className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            {faq.back}
          </Link>
          <LocaleToggle />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-zinc-50 mb-2">{faq.title}</h1>
        <p className="text-zinc-500 mb-12">{faq.subtitle}</p>

        {/* Section 1 — Claude Code & MCP */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6 pb-2 border-b border-zinc-800">
            {faq.sectionClaude}
          </h2>
          <div className="space-y-6">
            {faq.claudeCode.map((item, i) => (
              <article key={i} className="border-l-2 border-zinc-800 pl-4">
                <h3 className="text-base font-medium text-zinc-200 mb-1">{item.q}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2 — The site & MCP search */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6 pb-2 border-b border-zinc-800">
            {faq.sectionSite}
          </h2>
          <div className="space-y-6">
            {faq.site.map((item, i) => (
              <article key={i} className="border-l-2 border-zinc-800 pl-4">
                <h3 className="text-base font-medium text-zinc-200 mb-1">{item.q}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm text-zinc-400">
              {faq.tryMcp}{' '}
              <Link
                href="/mcp-search"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                {faq.tryMcpLink}
              </Link>
            </p>
          </div>
        </section>

        {/* Section 3 — Quiz questions */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6 pb-2 border-b border-zinc-800">
            {faq.sectionQuiz}
          </h2>
          <p className="text-sm text-zinc-500 mb-8">{faq.quizIntro}</p>

          {CATEGORY_ORDER.map((cat) => {
            const qs = groupedQuiz[cat]
            if (!qs) return null
            return (
              <div key={cat} className="mb-8">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                  {catLabels[cat]}
                </h3>
                <div className="space-y-5">
                  {qs.map((item, i) => (
                    <article key={i} className="border-l-2 border-indigo-500/30 pl-4">
                      <h4 className="text-base font-medium text-zinc-200 mb-1">{item.q}</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        <span className="text-emerald-400 font-medium">{item.answer}</span>
                        {' : '}
                        {item.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="mt-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm text-zinc-400">
              {faq.tryQuiz}{' '}
              <Link
                href="/quiz"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                {faq.tryQuizLink}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
