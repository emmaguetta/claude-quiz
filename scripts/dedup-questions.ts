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
  return intersection / union
}

async function main() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, category, difficulty, learn_more')
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error || !questions) {
    console.error('Erreur:', error)
    return
  }

  console.log(`${questions.length} questions actives.\n`)

  // Group duplicates: for each question, find others with Jaccard >= 0.5
  const toDisable: Set<string> = new Set()
  const clusters: { kept: typeof questions[0]; dupes: typeof questions[0][] }[] = []

  for (let i = 0; i < questions.length; i++) {
    if (toDisable.has(questions[i].id)) continue

    const dupes: typeof questions[0][] = []
    for (let j = i + 1; j < questions.length; j++) {
      if (toDisable.has(questions[j].id)) continue
      const sim = jaccard(questions[i].question, questions[j].question)
      if (sim >= 0.5) {
        dupes.push(questions[j])
        toDisable.add(questions[j].id)
      }
    }

    if (dupes.length > 0) {
      // Keep the one with learn_more, or the first one
      const all = [questions[i], ...dupes]
      const best = all.find(q => q.learn_more) || all[0]
      const rest = all.filter(q => q.id !== best.id)

      // Make sure the "best" is not in toDisable, and the rest are
      toDisable.delete(best.id)
      rest.forEach(q => toDisable.add(q.id))

      clusters.push({ kept: best, dupes: rest })
    }
  }

  if (clusters.length === 0) {
    console.log('Aucun doublon détecté !')
    return
  }

  console.log(`${clusters.length} groupe(s) de doublons trouvé(s), ${toDisable.size} question(s) à désactiver :\n`)

  for (const { kept, dupes } of clusters) {
    console.log(`  ✓ GARDÉE: ${kept.question.slice(0, 80)}…`)
    for (const d of dupes) {
      const sim = jaccard(kept.question, d.question)
      console.log(`    ✗ doublon (${(sim * 100).toFixed(0)}%): ${d.question.slice(0, 70)}…`)
    }
    console.log()
  }

  // Disable duplicates
  const ids = [...toDisable]
  const { error: updateError } = await supabase
    .from('questions')
    .update({ active: false })
    .in('id', ids)

  if (updateError) {
    console.error('Erreur lors de la désactivation:', updateError)
  } else {
    console.log(`✓ ${ids.length} doublon(s) désactivé(s).`)
  }
}

main()
