'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t } = useLocale()
  const authError = searchParams.get('error') === 'auth'
  const rawRedirect = searchParams.get('redirectTo')
  // Only allow same-origin paths to prevent open-redirect abuse
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : null

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isSignUp) {
      // Vérifier le CAPTCHA côté serveur avant de créer le compte
      if (TURNSTILE_SITE_KEY && !captchaToken) {
        setError(t.login.captchaRequired)
        setLoading(false)
        return
      }
      if (TURNSTILE_SITE_KEY && captchaToken) {
        const captchaRes = await fetch('/api/auth/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: captchaToken }),
        })
        if (!captchaRes.ok) {
          setError(t.login.captchaFailed)
          turnstileRef.current?.reset()
          setCaptchaToken(null)
          setLoading(false)
          return
        }
      }

      const callbackUrl = redirectTo
        ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) {
        setError(error.message)
        turnstileRef.current?.reset()
        setCaptchaToken(null)
      } else {
        setCheckEmail(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Check if onboarded
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('id', user.id)
            .single()
          // If onboarded, honor redirectTo; else always go through onboarding first.
          const target = profile?.onboarded ? (redirectTo ?? '/quiz') : '/onboarding'
          router.push(target)
        }
      }
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'github' | 'google' | 'azure') {
    const callbackUrl = redirectTo
      ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
      : `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    })
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    setResent(false)
    setResendError(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (error) {
      setResendError(t.login.resendError)
    } else {
      setResent(true)
      setCooldown(60)
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  if (checkEmail) {
    const resendLabel = resending
      ? t.login.resending
      : resent && cooldown > 0
      ? `${t.login.resent} · ${cooldown}s`
      : cooldown > 0
      ? t.login.resendCooldown(cooldown)
      : t.login.resend
    const resendDisabled = resending || cooldown > 0

    return (
      <main className="min-h-screen text-zinc-100 flex items-center justify-center px-4">
        <div className="absolute top-6 right-6">
          <LocaleToggle />
        </div>
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="text-4xl">✉️</div>
          <h1 className="text-2xl font-bold">{t.login.checkEmailTitle}</h1>
          <p className="text-zinc-400">
            {t.login.checkEmailMessage(email)}
          </p>

          <div className="pt-2 space-y-3">
            <p className="text-xs text-zinc-600">{t.login.resendHint}</p>
            <Button
              onClick={handleResend}
              disabled={resendDisabled}
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            >
              {resendLabel}
            </Button>
            {resendError && (
              <p className="text-xs text-red-400">{resendError}</p>
            )}
          </div>

          <button
            onClick={() => setCheckEmail(false)}
            className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            {t.login.back}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-zinc-100 flex items-center justify-center px-4">
      <div className="absolute top-6 right-6">
        <LocaleToggle />
      </div>
      <div className="max-w-sm w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{isSignUp ? t.login.titleSignUp : t.login.titleSignIn}</h1>
          <p className="text-zinc-400 text-base">
            {isSignUp
              ? t.login.subtitleSignUp
              : t.login.subtitleSignIn}
          </p>
        </div>

        {/* Auth callback error */}
        {authError && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300/90">
            {t.login.authCallbackError}
          </div>
        )}

        {/* Social login */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 py-5"
            onClick={() => handleOAuth('github')}
          >
            <GithubIcon />
            {t.login.github}
          </Button>
          <Button
            variant="outline"
            className="w-full border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 py-5"
            onClick={() => handleOAuth('google')}
          >
            <GoogleIcon />
            {t.login.google}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600 uppercase">{t.login.or}</span>
          <Separator className="flex-1 bg-zinc-800" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-400">{t.login.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-400">{t.login.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {isSignUp && TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              options={{ theme: 'dark', size: 'flexible' }}
            />
          )}

          <Button
            type="submit"
            disabled={loading || (isSignUp && !!TURNSTILE_SITE_KEY && !captchaToken)}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white py-5 font-semibold"
          >
            {loading ? t.login.loading : isSignUp ? t.login.submitSignUp : t.login.submitSignIn}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-zinc-500">
          {isSignUp ? t.login.toggleHasAccount : t.login.toggleNoAccount}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className="text-zinc-300 hover:text-zinc-100 underline underline-offset-2"
          >
            {isSignUp ? t.login.toggleToSignIn : t.login.toggleToSignUp}
          </button>
        </p>

        {/* Back */}
        <div className="text-center">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-400">
            {t.login.backHome}
          </Link>
        </div>
      </div>
    </main>
  )
}

function GithubIcon() {
  return (
    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23">
      <rect fill="#f35325" x="1" y="1" width="10" height="10" />
      <rect fill="#81bc06" x="12" y="1" width="10" height="10" />
      <rect fill="#05a6f0" x="1" y="12" width="10" height="10" />
      <rect fill="#ffba08" x="12" y="12" width="10" height="10" />
    </svg>
  )
}
