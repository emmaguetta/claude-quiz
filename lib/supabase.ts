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

// Server-side admin client (for writes — only use in API routes)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(url, key, { auth: { persistSession: false } })
}

export type Question = {
  id: string
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  category: 'commands' | 'shortcuts' | 'concepts' | 'mcp' | 'workflow'
  difficulty: 'easy' | 'medium' | 'hard'
  source_url: string | null
  active: boolean
  created_at: string
}
