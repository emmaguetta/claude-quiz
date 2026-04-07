/**
 * Trouve les questions FR sans équivalent EN et crée les versions anglaises.
 * Run: npm run create-missing-en
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

type Q = {
  id: string; question: string; options: string[]; correct_idx: number
  explanation: string; learn_more: string | null; category: string
  difficulty: string; source_url: string | null; developer: boolean
}

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

const TranslateSchema = z.object({
  results: z.array(z.object({
    fr_id: z.string(),
    question: z.string(),
    options: z.array(z.string()).length(4),
    explanation: z.string(),
    learn_more: z.string(),
  })),
})

async function main() {
  const { data: frQ } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, explanation, learn_more, category, difficulty, source_url, developer')
    .eq('active', true).eq('lang', 'fr')

  const { data: enQ } = await supabase
    .from('questions')
    .select('id, question, category')
    .eq('active', true).eq('lang', 'en')

  if (!frQ || !enQ) { console.error('Erreur Supabase'); return }
  console.log(`${frQ.length} FR, ${enQ.length} EN\n`)

  // Trouver les FR non matchées (même logique que translate-learn-more)
  const usedEn = new Set<string>()
  const unmatched: Q[] = []

  for (const fr of frQ as Q[]) {
    const candidates = (enQ as any[]).filter(e => e.category === fr.category && !usedEn.has(e.id))
    if (candidates.length === 0) { unmatched.push(fr); continue }

    let best: any = null, bestScore = -1
    for (const en of candidates) {
      const s = jaccard(fr.question, en.question)
      if (s > bestScore) { bestScore = s; best = en }
    }
    if (best && bestScore > 0.05) usedEn.add(best.id)
    else unmatched.push(fr)
  }

  console.log(`${unmatched.length} questions FR sans équivalent EN :\n`)
  unmatched.forEach((q, i) => console.log(`${i + 1}. [${q.category}] ${q.question.slice(0, 80)}…`))
  console.log()

  if (unmatched.length === 0) { console.log('Rien à créer.'); return }

  let created = 0, errors = 0

  for (let i = 0; i < unmatched.length; i += 5) {
    const batch = unmatched.slice(i, i + 5)
    process.stdout.write(`[${Math.floor(i / 5) + 1}] `)

    const text = batch.map((q, idx) =>
      `#${idx + 1} [fr_id: ${q.id}]
Question FR : ${q.question}
Options FR : ${q.options.map((o, j) => `${['A','B','C','D'][j]}) ${o}`).join(' | ')}
Bonne réponse : ${q.options[q.correct_idx]}
Explication FR : ${q.explanation}
Learn more FR : ${q.learn_more}`
    ).join('\n\n')

    try {
      const { experimental_output } = await generateText({
        model: openai('gpt-4o-mini'),
        experimental_output: Output.object({ schema: TranslateSchema }),
        system: `You translate Claude Code quiz questions from French to English.

STRICT RULES:
1. Translate the question, all 4 options (in the SAME order), the explanation, and the learn_more into natural English.
2. The correct answer position (A/B/C/D) must remain at the same index. Translate options in the same order as provided.
3. Technical terms (commands, flags, file names, keyboard shortcuts) stay as-is: claude mcp add, --scope, .mcp.json, Ctrl+C, Shift+Tab, etc.
4. Keep learn_more concise: maximum 100 words, 2-3 sentences.
5. Style: natural idiomatic English, not word-for-word translation.
6. The learn_more should help a beginner (a) understand and (b) know how to use the info.
7. Return fr_id exactly as given so we can match back.`,
        prompt: `Translate these ${batch.length} French questions to English:\n\n${text}`,
      })

      for (const result of experimental_output.results) {
        const fr = unmatched.find(u => u.id === result.fr_id)
        if (!fr) continue
        if (result.options.length !== 4) continue

        const { error: insertErr } = await supabase
          .from('questions')
          .insert({
            question: result.question,
            options: result.options,
            correct_idx: fr.correct_idx,
            explanation: result.explanation,
            learn_more: result.learn_more,
            category: fr.category,
            difficulty: fr.difficulty,
            source_url: fr.source_url,
            developer: fr.developer,
            active: true,
            lang: 'en',
          })

        if (insertErr) { process.stdout.write('✗'); errors++; console.log(`\n  Error: ${insertErr.message}`) }
        else { process.stdout.write('✓'); created++ }
      }
      console.log()
    } catch (err) {
      console.log(`✗ Erreur batch: ${err}`)
      errors++
    }
  }

  console.log(`\n✓ ${created} créée(s), ✗ ${errors} erreur(s)`)
}

main()
