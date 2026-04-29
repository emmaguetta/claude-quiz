'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'
const COMMAND = `claude mcp add --transport http mcp-search ${SITE_URL}/api/mcp`

export function OneLineInstall() {
  const { t } = useLocale()
  const m = t.mcpSearch
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-zinc-900/40 to-zinc-900/40 p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="md:w-64 shrink-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
              {m.oneLineTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {m.oneLineHint}
          </p>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-stretch rounded-lg border border-zinc-800 bg-zinc-950/80 overflow-hidden">
            <pre className="flex-1 min-w-0 overflow-x-auto px-3 sm:px-4 py-2.5 text-xs sm:text-sm leading-relaxed">
              <code className="font-mono text-zinc-200 whitespace-pre">{COMMAND}</code>
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 px-3 sm:px-4 text-xs font-medium text-zinc-400 hover:text-amber-200 hover:bg-amber-500/10 border-l border-zinc-800 transition-colors"
            >
              {copied ? m.oneLineCopied : m.oneLineCopy}
            </button>
          </div>
          <Link
            href="/mcp-search/guide"
            className="inline-block text-xs text-amber-300/80 hover:text-amber-200 transition-colors"
          >
            {m.oneLineGuideLink}
          </Link>
        </div>
      </div>
    </div>
  )
}
