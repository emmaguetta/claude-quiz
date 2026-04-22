'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'
import { createClient } from '@/lib/supabase/client'
import { authCallbackUrl } from '@/lib/site-url'
import type { Profile } from '@/lib/supabase'

export function SettingsMenu() {
  const { user, signOut } = useAuth()
  const { locale, t } = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Load profile when menu opens
  useEffect(() => {
    if (open && user && !profile) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile)
        })
    }
  }, [open, user, profile, supabase])

  if (!user) return null

  // Detect auth provider
  const provider = user.app_metadata?.provider
  const providerLabel =
    provider === 'github' ? 'GitHub' :
    provider === 'google' ? 'Google' :
    provider === 'email' ? 'Email' :
    provider ?? 'Email'

  const activityLabels = t.onboarding.activities.options
  const goalLabels = t.onboarding.goals.options

  async function handleResetPassword() {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: authCallbackUrl(),
    })
    setResetSent(true)
    setTimeout(() => setResetSent(false), 5000)
  }

  return (
    <div ref={menuRef} className="fixed bottom-5 left-5 z-50">
      {/* Gear button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          open
            ? 'bg-zinc-700 text-zinc-100'
            : 'bg-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/80'
        }`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Menu popup */}
      {open && (
        <div className="absolute bottom-14 left-0 w-72 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Account section */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{t.settings.account}</p>
            <p className="text-sm text-zinc-300 truncate">{user.email}</p>
            <p className="text-xs text-zinc-600">
              {t.settings.connectedVia} <span className="text-zinc-400">{providerLabel}</span>
            </p>
            {provider === 'email' && (
              <button
                onClick={handleResetPassword}
                disabled={resetSent}
                className={`text-xs transition-colors ${
                  resetSent ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {resetSent ? t.settings.resetPasswordSent : t.settings.resetPassword}
              </button>
            )}
          </div>

          <div className="border-t border-zinc-800" />

          {/* Profile section */}
          {profile && (
            <>
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{t.settings.profile}</p>

                {/* Activities */}
                <div>
                  <p className="text-xs text-zinc-600 mb-1">{t.settings.activity}</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.activities.map(a => (
                      <span key={a} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {(activityLabels as Record<string, string>)[a] ?? a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Usage level */}
                <div>
                  <p className="text-xs text-zinc-600 mb-1">{t.settings.usageLevel}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {t.settings.usageLevels[profile.usage_level] ?? profile.usage_level}
                  </span>
                </div>

                {/* Goals */}
                <div>
                  <p className="text-xs text-zinc-600 mb-1">{t.settings.goals}</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.goals.map(g => {
                      const opt = (goalLabels as Record<string, string | { label: string }>)[g]
                      const label = typeof opt === 'string' ? opt : opt?.label ?? g
                      return (
                        <span key={g} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {label}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => { setOpen(false); router.push('/onboarding') }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {t.settings.editProfile}
                </button>
              </div>

              <div className="border-t border-zinc-800" />
            </>
          )}

          {/* Sign out */}
          <button
            onClick={() => { setOpen(false); signOut() }}
            className="w-full text-left text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            {t.settings.signOut}
          </button>
        </div>
      )}
    </div>
  )
}
