'use client'

import { PROFICIENCY_LABELS } from '@/lib/types'
import type { ProficiencyLevel } from '@/lib/types'
import { PROFICIENCY_LEVELS, cn } from '@/lib/utils'

interface LevelPickerProps {
  value: ProficiencyLevel | undefined
  onChange: (level: ProficiencyLevel | undefined) => void
  /** Allow clearing back to "not rated" — distinct from level 0 "Not exposed". */
  allowEmpty?: boolean
  emptyLabel?: string
  className?: string
  ariaLabel?: string
  /** Render just the number — for narrow columns where the label is redundant. */
  compact?: boolean
}

/** The one control for entering a 0-5 rating. */
export default function LevelPicker({
  value, onChange, allowEmpty = true, emptyLabel = '—', className, ariaLabel,
  compact = false,
}: LevelPickerProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value === undefined ? '' : String(value)}
      onChange={e =>
        onChange(e.target.value === '' ? undefined : (Number(e.target.value) as ProficiencyLevel))
      }
      className={cn(
        'text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white',
        'focus:outline-none focus:ring-1 focus:ring-brand-500',
        className,
      )}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {PROFICIENCY_LEVELS.map(l => (
        <option key={l} value={l} title={PROFICIENCY_LABELS[l]}>
          {compact ? l : `${l} · ${PROFICIENCY_LABELS[l]}`}
        </option>
      ))}
    </select>
  )
}
