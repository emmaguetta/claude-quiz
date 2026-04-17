'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { OnboardingStep } from '@/components/OnboardingStep'
import { saveProfile } from '@/app/actions/profile'
import { useAuth } from '@/components/AuthProvider'
import { useLocale } from '@/components/LocaleProvider'
import { LocaleToggle } from '@/components/LocaleToggle'

const FILTERS_KEY = 'claude-quiz-filters'
const PROFILE_BANNER_KEY = 'claude-quiz-profile-filters-applied'
const ONBOARDING_STATE_KEY = 'claude-quiz-onboarding-state'

function loadOnboardingState() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(sessionStorage.getItem(ONBOARDING_STATE_KEY) ?? 'null')
  } catch {
    return null
  }
}

function saveOnboardingState(state: { step: number; firstName: string; lastName: string; linkedinUrl: string; company: string; activities: string[]; usageLevel: string[]; goals: string[] }) {
  sessionStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state))
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const { t } = useLocale()
  const saved = loadOnboardingState()

  // Pre-fill name from OAuth metadata
  const oauthName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
  const nameParts = typeof oauthName === 'string' ? oauthName.split(' ') : []
  const defaultFirstName = saved?.firstName ?? (nameParts[0] || '')
  const defaultLastName = saved?.lastName ?? (nameParts.slice(1).join(' ') || '')

  const [step, setStep] = useState(saved?.step ?? 0)
  const [firstName, setFirstName] = useState(defaultFirstName)
  const [lastName, setLastName] = useState(defaultLastName)
  const [linkedinUrl, setLinkedinUrl] = useState(saved?.linkedinUrl ?? '')
  const [company, setCompany] = useState(saved?.company ?? '')
  const [activities, setActivities] = useState<string[]>(saved?.activities ?? [])
  const [usageLevel, setUsageLevel] = useState<string[]>(saved?.usageLevel ?? [])
  const [goals, setGoals] = useState<string[]>(saved?.goals ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const activitiesOptions = Object.entries(t.onboarding.activities.options).map(([value, label]) => ({ value, label: typeof label === 'string' ? label : '' }))
  const usageLevels = Object.entries(t.onboarding.usage.options).map(([value, opt]) => ({ value, label: opt.label, description: opt.description }))
  const goalsOptions = Object.entries(t.onboarding.goals.options).map(([value, opt]) => ({ value, label: typeof opt === 'string' ? opt : opt.label, description: typeof opt === 'string' ? undefined : 'description' in opt ? opt.description : undefined }))

  // Persist state on every change
  useEffect(() => {
    saveOnboardingState({ step, firstName, lastName, linkedinUrl, company, activities, usageLevel, goals })
  }, [step, firstName, lastName, linkedinUrl, company, activities, usageLevel, goals])

  function toggleActivity(v: string) {
    setActivities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  function toggleUsage(v: string) {
    setUsageLevel([v]) // single select
  }

  function toggleGoal(v: string) {
    setGoals(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const canProceed = step === 0
    ? firstName.trim().length > 0 && lastName.trim().length > 0 && company.trim().length > 0
    : step === 1
    ? activities.length > 0
    : step === 2
    ? usageLevel.length > 0
    : goals.length > 0

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const filters = await saveProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        linkedin_url: linkedinUrl.trim() || undefined,
        company: company.trim(),
        activities,
        usage_level: usageLevel[0] as 'never' | 'sometimes' | 'often' | 'daily',
        goals,
      })

      // Save pre-selected filters to localStorage
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
      localStorage.setItem(PROFILE_BANNER_KEY, 'true')
      sessionStorage.removeItem(ONBOARDING_STATE_KEY)

      // Force full navigation to ensure proxy picks up the new onboarded cookie
      window.location.href = '/quiz'
    } catch (e) {
      setError(e instanceof Error ? e.message : t.onboarding.saveError)
      setSaving(false)
    }
  }

  const progress = ((step + 1) / 4) * 100

  return (
    <main className="min-h-screen text-zinc-100 flex items-center justify-center px-4">
      <div className="absolute top-6 right-6">
        <LocaleToggle />
      </div>
      <div className="max-w-lg w-full space-y-8 py-10">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t.onboarding.welcome}</span>
            <span>{t.onboarding.step(step + 1)}</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>

        {/* Steps */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-100">{t.onboarding.profile.title}</h2>
              <p className="mt-1 text-base text-zinc-500">{t.onboarding.profile.description}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-zinc-400 mb-1.5">
                  {t.onboarding.profile.firstNameLabel} <span className="text-red-400">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder={t.onboarding.profile.firstNamePlaceholder}
                  autoFocus
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-zinc-400 mb-1.5">
                  {t.onboarding.profile.lastNameLabel} <span className="text-red-400">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder={t.onboarding.profile.lastNamePlaceholder}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-zinc-400 mb-1.5">
                  {t.onboarding.profile.companyLabel} <span className="text-red-400">*</span>
                </label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder={t.onboarding.profile.companyPlaceholder}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-zinc-400 mb-1.5">
                  {t.onboarding.profile.linkedinLabel}
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder={t.onboarding.profile.linkedinPlaceholder}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <OnboardingStep
            title={t.onboarding.activities.title}
            description={t.onboarding.activities.description}
            options={activitiesOptions}
            selected={activities}
            multiSelect
            onToggle={toggleActivity}
          />
        )}

        {step === 2 && (
          <OnboardingStep
            title={t.onboarding.usage.title}
            description={t.onboarding.usage.description}
            options={usageLevels}
            selected={usageLevel}
            multiSelect={false}
            onToggle={toggleUsage}
          />
        )}

        {step === 3 && (
          <OnboardingStep
            title={t.onboarding.goals.title}
            description={t.onboarding.goals.description}
            options={goalsOptions}
            selected={goals}
            multiSelect
            onToggle={toggleGoal}
          />
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.onboarding.prev}
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="bg-zinc-100 text-zinc-900 hover:bg-white font-semibold px-8"
            >
              {t.onboarding.next}
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed || saving}
              className="bg-amber-500 text-zinc-900 hover:bg-amber-400 font-semibold px-8"
            >
              {saving ? t.onboarding.saving : t.onboarding.finish}
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
