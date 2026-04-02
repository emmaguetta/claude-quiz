import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function isEnglish(text: string): boolean {
  // Simple heuristic: common English words that wouldn't appear in French
  const englishMarkers = /\b(what|which|how|when|where|does|the|is|are|can|will|you|your|use|used|using|allows|enables|provides|command|flag|option|feature|behavior|behavior|setting|keyboard|shortcut|default|current|new|file|session|mode|tool|process|allows)\b/i
  return englishMarkers.test(text)
}

type Question = {
  id: string
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  category: string
  difficulty: string
  source_url: string | null
}

async function translateQuestion(q: Question): Promise<Question> {
  const prompt = `Translate the following quiz question about Claude Code from English to French.
Keep technical terms (command names, flags, keyboard shortcuts like Ctrl+C, Escape) unchanged.
Return a JSON object with exactly these fields: question, options (array of 4 strings), explanation.

Input:
{
  "question": ${JSON.stringify(q.question)},
  "options": ${JSON.stringify(q.options)},
  "explanation": ${JSON.stringify(q.explanation)}
}

Return ONLY valid JSON, no markdown.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const translated = JSON.parse(res.choices[0].message.content!)
  return {
    ...q,
    question: translated.question,
    options: translated.options,
    explanation: translated.explanation,
  }
}

async function main() {
  const { data: questions, error } = await admin
    .from('questions')
    .select('id, question, options, correct_idx, explanation, category, difficulty, source_url')
    .eq('active', true)

  if (error) throw error

  const toTranslate = (questions as Question[]).filter(q => isEnglish(q.question) || isEnglish(q.explanation))
  console.log(`Total questions: ${questions!.length}`)
  console.log(`Questions to translate: ${toTranslate.length}`)

  let translated = 0
  for (const q of toTranslate) {
    try {
      const t = await translateQuestion(q)
      const { error: updateError } = await admin
        .from('questions')
        .update({
          question: t.question,
          options: t.options,
          explanation: t.explanation,
        })
        .eq('id', q.id)

      if (updateError) {
        console.error(`Error updating ${q.id}:`, updateError.message)
      } else {
        translated++
        console.log(`[${translated}/${toTranslate.length}] ✓ ${q.question.slice(0, 60)}...`)
      }
    } catch (e) {
      console.error(`Failed to translate question ${q.id}:`, e)
    }
  }

  console.log(`\nDone. Translated ${translated}/${toTranslate.length} questions.`)
}

main().catch(console.error)
