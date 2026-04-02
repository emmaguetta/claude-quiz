import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correct_idx: z.number().int().min(0).max(3),
      explanation: z.string(),
      category: z.enum(['commands', 'shortcuts', 'concepts', 'mcp', 'workflow']),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      source_url: z.string().nullable(),
    })
  ),
})

export type GeneratedQuestion = z.infer<typeof QuestionSchema>['questions'][number]

// Docs en Markdown pur — beaucoup plus propre que le HTML
const DOCS_URLS = [
  'https://code.claude.com/docs/en/overview.md',
  'https://code.claude.com/docs/en/cli-reference.md',
  'https://code.claude.com/docs/en/commands.md',
  'https://code.claude.com/docs/en/keybindings.md',
  'https://code.claude.com/docs/en/settings.md',
  'https://code.claude.com/docs/en/permissions.md',
  'https://code.claude.com/docs/en/permission-modes.md',
  'https://code.claude.com/docs/en/memory.md',
  'https://code.claude.com/docs/en/mcp.md',
  'https://code.claude.com/docs/en/hooks.md',
  'https://code.claude.com/docs/en/hooks-guide.md',
  'https://code.claude.com/docs/en/sub-agents.md',
  'https://code.claude.com/docs/en/common-workflows.md',
  'https://code.claude.com/docs/en/best-practices.md',
  'https://code.claude.com/docs/en/github-actions.md',
  'https://code.claude.com/docs/en/context-window.md',
  'https://code.claude.com/docs/en/how-claude-code-works.md',
  'https://code.claude.com/docs/en/security.md',
  'https://code.claude.com/docs/en/interactive-mode.md',
  'https://code.claude.com/docs/en/headless.md',
  'https://claude.com/resources/courses', // listing page
  // Cours Anthropic Academy (Skilljar) — accessibles sans login
  'https://anthropic.skilljar.com/introduction-to-subagents',
  'https://anthropic.skilljar.com/claude-code-in-action',
  'https://anthropic.skilljar.com/introduction-to-agent-skills',
  'https://anthropic.skilljar.com/introduction-to-model-context-protocol',
  'https://anthropic.skilljar.com/model-context-protocol-advanced-topics',
  'https://anthropic.skilljar.com/claude-101',
]

async function fetchDocContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'claude-quiz-app/1.0' },
      next: { revalidate: 86400 }, // cache 24h
    })
    if (!res.ok) return ''
    const raw = await res.text()

    // Markdown pages (.md) — use directly
    if (url.endsWith('.md')) {
      return raw.slice(0, 12000)
    }

    // HTML pages — strip scripts/styles, find content start, normalize
    const cleaned = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const CONTENT_MARKERS = ['Go deeper with Anthropic', '# ', 'Introduction']
    let startIdx = 0
    for (const marker of CONTENT_MARKERS) {
      const idx = text.indexOf(marker)
      if (idx > 2000) { startIdx = idx; break }
    }

    return text.slice(startIdx, startIdx + 12000)
  } catch {
    return ''
  }
}

// Normalise une question pour comparaison (minuscules, sans ponctuation)
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9àâéèêëîïôùûüç\s]/g, '').replace(/\s+/g, ' ').trim()
}

// Similarité simple basée sur les mots communs (Jaccard)
function isTooSimilar(a: string, b: string, threshold = 0.6): boolean {
  const setA = new Set(normalize(a).split(' '))
  const setB = new Set(normalize(b).split(' '))
  const intersection = [...setA].filter(w => setB.has(w)).length
  const union = new Set([...setA, ...setB]).size
  return intersection / union >= threshold
}

export async function generateQuestionsFromDocs(
  count = 10,
  existingQuestions: string[] = []
): Promise<GeneratedQuestion[]> {
  const docContents = await Promise.all(DOCS_URLS.map(fetchDocContent))
  const combinedDocs = docContents.filter(Boolean).join('\n\n---\n\n').slice(0, 30000)

  const existingSample = existingQuestions.slice(0, 60).join('\n- ')
  const existingContext = existingQuestions.length > 0
    ? `\n\nQuestions DÉJÀ EXISTANTES à ne pas dupliquer (évite les sujets trop similaires) :\n- ${existingSample}`
    : ''

  const { experimental_output } = await generateText({
    model: openai('gpt-4o-mini'),
    experimental_output: Output.object({ schema: QuestionSchema }),
    system: `Tu es un expert Claude Code qui crée des quiz pour aider les développeurs à maîtriser l'outil.
Génère exactement ${count} questions quiz à choix multiples basées sur la documentation fournie.

Règles :
- TOUTES les questions, options et explications doivent être rédigées en FRANÇAIS
- Les termes techniques (noms de commandes, flags, raccourcis clavier comme Ctrl+C, Escape) restent en anglais
- Chaque question a exactement 4 options (A, B, C, D)
- correct_idx est l'index 0-3 de la bonne réponse
- explanation : 1-2 phrases claires en français qui expliquent pourquoi la réponse est correcte
- Varie les catégories et difficultés
- Focus sur l'utilisation pratique : commandes, raccourcis, flags, concepts clés
- Les mauvaises réponses doivent être plausibles (pas absurdes)
- Ne génère JAMAIS une question trop proche d'une question existante${existingContext}`,
    prompt: `Documentation Claude Code :\n\n${combinedDocs}\n\nGénère ${count} questions quiz originales.`,
  })

  // Filtre côté client les questions trop similaires aux existantes ou entre elles
  const kept: GeneratedQuestion[] = []
  for (const q of experimental_output.questions) {
    const tooCloseToExisting = existingQuestions.some(eq => isTooSimilar(q.question, eq))
    const tooCloseToKept = kept.some(k => isTooSimilar(q.question, k.question))
    if (!tooCloseToExisting && !tooCloseToKept) {
      kept.push(q)
    }
  }

  return kept
}
