/**
 * Traduit les learn_more du français vers l'anglais.
 * Match les questions FR ↔ EN par similarité de la question elle-même.
 * Pour chaque question FR, on trouve la question EN la plus proche,
 * on traduit le learn_more FR et on update l'EN.
 * Run: npm run translate-learn-more
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Q = { id: string; question: string; learn_more: string | null; category: string }

// Normalise pour la comparaison (minuscules, sans ponctuation)
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9àâéèêëîïôùûüç\s]/g, '').replace(/\s+/g, ' ').trim()
}

// Similarité Jaccard basée sur mots communs
function jaccard(a: string, b: string): number {
  const setA = new Set(normalize(a).split(' '))
  const setB = new Set(normalize(b).split(' '))
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

const Schema = z.object({
  pairs: z.array(z.object({
    en_id: z.string(),
    learn_more_en: z.string(),
  })),
})

async function main() {
  const { data: frQ, error: frErr } = await supabase
    .from('questions')
    .select('id, question, learn_more, category')
    .eq('active', true).eq('lang', 'fr')

  const { data: enQ, error: enErr } = await supabase
    .from('questions')
    .select('id, question, learn_more, category')
    .eq('active', true).eq('lang', 'en')

  if (frErr || !frQ || enErr || !enQ) { console.error('Erreur:', frErr || enErr); return }
  console.log(`${frQ.length} FR ↔ ${enQ.length} EN\n`)

  // Pour chaque FR, on va demander à GPT-4o-mini de traduire son learn_more
  // et on matche avec l'EN via similarité de question (normalisée par catégorie)
  const pairs: { fr: Q; en: Q }[] = []
  const usedEnIds = new Set<string>()

  for (const fr of frQ as Q[]) {
    if (!fr.learn_more || fr.learn_more.length < 20) continue

    // Chercher l'EN la plus proche dans la même catégorie
    const candidates = (enQ as Q[]).filter(e => e.category === fr.category && !usedEnIds.has(e.id))
    if (candidates.length === 0) continue

    let best: Q | null = null
    let bestScore = -1
    for (const en of candidates) {
      // On utilise la question comme clé : normaliser les deux et comparer
      // Les termes techniques (claude, mcp, etc.) resteront communs
      const score = jaccard(fr.question, en.question)
      if (score > bestScore) { bestScore = score; best = en }
    }

    if (best && bestScore > 0.05) {
      pairs.push({ fr, en: best })
      usedEnIds.add(best.id)
    }
  }

  console.log(`${pairs.length} paires FR↔EN trouvées.\n`)

  let done = 0, errors = 0

  for (let i = 0; i < pairs.length; i += 5) {
    const batch = pairs.slice(i, i + 5)
    const batchNum = Math.floor(i / 5) + 1
    const totalBatches = Math.ceil(pairs.length / 5)
    process.stdout.write(`[${batchNum}/${totalBatches}] `)

    const text = batch.map((p, idx) =>
      `#${idx + 1} [en_id: ${p.en.id}]
EN question: ${p.en.question}
FR learn_more (à traduire, max 100 mots) : ${p.fr.learn_more}`
    ).join('\n\n')

    try {
      const { experimental_output } = await generateText({
        model: openai('gpt-4o-mini'),
        experimental_output: Output.object({ schema: Schema }),
        system: `You translate Claude Code quiz "learn more" sections from French to English.

STRICT RULES:
1. LENGTH: maximum 100 words. Keep it concise.
2. STYLE: natural, idiomatic English (not word-for-word).
3. GOAL: a beginner must understand AND know how to apply the information.
4. TECHNICAL TERMS: keep command names, flags, file names as-is (claude mcp add, --scope, .mcp.json, etc.).
5. TONE: direct, accessible, no unexplained jargon.
6. NO multiple paragraphs. One short block.
7. Return the English version in learn_more_en with matching en_id.`,
        prompt: `Translate these ${batch.length} learn_more sections from French to English:\n\n${text}`,
      })

      for (const result of experimental_output.pairs) {
        if (result.learn_more_en.length < 20) continue
        const words = result.learn_more_en.split(/\s+/)
        const final = words.length > 110 ? words.slice(0, 100).join(' ') + '…' : result.learn_more_en

        const { error: updateErr } = await supabase
          .from('questions').update({ learn_more: final }).eq('id', result.en_id)

        if (updateErr) { process.stdout.write('✗'); errors++ }
        else { process.stdout.write('✓'); done++ }
      }
      console.log()
    } catch (err) {
      console.log(`✗ Erreur batch: ${err}`)
      errors++
    }
  }

  console.log(`\n✓ ${done} traduit(s), ✗ ${errors} erreur(s)`)
  const unmatched = frQ.length - pairs.length
  if (unmatched > 0) console.log(`⚠ ${unmatched} questions FR non matchées`)
}

main()
