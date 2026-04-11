'use client'

import { createContext, useContext, useState } from 'react'
import { getTranslations, type Locale, type Translations } from '@/lib/i18n'

const LOCALE_COOKIE = 'claude-quiz-locale'
const LOCALE_KEY = 'claude-quiz-locale'

type LocaleContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: getTranslations('en'),
})

export function useLocale() {
  return useContext(LocaleContext)
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? 'en')

  function setLocale(l: Locale) {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_KEY, l)
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      document.documentElement.lang = l
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getTranslations(locale) }}>
      {children}
    </LocaleContext.Provider>
  )
}
