'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { DeveloperFilter } from '@/components/QuizFilters'

type OnboardingData = {
  first_name: string
  last_name: string
  display_name: string
  linkedin_url?: string
  company: string
  activities: string[]
  usage_level: 'never' | 'sometimes' | 'often' | 'daily'
  goals: string[]
}

export type PreselectedFilters = {
  categories: string[]
  difficulties: string[]
  developer: DeveloperFilter
}

export async function saveProfile(data: OnboardingData): Promise<PreselectedFilters> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Non authentifié')

  await supabase.from('profiles').upsert({
    id: user.id,
    first_name: data.first_name,
    last_name: data.last_name,
    display_name: data.display_name,
    linkedin_url: data.linkedin_url || null,
    company: data.company,
    activities: data.activities,
    usage_level: data.usage_level,
    goals: data.goals,
    onboarded: true,
  })

  // Set onboarded cookie for proxy
  const cookieStore = await cookies()
  cookieStore.set('onboarded', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
  })

  // Compute pre-selected filters
  const difficultyMap: Record<string, string[]> = {
    never: ['easy'],
    sometimes: ['medium'],
    often: ['hard'],
    daily: ['hard'],
  }

  const isDev = data.activities.includes('developer')
  const hasAdvancedDev = data.goals.includes('dev_advanced')

  return {
    categories: [],
    difficulties: difficultyMap[data.usage_level] ?? [],
    developer: (!isDev && !hasAdvancedDev) ? 'exclude' : null,
  }
}
