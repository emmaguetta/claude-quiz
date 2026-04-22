export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://claudequiz.app'
}

export function authCallbackUrl() {
  return `${getSiteUrl()}/auth/callback`
}
