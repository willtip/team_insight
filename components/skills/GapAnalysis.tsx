'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ShieldAlert, ArrowRight, UserPlus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { collectGaps, summarizeAllSkills, summarizeTeam } from '@/lib/skill-analytics'
import type { SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import type { Employee } from '@/lib/types'
import { cn, skillLevelColor, skillPriorityColor } from '@/lib/utils'

interface GapAnalysisProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  thresholds: SkillThresholds
  onPlanGap: (employeeId: string, skillId: string) => void
}

export default function GapAnalysis({
  employees, catalog, thresholds, onPlanGap,
}: GapAnalysisProps) {
  const [focusSkillId, setFocusSkillId] = useState<string | null>(null)

  const team = useMemo(() => summarizeTeam(employees, catalog, thresholds), [employees, catalog, thresholds])
  const skills = useMemo(() => summarizeAllSkills(employees, catalog, thresholds), [employees, catalog, thresholds])
  const gaps = useMemo(() => collectGaps(employees, catalog, 1), [employees, catalog])

  const highGaps = gaps.filter(g => g.row.priority === 'High')
  // Default to a risk someone can actually be moved into, so the panel opens on
  // an actionable skill rather than one with no candidates.
  const focus =
    skills.find(s => s.definition.id === focusSkillId) ??
    team.busFactorRisks.find(s => s.upskillCandidates.length > 0) ??
    team.busFactorRisks[0] ??
    skills.find(s => s.upskillCandidates.length > 0) ??
    skills[0]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Single points of failure
          </CardTitle>
          <CardSubtitle>
            Critical skills with at most one engineer at level {thresholds.depth} — losing one person
            loses the capability
          </CardSubtitle>
        </CardHeader>

        {team.busFactorRisks.length === 0 ? (
          <p className="text-xs text-slate-400">
            Every critical skill has at least two engineers at level {thresholds.depth} or above.
          </p>
        ) : (
          <div className="space-y-1.5">
            {team.busFactorRisks.map(s => {
              const owners = s.levels.filter(l => l.level >= thresholds.depth)
              return (
                <button
                  key={s.definition.id}
                  onClick={() => setFocusSkillId(s.definition.id)}
                  className={cn(
                    'w-full grid grid-cols-[1fr_180px_130px_80px] gap-3 items-center px-3 py-2 rounded-lg border text-left transition-colors',
                    focus?.definition.id === s.definition.id
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-slate-100 hover:bg-slate-50',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {s.definition.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{s.definition.domain}</p>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {owners.length === 0
                      ? <span className="text-red-600 font-medium">No depth owner</span>
                      : <>Only <strong>{owners[0].name}</strong></>}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {s.coverage} at level {thresholds.coverage}+ · target {s.definition.targetLevel}
                  </div>
                  <div className="text-right">
                    <Badge className={owners.length === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                      {owners.length === 0 ? 'Critical' : 'Bus factor 1'}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {team.criticalUncovered.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">
              Critical skills with nobody at working proficiency
            </p>
            <div className="flex flex-wrap gap-1.5">
              {team.criticalUncovered.map(s => (
                <button
                  key={s.definition.id}
                  onClick={() => setFocusSkillId(s.definition.id)}
                  className="text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  {s.definition.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Highest-priority development gaps
            </CardTitle>
            <CardSubtitle>
              {highGaps.length} High-priority · {gaps.length} total below target, worst first
            </CardSubtitle>
          </CardHeader>

          <div className="space-y-1">
            {gaps.slice(0, 14).map(g => (
              <div
                key={`${g.employeeId}-${g.row.skillId}`}
                className="grid grid-cols-[130px_1fr_96px_76px_32px] gap-3 items-center px-2 py-1.5 rounded-lg hover:bg-slate-50 group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={g.employeeName} size="xs" />
                  <span className="text-xs text-slate-700 truncate">{g.employeeName}</span>
                </div>
                <button
                  onClick={() => setFocusSkillId(g.row.skillId)}
                  className="text-xs text-slate-800 truncate text-left hover:text-brand-600 transition-colors"
                  title={g.row.definition.observableCapability}
                >
                  {g.row.definition.name}
                </button>
                <div className="flex items-center gap-1 justify-center">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', skillLevelColor(g.row.final))}>
                    {g.row.final}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {g.row.target}
                  </span>
                </div>
                <div className="text-center">
                  <Badge className={skillPriorityColor(g.row.priority!)}>{g.row.priority}</Badge>
                </div>
                <button
                  onClick={() => onPlanGap(g.employeeId, g.row.skillId)}
                  title="Add to development plan"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {gaps.length === 0 && (
              <p className="text-xs text-slate-400">
                Everyone is at or above target on every rated skill.
              </p>
            )}
            {gaps.length > 14 && (
              <p className="text-[11px] text-slate-400 pt-2">
                + {gaps.length - 14} more below target
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upskilling candidates</CardTitle>
            <CardSubtitle className="truncate" >
              {focus ? focus.definition.name : 'Select a skill'}
            </CardSubtitle>
          </CardHeader>

          {!focus ? (
            <p className="text-xs text-slate-400">No skills in the catalog.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                {focus.definition.observableCapability}
              </p>

              <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-500">
                <span>Target <strong className="text-slate-700">{focus.definition.targetLevel}</strong></span>
                <span>·</span>
                <span>{focus.coverage} at {thresholds.coverage}+</span>
                <span>·</span>
                <span>{focus.depthCount} at {thresholds.depth}+</span>
              </div>

              {focus.upskillCandidates.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nobody sits exactly one level below target on this skill.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    One level from target
                  </p>
                  {focus.upskillCandidates.map(c => (
                    <div key={c.employeeId} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg">
                      <Avatar name={c.name} size="xs" />
                      <span className="text-xs text-slate-700 flex-1 truncate">{c.name}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', skillLevelColor(c.level))}>
                        {c.level}
                      </span>
                      <button
                        onClick={() => onPlanGap(c.employeeId, focus.definition.id)}
                        title="Add to development plan"
                        className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                  Evidence expected at target
                </p>
                <p className="text-[11px] text-slate-600">{focus.definition.exampleEvidence}</p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
