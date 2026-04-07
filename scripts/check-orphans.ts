/**
 * Trouve les questions EN qui n'ont pas d'équivalent FR (orphelines).
 * Run: npx tsx scripts/check-orphans.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9àâéèêëîïôùûüç\s]/g, '').replace(/\s+/g, ' ').trim()
}
function jaccard(a: string, b: string): number {
  const setA = new Set(normalize(a).split(' '))
  const setB = new Set(normalize(b).split(' '))
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

async function main() {
  const { data: frQ } = await supabase
    .from('questions').select('id, question, category').eq('active', true).eq('lang', 'fr')
  const { data: enQ } = await supabase
    .from('questions').select('id, question, category').eq('active', true).eq('lang', 'en')

  if (!frQ || !enQ) return
  console.log(`${frQ.length} FR, ${enQ.length} EN\n`)

  // Pour chaque EN, chercher le meilleur match FR
  const usedFr = new Set<string>()
  const orphansEn: any[] = []

  for (const en of enQ as any[]) {
    const candidates = (frQ as any[]).filter(f => f.category === en.category && !usedFr.has(f.id))
    if (candidates.length === 0) { orphansEn.push(en); continue }

    let best: any = null, bestScore = -1
    for (const fr of candidates) {
      const s = jaccard(en.question, fr.question)
      if (s > bestScore) { bestScore = s; best = fr }
    }
    if (best && bestScore > 0.05) usedFr.add(best.id)
    else orphansEn.push(en)
  }

  console.log(`${orphansEn.length} questions EN sans équivalent FR :\n`)
  orphansEn.forEach((q, i) => console.log(`${i + 1}. [${q.category}] ${q.question.slice(0, 90)}`))
}

main()
