/**
 * Améliore les fausses réponses (distracteurs) pour chaque question :
 * - Les rend plus plausibles et de longueur comparable à la bonne réponse
 * - Redistribue aléatoirement la position de la bonne réponse (A/B/C/D)
 * Run: npm run improve-distractors [fr|en]
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

const LANG = (process.argv[2] || 'fr') as 'fr' | 'en'

const Schema = z.object({
  results: z.array(z.object({
    id: z.string(),
    options: z.array(z.string()).length(4),
    correct_idx: z.number().min(0).max(3),
  })),
})

async function main() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, explanation, category')
    .eq('active', true)
    .eq('lang', LANG)
    .order('category')

  if (error || !questions) { console.error('Erreur:', error); return }

  console.log(`${questions.length} questions (${LANG}) à améliorer.\n`)

  let done = 0, errors = 0

  for (let i = 0; i < questions.length; i += 5) {
    const batch = questions.slice(i, i + 5)
    const batchNum = Math.floor(i / 5) + 1
    const totalBatches = Math.ceil(questions.length / 5)
    process.stdout.write(`[${batchNum}/${totalBatches}] `)

    const questionsText = batch.map((q, idx) => {
      const correct = q.options[q.correct_idx]
      const wrongs = q.options
        .map((o: string, i: number) => i !== q.correct_idx ? o : null)
        .filter(Boolean)
      return `#${idx + 1} [id: ${q.id}]
Q: ${q.question}
Correct answer: ${correct}
Current wrong answers: ${wrongs.join(' | ')}
Explanation: ${q.explanation}`
    }).join('\n\n')

    const systemPrompt = LANG === 'fr'
      ? `Tu améliores les fausses réponses d'un quiz Claude Code.

RÈGLES :
1. Garde la bonne réponse EXACTEMENT telle quelle, mot pour mot.
2. Réécris les 3 fausses réponses pour qu'elles soient :
   - PLAUSIBLES : elles doivent sembler correctes pour quelqu'un qui ne connaît pas bien le sujet
   - DE LONGUEUR SIMILAIRE à la bonne réponse (± 30%). Si la bonne réponse fait 60 caractères, les fausses doivent faire entre 40 et 80 caractères.
   - SPÉCIFIQUES : évite les réponses vagues comme "Aucune de ces réponses" ou "Ce n'est pas possible"
   - COHÉRENTES avec le domaine de la question (commandes CLI, raccourcis, concepts)
3. Place la bonne réponse à une position ALÉATOIRE parmi A/B/C/D (index 0-3). Varie entre les questions du batch.
4. correct_idx = l'index (0-3) où se trouve la bonne réponse dans le tableau options.
5. Le tableau options doit contenir exactement 4 éléments.
6. LANGUE : français pour le texte, termes techniques en anglais.`
      : `You improve the wrong answers of a Claude Code quiz.

RULES:
1. Keep the correct answer EXACTLY as-is, word for word.
2. Rewrite the 3 wrong answers so they are:
   - PLAUSIBLE: they should seem correct to someone unfamiliar with the topic
   - SIMILAR LENGTH to the correct answer (± 30%). If the correct answer is 60 chars, wrongs should be 40-80 chars.
   - SPECIFIC: avoid vague answers like "None of the above" or "This is not possible"
   - COHERENT with the question domain (CLI commands, shortcuts, concepts)
3. Place the correct answer at a RANDOM position among A/B/C/D (index 0-3). Vary across batch questions.
4. correct_idx = the index (0-3) where the correct answer sits in the options array.
5. The options array must contain exactly 4 elements.
6. LANGUAGE: English throughout, technical terms as-is.`

    const userPrompt = LANG === 'fr'
      ? `Améliore les distracteurs pour ces ${batch.length} questions :\n\n${questionsText}`
      : `Improve the distractors for these ${batch.length} questions:\n\n${questionsText}`

    try {
      const { experimental_output } = await generateText({
        model: openai('gpt-4o'),
        experimental_output: Output.object({ schema: Schema }),
        system: systemPrompt,
        prompt: userPrompt,
      })

      const ids = batch.map(q => q.id)
      for (const result of experimental_output.results) {
        if (!ids.includes(result.id)) continue
        if (result.options.length !== 4) continue

        // Verify the correct answer is preserved
        const original = batch.find(q => q.id === result.id)!
        const originalCorrect = original.options[original.correct_idx]
        if (result.options[result.correct_idx] !== originalCorrect) {
          process.stdout.write('⚠')
          errors++
          continue
        }

        const { error: updateErr } = await supabase
          .from('questions')
          .update({ options: result.options, correct_idx: result.correct_idx })
          .eq('id', result.id)

        if (updateErr) { process.stdout.write('✗'); errors++ }
        else { process.stdout.write('✓'); done++ }
      }
      console.log()
    } catch (err) {
      console.log(`✗ Erreur batch: ${err}`)
      errors++
    }
  }

  console.log(`\n✓ ${done} amélioré(s), ✗ ${errors} erreur(s)`)
}

main()
