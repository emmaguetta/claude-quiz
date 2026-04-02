import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import LightRays from '@/components/LightRays'

async function getQuestionCount(): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  return count ?? 0
}

export default async function Home() {
  const count = await getQuestionCount().catch(() => 0)

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Grain overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.06,
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
            Claude Code · Quiz interactif
          </Badge>
        </div>

        {/* Hero */}
        <div className="space-y-5">
          <h1 className="text-6xl font-bold tracking-tight text-zinc-50">
            Maîtrise{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Claude Code
            </span>
          </h1>
          <p className="text-zinc-400 text-xl leading-relaxed">
            Apprends les commandes, raccourcis, et concepts clés à travers de courts quiz
            basés sur la documentation officielle.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/quiz">
            <Button
              size="lg"
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-semibold px-10 py-7 text-lg"
            >
              Commencer le quiz →
            </Button>
          </Link>
          {count > 0 && (
            <p className="text-sm text-zinc-600">{count} questions disponibles</p>
          )}
        </div>

        {/* Topics */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {['Commandes', 'Raccourcis', 'MCP', 'Workflow', 'Concepts'].map((topic) => (
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
