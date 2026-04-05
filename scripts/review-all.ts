/**
 * Passe en revue TOUTES les questions actives :
 * - Véracité vs doc officielle
 * - Clarté de l'explication
 * - Pédagogie du learn_more (réexplique les termes, nuances)
 * - Catégorie correcte
 * - Difficulté correcte
 * - Tag developer correct
 * Run: npm run review
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

// Doc URLs grouped by category
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
    'https://code.claude.com/docs/en/model-config.md',
  ],
  mcp: [
    'https://code.claude.com/docs/en/mcp.md',
  ],
  workflow: [
    'https://code.claude.com/docs/en/common-workflows.md',
    'https://code.claude.com/docs/en/best-practices.md',
    'https://code.claude.com/docs/en/hooks.md',
    'https://code.claude.com/docs/en/sub-agents.md',
    'https://code.claude.com/docs/en/github-actions.md',
    'https://code.claude.com/docs/en/headless.md',
  ],
  skills: [
    'https://code.claude.com/docs/en/skills.md',
  ],
}

async function fetchDoc(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'claude-quiz-review/1.0' } })
    if (!res.ok) return ''
    const text = await res.text()
    if (url.endsWith('.md')) return text.slice(0, 20000)
    return text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000)
  } catch { return '' }
}

const ReviewSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    action: z.enum(['ok', 'fix', 'disable']),
    reason: z.string(),
    // Corrections (empty string/array = no change, -1 = no change for numbers)
    explanation: z.string(),
    learn_more: z.string(),
    correct_idx: z.number().int().min(-1).max(3),
    options: z.array(z.string()),
    category: z.string(),  // empty = no change
    difficulty: z.string(), // empty = no change
    developer: z.number().int().min(-1).max(1), // -1 = no change, 0 = false, 1 = true
  })),
})

type Question = {
  id: string; question: string; options: string[]; correct_idx: number
  explanation: string; learn_more: string | null; category: string
  difficulty: string; developer: boolean
}

async function main() {
  console.log('Chargement de la documentation…')
  const docCache: Record<string, string> = {}
  const allUrls = new Set(Object.values(DOC_GROUPS).flat())
  await Promise.all([...allUrls].map(async url => { docCache[url] = await fetchDoc(url) }))
  const loadedCount = Object.values(docCache).filter(Boolean).length
  console.log(`${loadedCount}/${allUrls.size} pages chargées.\n`)

  const docByCategory: Record<string, string> = {}
  for (const [cat, urls] of Object.entries(DOC_GROUPS)) {
    docByCategory[cat] = urls.map(u => docCache[u]).filter(Boolean).join('\n\n---\n\n')
  }

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question, options, correct_idx, explanation, learn_more, category, difficulty, developer')
    .eq('active', true)
    .order('category')

  if (error || !questions) { console.error('Erreur Supabase:', error); return }
  console.log(`${questions.length} questions actives à reviewer.\n`)

  const grouped: Record<string, Question[]> = {}
  for (const q of questions) {
    if (!grouped[q.category]) grouped[q.category] = []
    grouped[q.category].push(q)
  }

  let totalOk = 0, totalFixed = 0, totalDisabled = 0, totalErrors = 0

  for (const [category, catQuestions] of Object.entries(grouped)) {
    const doc = docByCategory[category] || ''
    if (!doc) { console.log(`⚠ Pas de doc pour "${category}"`); continue }

    for (let i = 0; i < catQuestions.length; i += 8) {
      const batch = catQuestions.slice(i, i + 8)
      const batchNum = Math.floor(i / 8) + 1
      const totalBatches = Math.ceil(catQuestions.length / 8)
      console.log(`[${category}] Batch ${batchNum}/${totalBatches} (${batch.length} questions)…`)

      const questionsText = batch.map((q, idx) => {
        const opts = q.options.map((o: string, j: number) =>
          `  ${j === q.correct_idx ? '→' : ' '} ${['A', 'B', 'C', 'D'][j]}) ${o}`
        ).join('\n')
        return `#${idx + 1} [id: ${q.id}] [cat: ${q.category}] [diff: ${q.difficulty}] [dev: ${q.developer}]
Q: ${q.question}
${opts}
Explication: ${q.explanation}
Learn more: ${q.learn_more || '(vide)'}`
      }).join('\n\n')

      try {
        const { experimental_output } = await generateText({
          model: openai('gpt-4o-mini'),
          experimental_output: Output.object({ schema: ReviewSchema }),
          system: `Tu es un expert Claude Code. Tu fais une revue qualité de questions de quiz.

DOCUMENTATION OFFICIELLE (source de vérité) :
${doc.slice(0, 50000)}

CATÉGORIES VALIDES :
- commands : commandes CLI (flags, commandes slash, commandes de lancement)
- shortcuts : raccourcis clavier et préfixes d'input (!, /, @, &)
- concepts : concepts fondamentaux (permissions, settings, context window, modes, architecture, CLAUDE.md, thinking)
- mcp : Model Context Protocol (serveurs, scopes, transport, configuration)
- workflow : cas d'usage concrets et bonnes pratiques (comment corriger un bug, faire une PR, utiliser en CI, etc.)
- skills : tout sur les skills (SKILL.md, frontmatter, bundled skills, création, invocation)

NIVEAUX DE DIFFICULTÉ :
- easy : définition basique, commande simple, concept fondamental qu'un débutant doit connaître
- medium : usage intermédiaire, nécessite de comprendre le contexte, combinaison de concepts
- hard : configuration avancée, nuances subtiles, cas d'usage expert, administration

TAG DEVELOPER :
- true : question sur un usage développeur (refactoring, tests, CI/CD, GitHub Actions, debug, revue de code, pipelines, déploiement, git worktrees, scripting)
- false : questions sur l'interface, raccourcis, concepts généraux, configuration basique

Pour CHAQUE question, vérifie :

1. VÉRACITÉ : La réponse marquée (→) est-elle correcte selon la doc ? Les options fausses sont-elles plausibles mais bien fausses ?

2. EXPLICATION : L'explication est-elle claire, concise, et correcte ? Explique-t-elle POURQUOI c'est la bonne réponse ?

3. LEARN MORE : Est-il pédagogique ? Réexplique-t-il les termes utilisés dans la question ? Donne-t-il des exemples concrets ? Explique-t-il les nuances (avec quoi on pourrait confondre) ? Si c'est vide ou insuffisant, écris-en un bon (4-6 phrases en français, ton accessible).

4. CATÉGORIE : Est-elle dans la bonne catégorie selon les définitions ci-dessus ?

5. DIFFICULTÉ : Le niveau est-il approprié (easy/medium/hard) ?

6. TAG DEVELOPER : Est-il correct ?

Actions :
- "ok" : tout est bon. Mets explanation="", learn_more="", correct_idx=-1, options=[], category="", difficulty="", developer=-1.
- "fix" : quelque chose à corriger. Remplis UNIQUEMENT les champs à modifier. Les autres : explanation="", learn_more="", correct_idx=-1, options=[], category="", difficulty="", developer=-1.
- "disable" : question fausse, impossible à corriger, ou doublon exact. Même format que ok.

IMPORTANT : Toutes les questions, explications et learn_more doivent être EN FRANÇAIS (sauf termes techniques).`,
          prompt: `Passe en revue ces ${batch.length} questions :\n\n${questionsText}`,
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
            if (result.learn_more.length > 0) updates.learn_more = result.learn_more
            if (result.category.length > 0) updates.category = result.category
            if (result.difficulty.length > 0) updates.difficulty = result.difficulty
            if (result.developer >= 0) updates.developer = result.developer === 1

            if (Object.keys(updates).length > 0) {
              const { error: updateErr } = await supabase
                .from('questions').update(updates).eq('id', result.id)
              if (updateErr) {
                console.log(`  ✗ Erreur: ${q.question.slice(0, 50)}… → ${updateErr.message}`)
                totalErrors++
              } else {
                const changes = Object.keys(updates).join(', ')
                console.log(`  ✏ FIX [${changes}]: ${q.question.slice(0, 60)}…`)
                if (result.reason) console.log(`    → ${result.reason.slice(0, 100)}`)
                totalFixed++
              }
            }
          } else if (result.action === 'disable') {
            const { error: disableErr } = await supabase
              .from('questions').update({ active: false }).eq('id', result.id)
            if (disableErr) {
              console.log(`  ✗ Erreur disable: ${q.question.slice(0, 50)}…`)
              totalErrors++
            } else {
              console.log(`  🚫 DISABLE: ${q.question.slice(0, 60)}…`)
              console.log(`    → ${result.reason.slice(0, 100)}`)
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
}

main()
