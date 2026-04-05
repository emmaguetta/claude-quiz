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

export type Profile = {
  id: string
  activities: string[]
  usage_level: 'never' | 'sometimes' | 'often' | 'daily'
  goals: string[]
  onboarded: boolean
  created_at: string
}
