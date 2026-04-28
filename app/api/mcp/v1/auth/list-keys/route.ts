import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

type KeyRow = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await (admin.from('mcp_api_keys') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          order: (col: string, opts: object) => Promise<{ data: KeyRow[] | null; error: { message: string } | null }>
        }
      }
    }
  })
    .select('id, name, key_prefix, created_at, last_used_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    keys: (data ?? []).map(k => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
    })),
  })
}
