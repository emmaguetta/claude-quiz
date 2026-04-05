'use client'

import { useLocale } from '@/components/LocaleProvider'

type Option = {
  value: string
  label: string
  description?: string
}

type Props = {
  title: string
  description: string
  options: Option[]
  selected: string[]
  multiSelect: boolean
  onToggle: (value: string) => void
}

export function OnboardingStep({ title, description, options, selected, multiSelect, onToggle }: Props) {
  const { t } = useLocale()
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">{title}</h2>
        <p className="text-base text-zinc-400">{description}</p>
        {multiSelect && (
          <p className="text-sm text-zinc-600">{t.onboarding.multiSelect}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map(({ value, label, description: desc }) => {
          const isSelected = selected.includes(value)
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
              className={`text-left rounded-lg border p-4 transition-all ${
                isSelected
                  ? 'border-amber-500/50 bg-amber-500/10 text-zinc-100'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <div className="font-medium text-sm">{label}</div>
              {desc && <div className="text-xs mt-1 opacity-70">{desc}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
