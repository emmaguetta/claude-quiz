import { createClient } from '@/lib/supabase/server'

/**
 * Check if the request is from an authenticated user.
 * Returns the user or null.
 */
export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
