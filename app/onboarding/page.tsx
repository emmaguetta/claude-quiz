'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { OnboardingStep } from '@/components/OnboardingStep'
import { saveProfile } from '@/app/actions/profile'
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

function saveOnboardingState(state: { step: number; activities: string[]; usageLevel: string[]; goals: string[] }) {
  sessionStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state))
}

export default function OnboardingPage() {
  const { t } = useLocale()
  const saved = loadOnboardingState()
  const [step, setStep] = useState(saved?.step ?? 0)
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
    saveOnboardingState({ step, activities, usageLevel, goals })
  }, [step, activities, usageLevel, goals])

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
    ? activities.length > 0
    : step === 1
    ? usageLevel.length > 0
    : goals.length > 0

  async function handleFinish() {
    setSaving(true)
    setError(null)
    try {
      const filters = await saveProfile({
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

  const progress = ((step + 1) / 3) * 100

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
          <OnboardingStep
            title={t.onboarding.activities.title}
            description={t.onboarding.activities.description}
            options={activitiesOptions}
            selected={activities}
            multiSelect
            onToggle={toggleActivity}
          />
        )}

        {step === 1 && (
          <OnboardingStep
            title={t.onboarding.usage.title}
            description={t.onboarding.usage.description}
            options={usageLevels}
            selected={usageLevel}
            multiSelect={false}
            onToggle={toggleUsage}
          />
        )}

        {step === 2 && (
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

          {step < 2 ? (
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
