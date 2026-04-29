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
import { OneLineInstall } from '@/components/mcp/OneLineInstall'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { locale, t } = useLocale()
  const [count, setCount] = useState(0)
  const [mcpCount, setMcpCount] = useState(0)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('lang', locale)
      .then(({ count }) => {
        setCount(count ?? 0)
      })

    fetch('/api/mcp/categories')
      .then(r => r.json())
      .then(data => setMcpCount(data.total ?? 0))
      .catch(() => {})

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

      <div className="relative z-10 w-full max-w-5xl text-center space-y-12">
        {/* Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-sm px-4 py-1.5">
            {t.home.badge}
          </Badge>
        </div>

        {/* Hero title */}
        <h1 className="text-6xl uppercase text-zinc-50" style={{ fontFamily: "'Bitcount Single Ink', 'Jersey 10', cursive" }}>
          <span className="block">{t.home.title}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            Claude Code
          </span>
        </h1>

        {/* Three cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">

          {/* Quiz card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧠</span>
                <h2 className="text-xl font-semibold text-zinc-100">{t.home.quizTitle}</h2>
              </div>
              <p className="text-zinc-400 leading-relaxed">{t.home.subtitle}</p>
              {count > 0 && (
                <p className="text-sm text-zinc-600">{t.home.questionsAvailable(count)}</p>
              )}
            </div>

            <Link href={ctaHref}>
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 font-semibold py-6 text-base">
                {t.home.cta}
              </Button>
            </Link>
          </div>

          {/* MCP catalog card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔌</span>
                <h2 className="text-xl font-semibold text-zinc-100">{t.home.mcpTitle}</h2>
              </div>
              <p className="text-zinc-400 leading-relaxed">{t.home.mcpDesc}</p>
              {mcpCount > 0 && (
                <p className="text-sm text-zinc-600">{t.home.mcpsAvailable(mcpCount)}</p>
              )}
            </div>

            <Link href="/mcp-search">
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 font-semibold py-6 text-base">
                {t.mcpSearch.homeCta}
              </Button>
            </Link>
          </div>

          {/* MCP server card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-semibold text-zinc-100">{t.home.mcpServerTitle}</h2>
              </div>
              <p className="text-zinc-400 leading-relaxed">{t.home.mcpServerDesc}</p>
              <p className="text-sm text-zinc-600">{t.home.mcpServerFreeUses}</p>
            </div>

            <Link href="/mcp-search/guide">
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 font-semibold py-6 text-base">
                {t.home.mcpServerCta}
              </Button>
            </Link>
          </div>

        </div>

        <OneLineInstall />
      </div>
    </main>
  )
}
