'use client'

import { useState } from 'react'

type Props = {
  code: string
  lang?: string
  title?: string
}

export function CodeBlock({ code, lang, title }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore — clipboard not available
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      {(title || lang) && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-zinc-900 bg-zinc-900/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {title && <span className="text-zinc-300 font-mono truncate">{title}</span>}
            {lang && (
              <span className="text-zinc-600 uppercase tracking-wider shrink-0">{lang}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 ml-2"
          >
            {copied ? '✓ Copié' : 'Copier'}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
        <code className="font-mono text-zinc-200 whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}
