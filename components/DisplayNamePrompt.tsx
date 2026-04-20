'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const DISMISSED_KEY = 'claude-quiz-displayname-dismissed'

export function DisplayNamePrompt() {
  const { user } = useAuth()
  const { t } = useLocale()
  const [show, setShow] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    // Don't show if dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const supabase = createClient()
    supabase
      .from('profiles')
      .select('display_name, onboarded')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data && data.onboarded && !data.display_name) {
          setShow(true)
        }
      })
  }, [user])

  async function handleSave() {
    if (!user || !value.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ display_name: value.trim() })
      .eq('id', user.id)

    if (dbError) {
      setError(
        dbError.message.includes('profiles_display_name_unique')
          ? t.displayNamePrompt.taken
          : t.displayNamePrompt.error
      )
      setSaving(false)
      return
    }

    setShow(false)
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{t.displayNamePrompt.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">{t.displayNamePrompt.description}</p>
        </div>

        <div>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t.displayNamePrompt.placeholder}
            autoFocus
            maxLength={30}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
            onKeyDown={e => { if (e.key === 'Enter' && value.trim()) handleSave() }}
          />
          {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleDismiss}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {t.displayNamePrompt.later}
          </button>
          <Button
            onClick={handleSave}
            disabled={!value.trim() || saving}
            className="bg-purple-600 text-white hover:bg-purple-500 font-semibold px-6"
          >
            {saving ? '...' : t.displayNamePrompt.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
