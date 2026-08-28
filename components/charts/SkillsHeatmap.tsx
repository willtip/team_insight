'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { AAP_SKILL_CATALOG } from '@/lib/skill-catalog'
import type { SkillDefinition } from '@/lib/skill-catalog'
import { finalRating } from '@/lib/skill-analytics'
import { PROFICIENCY_LABELS } from '@/lib/types'
import type { Employee, ProficiencyLevel } from '@/lib/types'
import { cn, heatmapColor, heatmapTextColor } from '@/lib/utils'

interface SkillsHeatmapProps {
  employees: Employee[]
  /** Defaults to the AAP preset so the dashboard card works without the catalog store. */
  catalog?: SkillDefinition[]
  compact?: boolean
  filterDomain?: string
  criticalOnly?: boolean
  belowTargetOnly?: boolean
  /** Cap the rows rendered — used by the compact dashboard card. */
  maxSkills?: number
  /** Group rows under collapsible domain headers. */
  grouped?: boolean
}

/** Ratings live per employee; look one up without re-resolving the whole catalog. */
function levelFor(employee: Employee, skillId: string): ProficiencyLevel | undefined {
  const a = (employee.skills ?? []).find(s => s.skillId === skillId)
  return a ? finalRating(a) : undefined
}

export default function SkillsHeatmap({
  employees,
  catalog = AAP_SKILL_CATALOG,
  compact = false,
  filterDomain,
  criticalOnly = false,
  belowTargetOnly = false,
  maxSkills,
  grouped = false,
}: SkillsHeatmapProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const skills = useMemo(() => {
    let rows = catalog
    if (filterDomain) rows = rows.filter(s => s.domain === filterDomain)
    if (criticalOnly) rows = rows.filter(s => s.critical)
    if (belowTargetOnly) {
      rows = rows.filter(s =>
        employees.some(e => {
          const l = levelFor(e, s.id)
          return l !== undefined && l < s.targetLevel
        }),
      )
    }
    return maxSkills ? rows.slice(0, maxSkills) : rows
  }, [catalog, filterDomain, criticalOnly, belowTargetOnly, maxSkills, employees])

  const domains = useMemo(() => {
    const seen: string[] = []
    for (const s of skills) if (!seen.includes(s.domain)) seen.push(s.domain)
    return seen
  }, [skills])

  const toggle = (d: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })

  const nameCol = compact ? 'w-24' : 'w-64'
  const cell = compact ? 'w-8 h-8' : 'w-14 h-8'

  const renderRow = (skill: SkillDefinition) => (
    <div key={skill.id} className="flex items-center gap-1 mb-0.5">
      <div
        className={cn('flex-shrink-0 text-xs text-slate-600 truncate flex items-center gap-1', nameCol)}
        title={`${skill.name}\n${skill.observableCapability}\n\nTarget level ${skill.targetLevel}${skill.critical ? ' · critical' : ''}`}
      >
        {skill.critical && !compact && (
          <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" title="Critical skill" />
        )}
        <span className="truncate font-medium">{skill.name}</span>
        {!compact && (
          <span className="text-[10px] text-slate-300 flex-shrink-0 ml-auto pr-1">
            →{skill.targetLevel}
          </span>
        )}
      </div>

      {employees.map(emp => {
        const level = levelFor(emp, skill.id)
        const rated = level !== undefined
        const below = rated && level < skill.targetLevel
        return (
          <div
            key={emp.id}
            className={cn(
              'rounded flex items-center justify-center text-xs font-medium cursor-default transition-all relative',
              'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1',
              cell,
              rated ? heatmapColor(level) : 'bg-white border border-dashed border-slate-200',
              rated && heatmapTextColor(level),
            )}
            title={
              rated
                ? `${emp.name} — ${skill.name}: ${level} ${PROFICIENCY_LABELS[level]} (target ${skill.targetLevel})`
                : `${emp.name} — ${skill.name}: not assessed`
            }
          >
            {rated ? level : <span className="text-slate-300">·</span>}
            {below && !compact && (
              <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex items-center gap-1 mb-1 sticky top-0 bg-white z-10 pb-1">
          <div className={cn('flex-shrink-0 text-xs text-slate-400', nameCol)} />
          {employees.map(emp => (
            <div
              key={emp.id}
              className={cn('text-center text-xs font-medium text-slate-600 truncate', compact ? 'w-8' : 'w-14')}
              title={`${emp.name} — ${emp.title}`}
            >
              {emp.name.split(' ')[0]}
            </div>
          ))}
        </div>

        {grouped
          ? domains.map(domain => {
              const rows = skills.filter(s => s.domain === domain)
              const isCollapsed = collapsed.has(domain)
              return (
                <div key={domain} className="mb-1.5">
                  <button
                    onClick={() => toggle(domain)}
                    className="flex items-center gap-1.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />}
                    {domain}
                    <span className="text-slate-300 font-normal">{rows.length}</span>
                  </button>
                  {!isCollapsed && rows.map(renderRow)}
                </div>
              )
            })
          : skills.map(renderRow)}

        {skills.length === 0 && (
          <p className="text-xs text-slate-400 py-6">No skills match these filters.</p>
        )}

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="text-xs text-slate-400">Level:</span>
          {PROFICIENCY_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={cn(
                  'w-5 h-5 rounded text-xs flex items-center justify-center font-medium',
                  heatmapColor(i),
                  heatmapTextColor(i),
                )}
              >
                {i}
              </div>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
          {!compact && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-5 h-5 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs">
                ·
              </div>
              <span className="text-xs text-slate-500">Not assessed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
