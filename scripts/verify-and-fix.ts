/**
 * Vérifie toutes les questions actives contre la doc officielle Claude Code.
 * Corrige ou désactive les questions incorrectes.
 * Run: npm run verify
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

// --- Doc URLs grouped by topic ---
const DOC_GROUPS: Record<string, string[]> = {
  commands: [
    'https://code.claude.com/docs/en/cli-reference.md',
    'https://code.claude.com/docs/en/commands.md',
    'https://code.claude.com/docs/en/interactive-mode.md',
  ],
  shortcuts: [
    'https://code.claude.com/docs/en/keybindings.md',
    'https://code.claude.com/docs/en/interactive-mode.md',
  ],
  concepts: [
    'https://code.claude.com/docs/en/overview.md',
    'https://code.claude.com/docs/en/how-claude-code-works.md',
    'https://code.claude.com/docs/en/memory.md',
    'https://code.claude.com/docs/en/settings.md',
    'https://code.claude.com/docs/en/permissions.md',
    'https://code.claude.com/docs/en/permission-modes.md',
    'https://code.claude.com/docs/en/context-window.md',
    'https://code.claude.com/docs/en/security.md',
  ],
  mcp: [
    'https://code.claude.com/docs/en/mcp.md',
  ],
  workflow: [
    'https://code.claude.com/docs/en/common-workflows.md',
    'https://code.claude.com/docs/en/best-practices.md',
    'https://code.claude.com/docs/en/hooks.md',
    'https://code.claude.com/docs/en/hooks-guide.md',
    'https://code.claude.com/docs/en/sub-agents.md',
    'https://code.claude.com/docs/en/github-actions.md',
    'https://code.claude.com/docs/en/headless.md',
  ],
}

// --- Fetch doc content ---
async function fetchDoc(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'claude-quiz-verify/1.0' },
    })
    if (!res.ok) return ''
    const text = await res.text()
    // For markdown pages, use directly (generous limit for verification)
    if (url.endsWith('.md')) return text.slice(0, 20000)
    // HTML: strip tags
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20000)
  } catch {
    return ''
  }
}

// --- Zod schema for verification output ---
const VerifySchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    action: z.enum(['ok', 'fix', 'disable']),
    reason: z.string(),
    correct_idx: z.number().int().min(-1).max(3), // -1 = pas de changement
    options: z.array(z.string()), // vide = pas de changement
    explanation: z.string(), // vide = pas de changement
  })),
})

type Question = {
  id: string
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  category: string
}

async function main() {
  // 1. Fetch all docs grouped by topic
  console.log('Chargement de la documentation…')
  const docCache: Record<string, string> = {}
  const allUrls = new Set(Object.values(DOC_GROUPS).flat())
  const fetches = [...allUrls].map(async url => {
    docCache[url] = await fetchDoc(url)
  })
  await Promise.all(fetches)
  const loadedCount = Object.values(docCache).filter(Boolean).length
  console.log(`${loadedCount}/${allUrls.size} pages chargées.\n`)

  // Build combined doc per category
  const docByCategory: Record<string, string> = {}
  for (const [cat, urls] of Object.entries(DOC_GROUPS)) {
    docByCategory[cat] = urls
      .map(u => docCache[u])
      .filter(Boolean)
      .join('\n\n---\n\n')
  }

  // 2. Load all active questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, explanation, category')
    .eq('active', true)
    .order('category')

  if (error || !questions) {
    console.error('Erreur Supabase:', error)
    return
  }
  console.log(`${questions.length} questions actives à vérifier.\n`)

  // 3. Group questions by category
  const grouped: Record<string, Question[]> = {}
  for (const q of questions) {
    if (!grouped[q.category]) grouped[q.category] = []
    grouped[q.category].push(q)
  }

  // 4. Verify each category
  let totalOk = 0, totalFixed = 0, totalDisabled = 0, totalErrors = 0

  for (const [category, catQuestions] of Object.entries(grouped)) {
    const doc = docByCategory[category] || ''
    if (!doc) {
      console.log(`⚠ Pas de doc pour la catégorie "${category}", skip.`)
      continue
    }

    // Process in batches of 10
    for (let i = 0; i < catQuestions.length; i += 10) {
      const batch = catQuestions.slice(i, i + 10)
      const batchNum = Math.floor(i / 10) + 1
      const totalBatches = Math.ceil(catQuestions.length / 10)
      console.log(`[${category}] Batch ${batchNum}/${totalBatches} (${batch.length} questions)…`)

      const questionsText = batch.map((q, idx) => {
        const opts = q.options.map((o: string, j: number) =>
          `  ${j === q.correct_idx ? '→' : ' '} ${['A', 'B', 'C', 'D'][j]}) ${o}`
        ).join('\n')
        return `#${idx + 1} [id: ${q.id}]\nQ: ${q.question}\n${opts}\nExplication: ${q.explanation}`
      }).join('\n\n')

      try {
        const { experimental_output } = await generateText({
          model: openai('gpt-4o-mini'),
          experimental_output: Output.object({ schema: VerifySchema }),
          system: `Tu es un expert Claude Code. Tu vérifies des questions de quiz en les comparant à la documentation officielle fournie.

DOCUMENTATION OFFICIELLE (source de vérité) :
${doc}

INSTRUCTIONS :
Pour chaque question, vérifie :
1. La commande/flag/raccourci/concept mentionné existe-t-il RÉELLEMENT dans la doc ?
2. La réponse marquée comme correcte (→) est-elle vraiment la bonne ?
3. L'explication est-elle factuellemnt correcte ?

Actions possibles :
- "ok" : la question est correcte, rien à changer. Mets correct_idx à -1, options à [], explanation à "".
- "fix" : la question a une erreur corrigeable. Mets le bon correct_idx (0-3), et/ou les options corrigées (tableau de 4), et/ou l'explication corrigée. Si un champ n'a pas besoin de correction : correct_idx=-1, options=[], explanation="".
- "disable" : la question est basée sur quelque chose qui n'existe pas dans la doc. Mets correct_idx à -1, options à [], explanation à "".

IMPORTANT :
- Si tu n'es pas SÛR qu'une commande/flag existe dans la doc fournie, marque "disable"
- Si la bonne réponse est dans les options mais au mauvais index, corrige le correct_idx
- Les options doivent rester en français (sauf termes techniques)
- Retourne TOUS les IDs des questions, même ceux qui sont "ok"`,
          prompt: `Vérifie ces ${batch.length} questions :\n\n${questionsText}`,
        })

        for (const result of experimental_output.results) {
          const q = batch.find(b => b.id === result.id)
          if (!q) continue

          if (result.action === 'ok') {
            totalOk++
          } else if (result.action === 'fix') {
            const updates: Record<string, unknown> = {}
            if (result.correct_idx >= 0) updates.correct_idx = result.correct_idx
            if (result.options.length === 4) updates.options = result.options
            if (result.explanation.length > 0) updates.explanation = result.explanation

            if (Object.keys(updates).length > 0) {
              const { error: updateErr } = await supabase
                .from('questions')
                .update(updates)
                .eq('id', result.id)

              if (updateErr) {
                console.log(`  ✗ Erreur update ${q.question.slice(0, 50)}…: ${updateErr.message}`)
                totalErrors++
              } else {
                console.log(`  ✏ FIX: ${q.question.slice(0, 60)}…`)
                console.log(`    → ${result.reason}`)
                totalFixed++
              }
            }
          } else if (result.action === 'disable') {
            const { error: disableErr } = await supabase
              .from('questions')
              .update({ active: false })
              .eq('id', result.id)

            if (disableErr) {
              console.log(`  ✗ Erreur disable ${q.question.slice(0, 50)}…: ${disableErr.message}`)
              totalErrors++
            } else {
              console.log(`  🚫 DISABLE: ${q.question.slice(0, 60)}…`)
              console.log(`    → ${result.reason}`)
              totalDisabled++
            }
          }
        }
      } catch (err) {
        console.error(`  ✗ Erreur batch: ${err}`)
        totalErrors++
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`✓ ${totalOk} correcte(s)`)
  console.log(`✏ ${totalFixed} corrigée(s)`)
  console.log(`🚫 ${totalDisabled} désactivée(s)`)
  if (totalErrors > 0) console.log(`✗ ${totalErrors} erreur(s)`)
  console.log(`Total restant actif: ${totalOk + totalFixed} question(s)`)
}

main()
