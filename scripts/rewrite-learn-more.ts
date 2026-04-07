/**
 * Réécrit TOUS les learn_more : concis (<100 mots) mais didactiques.
 * Un débutant doit comprendre + savoir comment l'utiliser.
 * Run: npm run rewrite-learn-more [fr|en]
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
    learn_more: z.string(),
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
  console.log(`${questions.length} questions (${LANG}) à réécrire.\n`)

  let done = 0, errors = 0

  for (let i = 0; i < questions.length; i += 5) {
    const batch = questions.slice(i, i + 5)
    const batchNum = Math.floor(i / 5) + 1
    const totalBatches = Math.ceil(questions.length / 5)
    process.stdout.write(`[${batchNum}/${totalBatches}] `)

    const questionsText = batch.map((q, idx) => {
      const correct = q.options[q.correct_idx]
      return `#${idx + 1} [id: ${q.id}] [cat: ${q.category}]
Q: ${q.question}
Réponse: ${correct}
Explication: ${q.explanation}`
    }).join('\n\n')

    const systemPrompt = LANG === 'fr' ? `Tu écris des sections "En savoir plus" pédagogiques pour un quiz Claude Code.

RÈGLES STRICTES :
1. LONGUEUR : environ 150 mots. Toujours DEUX paragraphes séparés par un saut de ligne.
2. LANGUE : FRANÇAIS. Les termes techniques (commandes, flags, fichiers) restent en anglais.
3. OBJECTIF : un débutant doit (a) comprendre tous les termes de la question, (b) savoir comment utiliser l'information concrètement.
4. STRUCTURE — TOUJOURS 2 PARAGRAPHES :
   - Paragraphe 1 : CONTEXTE et DÉFINITIONS. Rappelle ce que sont les concepts mentionnés dans la question. Si on parle de "scope project", explique ce qu'est un scope et quels scopes existent. Si on parle d'un flag, explique dans quel contexte il s'utilise. Si on parle de MCP, rappelle rapidement ce que c'est. Ne suppose jamais que le lecteur connaît déjà les termes.
   - Paragraphe 2 : UTILISATION PRATIQUE. Donne un exemple concret (commande à taper, fichier à créer, workflow). Le lecteur doit pouvoir agir après avoir lu. Mentionne les confusions fréquentes ou nuances importantes.
5. TON : direct, accessible, comme un tuteur.
6. NE PAS répéter l'explication mot pour mot.` : `You write pedagogical "Learn more" sections for a Claude Code quiz.

STRICT RULES:
1. LENGTH: approximately 150 words. Always TWO paragraphs separated by a newline.
2. LANGUAGE: ENGLISH. Technical terms (commands, flags, files) stay as-is.
3. GOAL: a beginner must (a) understand all terms in the question, (b) know how to apply the information practically.
4. STRUCTURE — ALWAYS 2 PARAGRAPHS:
   - Paragraph 1: CONTEXT and DEFINITIONS. Explain the concepts mentioned in the question. If it mentions "scope project", explain what a scope is and what scopes exist. If it mentions a flag, explain in what context it's used. If it mentions MCP, briefly explain what it is. Never assume the reader knows the terms.
   - Paragraph 2: PRACTICAL USAGE. Give a concrete example (command to type, file to create, workflow). The reader must be able to act after reading. Mention common confusions or important nuances.
5. TONE: direct, accessible, like a tutor.
6. DO NOT repeat the explanation word-for-word.`

    try {
      const { experimental_output } = await generateText({
        model: openai('gpt-4o-mini'),
        experimental_output: Output.object({ schema: Schema }),
        system: systemPrompt,
        prompt: `Écris un learn_more court et didactique pour chacune de ces ${batch.length} questions :\n\n${questionsText}`,
      })

      const ids = batch.map(q => q.id)
      for (const result of experimental_output.results) {
        if (!ids.includes(result.id)) continue
        if (result.learn_more.length < 20) continue

        // Truncate if > 200 words (safety net)
        const words = result.learn_more.split(/\s+/)
        const text = words.length > 200 ? words.slice(0, 180).join(' ') + '…' : result.learn_more

        const { error: updateErr } = await supabase
          .from('questions')
          .update({ learn_more: text })
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

  console.log(`\n✓ ${done} réécrit(s), ✗ ${errors} erreur(s)`)
}

main()
