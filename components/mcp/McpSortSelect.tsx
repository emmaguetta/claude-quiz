'use client'

import { useLocale } from '@/components/LocaleProvider'

export type SortKey = 'quality' | 'popular' | 'alphabetical'

type Props = {
  value: SortKey
  onChange: (v: SortKey) => void
}

export function McpSortSelect({ value, onChange }: Props) {
  const { locale } = useLocale()

  const labels: Record<SortKey, { fr: string; en: string }> = {
    quality: { fr: 'Qualité', en: 'Quality' },
    popular: { fr: 'Popularité', en: 'Popular' },
    alphabetical: { fr: 'Alphabétique', en: 'Alphabetical' },
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-500">
      <span className="uppercase tracking-widest">{locale === 'fr' ? 'Trier' : 'Sort'}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
      >
        {(Object.keys(labels) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {locale === 'fr' ? labels[k].fr : labels[k].en}
          </option>
        ))}
      </select>
    </label>
  )
}
