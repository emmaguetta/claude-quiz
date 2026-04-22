import { createClient } from '@supabase/supabase-js'

// Lazy proxy — createClient is only called when a method is first accessed,
// so the module loads cleanly even without env vars configured yet.
function makeLazyClient() {
  let _client: ReturnType<typeof createClient> | null = null
  const get = () => {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return _client
  }
  return new Proxy({} as ReturnType<typeof createClient>, {
    get: (_, prop) => (get() as any)[prop],
  })
}

export const supabase = makeLazyClient()

export { createAdminClient } from './supabase/admin'

export type Question = {
  id: string
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  learn_more: string | null
  category: 'commands' | 'shortcuts' | 'concepts' | 'mcp' | 'workflow' | 'skills'
  difficulty: 'easy' | 'medium' | 'hard'
  source_url: string | null
  developer: boolean
  lang: 'fr' | 'en'
  active: boolean
  created_at: string
}

/** Question as sent to the client — no answer data */
export type QuestionPublic = Omit<Question, 'correct_idx' | 'explanation' | 'learn_more' | 'source_url'> & {
  shuffle_map: number[]
}

/** Server response when checking an answer */
export type AnswerResult = {
  correct_idx: number
  is_correct: boolean
  explanation: string
  learn_more: string | null
  source_url: string | null
}

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  company: string | null
  linkedin_url: string | null
  activities: string[]
  usage_level: 'never' | 'sometimes' | 'often' | 'daily'
  goals: string[]
  heard_about: string | null
  onboarded: boolean
  created_at: string
}

export type QuizAttempt = {
  id: string
  user_id: string
  question_id: string
  selected_idx: number
  is_correct: boolean
  session_id: string | null
  answered_at: string
}

export type UserQuizStats = {
  user_id: string
  total_attempts: number
  correct_attempts: number
  accuracy_pct: number | null
  unique_questions: number
  total_sessions: number
  first_attempt_at: string
  last_attempt_at: string
}

// ── MCP Search types ──

export type Mcp = {
  id: string
  name: string
  slug: string
  description: string | null
  categories: string[]
  source_url: string | null
  repo_url: string | null
  icon_url: string | null
  smithery_id: string | null
  tools_count: number
  verified: boolean
  use_count: number
  github_stars: number
  last_commit_at: string | null
  quality_score: number
  active: boolean
  created_at: string
  updated_at: string
}

export type McpTool = {
  id: string
  mcp_id: string
  name: string
  description: string | null
  input_schema: Record<string, unknown> | null
  created_at: string
}

export type McpChunk = {
  id: string
  mcp_id: string
  chunk_type: 'mcp' | 'tool' | 'tool_group'
  content: string
  tool_name: string | null
  embedding: number[] | null
  created_at: string
}

export type McpSearchResult = {
  mcp_id: string
  mcp_name: string
  mcp_description: string | null
  mcp_slug: string
  mcp_categories: string[]
  mcp_repo_url: string | null
  mcp_icon_url: string | null
  mcp_verified: boolean
  mcp_tools_count: number
  mcp_quality_score: number
  mcp_github_stars: number
  chunk_type: string
  chunk_content: string
  chunk_tool_name: string | null
  similarity: number
}
