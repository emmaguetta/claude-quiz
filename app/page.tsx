'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'
import { createClient } from '@/lib/supabase/client'
import LightRays from '@/components/LightRays'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { locale, t } = useLocale()
  const [count, setCount] = useState(0)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Fetch question count for current locale
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('lang', locale)
      .then(({ count }) => {
        setCount(count ?? 0)
      })

    // Check onboarded status if logged in
    if (user) {
      supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setIsOnboarded(data?.onboarded ?? false)
        })
    }
  }, [user, locale])

  const ctaHref = user ? (isOnboarded ? '/quiz' : '/onboarding') : '/login'

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Locale toggle */}
      <div className="absolute top-6 right-6 z-20">
        <LocaleToggle />
      </div>

      {/* Grain overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='6' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.05,
        }}
      />

      {/* Light Rays background */}
      <div className="absolute inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={0.8}
          lightSpread={0.8}
          rayLength={2}
          fadeDistance={0.8}
          saturation={0.5}
          followMouse={true}
          mouseInfluence={0.12}
        />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-10">
        {/* Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-sm px-4 py-1.5">
            {t.home.badge}
          </Badge>
        </div>

        {/* Hero */}
        <div className="space-y-5">
          <h1 className="text-6xl uppercase text-zinc-50" style={{ fontFamily: "'Bitcount Single Ink', 'Jersey 10', cursive" }}>
            <span className="block">{t.home.title}</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              Claude Code
            </span>
          </h1>
          <p className="text-zinc-400 text-xl leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link href={ctaHref}>
            <Button
              size="lg"
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-semibold px-10 py-7 text-lg"
            >
              {t.home.cta}
            </Button>
          </Link>
          {count > 0 && (
            <p className="text-sm text-zinc-600">{t.home.questionsAvailable(count)}</p>
          )}
        </div>

        {/* Topics */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {t.home.topics.map((topic) => (
            <span
              key={topic}
              className="text-sm px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-500"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
