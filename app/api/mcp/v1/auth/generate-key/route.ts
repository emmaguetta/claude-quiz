import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/mcp-http-auth'

const NAME_MAX = 50

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string }
  const rawName = (body.name ?? '').trim()
  const name = rawName.length > 0 ? rawName.slice(0, NAME_MAX) : 'Default'

  // Limit: max 5 active keys per user
  const admin = createAdminClient()
  const { data: existing } = await (admin.from('mcp_api_keys') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => Promise<{ data: Array<{ id: string }> | null }>
      }
    }
  })
    .select('id')
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if ((existing?.length ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Max 5 active keys per user. Revoke an existing key first.' },
      { status: 429 }
    )
  }

  const { rawKey, hash, prefix } = generateApiKey()

  const { data, error } = await (admin.from('mcp_api_keys') as unknown as {
    insert: (row: object) => {
      select: (cols: string) => {
        single: () => Promise<{ data: { id: string; created_at: string } | null; error: { message: string } | null }>
      }
    }
  })
    .insert({
      user_id: user.id,
      key_hash: hash,
      key_prefix: prefix,
      name,
    })
    .select('id, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    name,
    prefix,
    rawKey,
    createdAt: data.created_at,
  })
}
