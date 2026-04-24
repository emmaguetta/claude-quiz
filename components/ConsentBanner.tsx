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
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950/95 p-4 shadow-xl backdrop-blur md:left-auto md:right-4"
    >
      <p className="mb-3 text-sm text-zinc-200">
        Nous utilisons Google Analytics pour mesurer l&apos;audience du site et améliorer votre expérience. Vos données sont anonymisées.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => handle('granted')}>
          Accepter
        </Button>
        <Button size="sm" variant="outline" onClick={() => handle('denied')}>
          Refuser
        </Button>
      </div>
    </div>
  )
}
