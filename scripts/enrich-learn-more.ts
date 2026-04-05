/**
 * Régénère TOUS les learn_more pour qu'ils soient des mini-cours détaillés.
 * 3-4 paragraphes, rappel des termes, exemples concrets, nuances.
 * Génère en français puis en anglais.
 * Run: npm run enrich-learn-more
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

const EnrichSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    learn_more: z.string(),
  })),
})

type Question = {
  id: string; question: string; options: string[]; correct_idx: number
  explanation: string; category: string
}

async function main() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, explanation, category')
    .eq('active', true)
    .eq('lang', LANG)
    .order('category')

  if (error || !questions) { console.error('Erreur:', error); return }
  console.log(`${questions.length} questions (${LANG}) à enrichir.\n`)

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
Bonne réponse: ${correct}
Explication courte: ${q.explanation}`
    }).join('\n\n')

    const langInstructions = LANG === 'fr'
      ? `Rédige ENTIÈREMENT en FRANÇAIS. Les termes techniques (noms de commandes, flags, fichiers) restent en anglais.`
      : `Write ENTIRELY in ENGLISH. Technical terms (command names, flags, files) stay as-is.`

    try {
      const { experimental_output } = await generateText({
        model: openai('gpt-4o-mini'),
        experimental_output: Output.object({ schema: EnrichSchema }),
        system: `Tu es un pédagogue expert de Claude Code. Tu écris des sections "En savoir plus" pour un quiz d'apprentissage.

${langInstructions}

RÈGLES STRICTES pour chaque learn_more :

1. LONGUEUR : 3 à 4 paragraphes substantiels (pas des phrases isolées). Minimum 150 mots, maximum 300 mots.

2. STRUCTURE :
   - Paragraphe 1 : RAPPEL DES BASES. Redéfinir clairement chaque concept/terme mentionné dans la question. Même si ça semble évident, rappeler ce que c'est. Par exemple, si la question parle d'une "skill", commencer par rappeler ce qu'est une skill dans Claude Code.
   - Paragraphe 2 : EXPLICATION EN PROFONDEUR. Comment ça fonctionne concrètement, avec des exemples concrets (commandes, fichiers, workflow). Donner au moins un exemple d'utilisation réel.
   - Paragraphe 3 : NUANCES ET CONFUSIONS FRÉQUENTES. Expliquer ce avec quoi on pourrait confondre, les pièges courants, et les distinctions importantes. Par exemple : "Ne confondez pas X avec Y qui fait Z."
   - Paragraphe 4 (optionnel) : CONSEIL PRATIQUE ou cas d'usage avancé.

3. TON : Accessible, comme un tuteur qui explique à un collègue. Pas de jargon non expliqué. Chaque terme technique est défini la première fois qu'il apparaît.

4. EXEMPLES : Inclure au moins un exemple concret (commande, fichier, workflow).

5. NE PAS répéter la question ni l'explication courte mot pour mot. Apporter de la VALEUR AJOUTÉE.`,
        prompt: `Écris un learn_more détaillé pour chacune de ces ${batch.length} questions :\n\n${questionsText}`,
      })

      const ids = batch.map(q => q.id)
      for (const result of experimental_output.results) {
        if (!ids.includes(result.id)) continue
        if (result.learn_more.length < 100) continue // skip if too short

        const { error: updateErr } = await supabase
          .from('questions')
          .update({ learn_more: result.learn_more })
          .eq('id', result.id)

        if (updateErr) {
          process.stdout.write('✗')
          errors++
        } else {
          process.stdout.write('✓')
          done++
        }
      }
      console.log()
    } catch (err) {
      console.log(`✗ Erreur batch: ${err}`)
      errors++
    }
  }

  console.log(`\n✓ ${done} enrichi(s), ✗ ${errors} erreur(s)`)
}

main()
