import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { McpSetupClient } from '@/components/mcp/McpSetupClient'

export const dynamic = 'force-dynamic'

export default async function McpSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/mcp-setup')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://claudequiz.app'
  const mcpUrl = `${siteUrl}/api/mcp`

  return <McpSetupClient userEmail={user.email ?? ''} mcpUrl={mcpUrl} />
}
