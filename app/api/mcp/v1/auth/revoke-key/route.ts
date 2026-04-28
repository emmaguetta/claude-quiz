import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('mcp_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
