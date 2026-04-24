'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/components/LocaleProvider'

export type SortKey = 'quality' | 'popular' | 'alphabetical'

type Props = {
  value: SortKey
  onChange: (v: SortKey) => void
}

export function McpSortSelect({ value, onChange }: Props) {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const labels: Record<SortKey, { fr: string; en: string }> = {
    quality: { fr: 'Qualité', en: 'Quality' },
    popular: { fr: 'Popularité', en: 'Popular' },
    alphabetical: { fr: 'Alphabétique', en: 'Alphabetical' },
  }

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const currentLabel = locale === 'fr' ? labels[value].fr : labels[value].en
  const sortLabel = locale === 'fr' ? 'Trier' : 'Sort'

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-zinc-500">{sortLabel}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-sm text-zinc-300 hover:border-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
      >
        <span>{currentLabel}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 mt-1 z-40 min-w-[10rem] rounded-md border border-zinc-800 bg-zinc-900 shadow-lg py-1"
        >
          {(Object.keys(labels) as SortKey[]).map((k) => {
            const selected = k === value
            return (
              <li key={k}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    selected ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  {locale === 'fr' ? labels[k].fr : labels[k].en}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
