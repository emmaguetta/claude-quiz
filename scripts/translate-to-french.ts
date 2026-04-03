/**
 * Script de traduction — traduit les questions anglaises en français dans Supabase.
 * Run: npx tsx scripts/translate-to-french.ts
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

// Détecte si un texte est principalement en anglais
// Heuristique : cherche des mots courants anglais absents du français
function isLikelyEnglish(text: string): boolean {
  const englishMarkers = [
    /\bwhat\b/i, /\bwhich\b/i, /\bhow\b/i, /\bwhen\b/i, /\bwhere\b/i,
    /\bthe\b/i, /\bis\b/i, /\bare\b/i, /\bwas\b/i, /\bwere\b/i,
    /\bthis\b/i, /\bthat\b/i, /\bwith\b/i, /\bfrom\b/i, /\byour\b/i,
    /\byou\b/i, /\bfor\b/i, /\band\b/i, /\bbut\b/i, /\bnot\b/i,
    /\bcan\b/i, /\bwill\b/i, /\bshould\b/i, /\bwould\b/i, /\bcould\b/i,
    /\babout\b/i, /\btheir\b/i, /\bthere\b/i, /\bthen\b/i, /\bthan\b/i,
    /\bused\b/i, /\ballow\b/i, /\bfollowing\b/i, /\bbetween\b/i,
  ]
  const matches = englishMarkers.filter(re => re.test(text)).length
  // Si 3+ marqueurs anglais détectés, c'est probablement en anglais
  return matches >= 3
}

const TranslatedQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  explanation: z.string(),
})

async function translateQuestion(q: {
  question: string
  options: string[]
  explanation: string
}): Promise<z.infer<typeof TranslatedQuestionSchema>> {
  const { experimental_output } = await generateText({
    model: openai('gpt-4o-mini'),
    experimental_output: Output.object({ schema: TranslatedQuestionSchema }),
    system: `Tu es un traducteur expert anglais → français pour une application de quiz sur Claude Code.

Règles :
- Traduis la question, les 4 options et l'explication en français naturel et fluide
- Les termes techniques (noms de commandes, flags, raccourcis clavier comme Ctrl+C, noms de fichiers comme CLAUDE.md, .mcp.json) restent en anglais
- Garde le même sens et la même difficulté — ne simplifie pas
- L'explication doit rester concise (1-2 phrases)
- Ne change PAS l'ordre des options (correct_idx doit rester valide)`,
    prompt: `Traduis en français :

Question : ${q.question}

Options :
A) ${q.options[0]}
B) ${q.options[1]}
C) ${q.options[2]}
D) ${q.options[3]}

Explication : ${q.explanation}`,
  })

  return experimental_output
}

async function main() {
  console.log('Récupération des questions…')

  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('Erreur Supabase:', error.message)
    process.exit(1)
  }

  if (!questions || questions.length === 0) {
    console.log('Aucune question trouvée.')
    return
  }

  console.log(`${questions.length} questions trouvées au total.`)

  // Filtrer les questions en anglais
  const englishQuestions = questions.filter(q => isLikelyEnglish(q.question))

  if (englishQuestions.length === 0) {
    console.log('✓ Toutes les questions sont déjà en français !')
    return
  }

  console.log(`${englishQuestions.length} question(s) en anglais détectée(s). Traduction en cours…\n`)

  let translated = 0
  let errors = 0

  for (const q of englishQuestions) {
    try {
      console.log(`  ← EN: ${q.question.slice(0, 80)}…`)

      const result = await translateQuestion({
        question: q.question,
        options: q.options,
        explanation: q.explanation,
      })

      const { error: updateError } = await supabase
        .from('questions')
        .update({
          question: result.question,
          options: result.options,
          explanation: result.explanation,
        })
        .eq('id', q.id)

      if (updateError) {
        console.error(`  ✗ Erreur update (${q.id}):`, updateError.message)
        errors++
      } else {
        console.log(`  → FR: ${result.question.slice(0, 80)}…`)
        translated++
      }
    } catch (err) {
      console.error(`  ✗ Erreur traduction (${q.id}):`, err)
      errors++
    }
  }

  console.log(`\n✓ ${translated} question(s) traduite(s), ${errors} erreur(s).`)
}

main()
