/**
 * Backfill — génère le champ learn_more pour les questions qui n'en ont pas.
 * Run: npx tsx scripts/backfill-learn-more.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY in .env.local
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const LearnMoreSchema = z.object({
  learn_more: z.string(),
})

async function generateLearnMore(q: {
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  category: string
}): Promise<string> {
  const { experimental_output } = await generateText({
    model: openai('gpt-4o-mini'),
    experimental_output: Output.object({ schema: LearnMoreSchema }),
    system: `Tu es un formateur expert en Claude Code. On te donne une question de quiz et sa réponse.
Rédige un paragraphe pédagogique "En savoir plus" (4-6 phrases) en FRANÇAIS qui :
- Définit clairement le concept ou la fonctionnalité abordée
- Explique à quoi ça sert concrètement
- Donne un exemple d'utilisation si pertinent (commande, raccourci, workflow)
- Aide quelqu'un qui découvre le sujet à bien comprendre

Les termes techniques (commandes, flags, raccourcis, noms de fichiers) restent en anglais.
Le ton est accessible et pédagogique, comme un mini-cours.`,
    prompt: `Question : ${q.question}
Bonne réponse : ${q.options[q.correct_idx]}
Explication courte : ${q.explanation}
Catégorie : ${q.category}`,
  })

  return experimental_output.learn_more
}

async function main() {
  console.log('Récupération des questions sans learn_more…')

  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)
    .is('learn_more', null)

  if (error) {
    console.error('Erreur Supabase:', error.message)
    process.exit(1)
  }

  if (!questions || questions.length === 0) {
    console.log('✓ Toutes les questions ont déjà un learn_more !')
    return
  }

  console.log(`${questions.length} question(s) à traiter.\n`)

  let done = 0
  let errors = 0

  for (const q of questions) {
    try {
      process.stdout.write(`  [${done + 1}/${questions.length}] ${q.question.slice(0, 60)}… `)

      const learnMore = await generateLearnMore({
        question: q.question,
        options: q.options,
        correct_idx: q.correct_idx,
        explanation: q.explanation,
        category: q.category,
      })

      const { error: updateError } = await supabase
        .from('questions')
        .update({ learn_more: learnMore })
        .eq('id', q.id)

      if (updateError) {
        console.log('✗')
        console.error(`    Erreur update:`, updateError.message)
        errors++
      } else {
        console.log('✓')
        done++
      }
    } catch (err) {
      console.log('✗')
      console.error(`    Erreur:`, err)
      errors++
    }
  }

  console.log(`\n✓ ${done} question(s) enrichie(s), ${errors} erreur(s).`)
}

main()
