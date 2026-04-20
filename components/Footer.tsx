'use client'

import Link from 'next/link'
import { useLocale } from '@/components/LocaleProvider'

export function Footer() {
  const { t } = useLocale()
  const f = t.footer

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950/80 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          {/* Colonne 1 — Produit */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              {f.product}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/quiz" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {f.quiz}
                </Link>
              </li>
              <li>
                <Link href="/mcp-search" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {f.mcpSearch}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {f.faq}
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 2 — Ressources */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              {f.resources}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://docs.anthropic.com/en/docs/claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {f.docsClaude}
                </a>
              </li>
              <li>
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {f.mcpProtocol}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/anthropics/claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {f.githubClaude}
                </a>
              </li>
            </ul>
          </div>

          {/* Colonne 3 — Projet */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              {f.about}
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {f.aboutDesc}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-600">
            {f.copyright}
          </p>
          <p className="text-xs text-zinc-700">
            {f.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  )
}
