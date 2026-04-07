/**
 * Désactive les questions EN qui n'ont pas d'équivalent FR (orphelines).
 * Run: npx tsx scripts/disable-en-orphans.ts
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

  // Pour chaque EN, chercher le meilleur match FR (greedy)
  const usedFr = new Set<string>()
  const orphanIds: string[] = []

  for (const en of enQ as any[]) {
    const candidates = (frQ as any[]).filter(f => f.category === en.category && !usedFr.has(f.id))
    if (candidates.length === 0) { orphanIds.push(en.id); continue }

    let best: any = null, bestScore = -1
    for (const fr of candidates) {
      const s = jaccard(en.question, fr.question)
      if (s > bestScore) { bestScore = s; best = fr }
    }
    if (best && bestScore > 0.05) usedFr.add(best.id)
    else orphanIds.push(en.id)
  }

  console.log(`${orphanIds.length} questions EN à désactiver`)

  const { error } = await supabase
    .from('questions').update({ active: false }).in('id', orphanIds)

  if (error) { console.error('Erreur:', error); return }

  // Vérification
  const { count: frCount } = await supabase
    .from('questions').select('*', { count: 'exact', head: true })
    .eq('active', true).eq('lang', 'fr')
  const { count: enCount } = await supabase
    .from('questions').select('*', { count: 'exact', head: true })
    .eq('active', true).eq('lang', 'en')

  console.log(`\n✓ Après désactivation : ${frCount} FR / ${enCount} EN`)
}

main()
