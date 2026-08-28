'use client'

import { useMemo } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LevelPicker from './LevelPicker'
import { PROFICIENCY_ANCHORS, DEFAULT_THRESHOLDS } from '@/lib/skill-catalog'
import type { SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import { summarizeTeam, summarizeEmployee } from '@/lib/skill-analytics'
import { PROFICIENCY_LABELS } from '@/lib/types'
import type { Employee, ProficiencyLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ThresholdSettingsProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  thresholds: SkillThresholds
  onChange: (updates: Partial<SkillThresholds>) => void
}

type Key = keyof SkillThresholds

const DEFINITIONS: {
  key: Key
  title: string
  question: string
  drives: string
}[] = [
  {
    key: 'breadth',
    title: 'Breadth',
    question: 'At what level does an engineer count as having a skill at all?',
    drives: 'Each engineer’s breadth count, and every role profile’s breadth target.',
  },
  {
    key: 'coverage',
    title: 'Coverage',
    question: 'At what level is the team as a whole covered for a skill?',
    drives: 'Critical coverage on the Overview, and the “nobody at working proficiency” list.',
  },
  {
    key: 'depth',
    title: 'Depth',
    question: 'At what level does an engineer genuinely own a skill?',
    drives: 'Each engineer’s depth count, role depth targets, and bus-factor risk.',
  },
]

/**
 * The levels at which breadth, coverage and depth begin counting. Changing one
 * re-scores the whole team, so each control shows the effect live.
 */
export default function ThresholdSettings({
  employees, catalog, thresholds, onChange,
}: ThresholdSettingsProps) {
  const impact = useMemo(() => {
    const team = summarizeTeam(employees, catalog, thresholds)
    const perPerson = employees.map(e => summarizeEmployee(e, catalog, [], thresholds))
    const avg = (ns: number[]) =>
      ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : 0
    return {
      breadth: `${avg(perPerson.map(p => p.breadth))} skills per engineer on average`,
      coverage: `${Math.round(team.criticalCoverage * 100)}% critical coverage · ${team.criticalUncovered.length} critical skills uncovered`,
      depth: `${avg(perPerson.map(p => p.depth))} skills per engineer · ${team.busFactorRisks.length} bus-factor risks`,
    } as Record<Key, string>
  }, [employees, catalog, thresholds])

  const isDefault =
    thresholds.breadth === DEFAULT_THRESHOLDS.breadth &&
    thresholds.coverage === DEFAULT_THRESHOLDS.coverage &&
    thresholds.depth === DEFAULT_THRESHOLDS.depth

  const ordered = thresholds.breadth <= thresholds.coverage && thresholds.coverage <= thresholds.depth

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle>Measurement thresholds</CardTitle>
          <CardSubtitle>
            These three levels define what breadth, coverage and depth <em>mean</em> everywhere in
            the app. Changing one re-scores the whole team immediately.
          </CardSubtitle>
        </div>
        {!isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(DEFAULT_THRESHOLDS)}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Restore defaults
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {DEFINITIONS.map(({ key, title, question, drives }) => {
          const level = thresholds[key]
          const anchor = PROFICIENCY_ANCHORS[level]
          return (
            <div key={key} className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <LevelPicker
                  value={level}
                  allowEmpty={false}
                  onChange={v => onChange({ [key]: v ?? DEFAULT_THRESHOLDS[key] } as Partial<SkillThresholds>)}
                  className="ml-auto !py-1"
                  ariaLabel={`${title} threshold`}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">{question}</p>

              <div className="mt-2.5 rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-700">
                  Counts at{' '}
                  <strong>level {level} ({PROFICIENCY_LABELS[level]}) or above</strong>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {anchor?.independence} · {anchor?.scope}
                </p>
              </div>

              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                <span className="font-medium text-slate-500">Drives:</span> {drives}
              </p>

              <p className="text-[11px] font-medium text-brand-700 mt-2 pt-2 border-t border-slate-100">
                Right now: {impact[key]}
              </p>
            </div>
          )
        })}
      </div>

      {!ordered && (
        <p className="text-[11px] text-amber-600 mt-3">
          Breadth ({thresholds.breadth}) should be at or below coverage ({thresholds.coverage}),
          which should be at or below depth ({thresholds.depth}). Out-of-order thresholds still
          calculate, but the resulting numbers are hard to reason about.
        </p>
      )}
    </Card>
  )
}
