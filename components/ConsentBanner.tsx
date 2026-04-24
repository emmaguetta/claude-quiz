'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getStoredConsent, setConsent } from '@/lib/analytics'

export function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true)
  }, [])

  if (!visible) return null

  const handle = (choice: 'granted' | 'denied') => {
    setConsent(choice)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🍪</span>
          <div className="space-y-1 text-sm text-zinc-300">
            <p className="font-semibold text-zinc-100">Nous respectons votre vie privée</p>
            <p className="leading-relaxed">
              Nous utilisons des cookies pour mesurer l&apos;audience du site (Google Analytics) et améliorer votre expérience.
              Vous pouvez accepter ou refuser à tout moment. Vos données sont anonymisées.
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2 md:gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handle('denied')}
            className="flex-1 md:flex-none"
          >
            Refuser
          </Button>
          <Button
            size="sm"
            onClick={() => handle('granted')}
            className="flex-1 md:flex-none"
          >
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  )
}
