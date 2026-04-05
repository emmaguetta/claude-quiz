'use client'

import { useLocale } from './LocaleProvider'

export function LocaleToggle() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => setLocale('fr')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === 'fr' ? 'text-zinc-100 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        FR
      </button>
      <span className="text-zinc-700">|</span>
      <button
        onClick={() => setLocale('en')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === 'en' ? 'text-zinc-100 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        EN
      </button>
    </div>
  )
}
