'use client'

import { AlertTriangle, Shield, Target, ClipboardCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import Progress from '@/components/ui/Progress'
import InfoTooltip from '@/components/ui/InfoTooltip'
import Badge from '@/components/ui/Badge'
import { summarizeTeam, summarizeEmployee } from '@/lib/skill-analytics'
import type { RoleProfile, SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import type { Employee } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

interface SkillOverviewProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  roleProfiles: RoleProfile[]
  thresholds: SkillThresholds
  onSelectEmployee: (employeeId: string) => void
}

const pct = (n: number) => Math.round(n * 100)

export default function SkillOverview({
  employees, catalog, roleProfiles, thresholds, onSelectEmployee,
}: SkillOverviewProps) {
  const team = summarizeTeam(employees, catalog, thresholds)
  const people = employees
    .map(e => ({ employee: e, summary: summarizeEmployee(e, catalog, roleProfiles, thresholds) }))
    .sort((a, b) => b.summary.capabilityIndex - a.summary.capabilityIndex)

  const tiles = [
    {
      icon: Shield,
      iconClass: 'text-blue-500',
      label: 'Critical coverage',
      value: `${pct(team.criticalCoverage)}%`,
      valueClass: team.criticalCoverage >= 0.9 ? 'text-slate-900' : 'text-amber-600',
      sub: `${team.criticalSkillCount - team.criticalUncovered.length} of ${team.criticalSkillCount} critical skills have someone at level ${thresholds.coverage}+`,
      tip: `Share of critical catalog skills with at least one engineer at the coverage threshold (level ${thresholds.coverage}) or above.`,
    },
    {
      icon: AlertTriangle,
      iconClass: 'text-amber-500',
      label: 'High-priority gaps',
      value: String(team.highPriorityGaps),
      valueClass: team.highPriorityGaps > 0 ? 'text-amber-600' : 'text-slate-900',
      sub: 'critical skills two or more levels below target',
      tip: 'Counts every person × skill row where the skill is critical and the gap to target is 2 or more.',
    },
    {
      icon: Target,
      iconClass: 'text-red-500',
      label: 'Bus-factor risks',
      value: String(team.busFactorRisks.length),
      valueClass: team.busFactorRisks.length > 0 ? 'text-red-600' : 'text-slate-900',
      sub: `critical skills with one owner or none at level ${thresholds.depth}+`,
      tip: `A critical skill with at most one engineer at the depth threshold (level ${thresholds.depth}) is a single point of failure.`,
    },
    {
      icon: ClipboardCheck,
      iconClass: 'text-green-500',
      label: 'Assessment complete',
      value: `${pct(team.assessmentCompleteness)}%`,
      valueClass: 'text-slate-900',
      sub: team.oldestAssessment
        ? `oldest rating ${formatDate(team.oldestAssessment)}`
        : `${team.unassessedSkills} skills unrated by anyone`,
      tip: 'Share of all engineer × skill cells carrying a rating. Low completeness makes every other number provisional.',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {tiles.map(t => (
          <Card key={t.label} padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <t.icon className={cn('w-4 h-4', t.iconClass)} />
              <span className="text-xs font-semibold text-slate-600">{t.label}</span>
              <InfoTooltip text={t.tip} className="ml-auto" />
            </div>
            <p className={cn('text-2xl font-bold', t.valueClass)}>{t.value}</p>
            <p className="text-xs text-slate-400 leading-snug mt-0.5">{t.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Capability by domain</CardTitle>
            <CardSubtitle>
              Team average level, and the share of ratings in each domain that have
              reached their target
            </CardSubtitle>
          </CardHeader>
          <div className="space-y-2.5">
            {team.domains.map(d => (
              <div key={d.domain} className="grid grid-cols-[1fr_56px_120px_92px] gap-3 items-center">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{d.domain}</p>
                  <p className="text-[10px] text-slate-400">
                    {d.skillCount} skills · {d.criticalCount} critical
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-700 text-right">
                  {d.teamAvg.toFixed(1)}
                  <span className="text-slate-400 font-normal">/5</span>
                </span>
                <Progress
                  value={pct(d.atTargetPct)}
                  color="auto"
                  showLabel
                  className="min-w-0"
                />
                <div className="flex items-center gap-1 justify-end">
                  {d.busFactorRisks > 0 && (
                    <Badge className="bg-red-100 text-red-700">{d.busFactorRisks} risk</Badge>
                  )}
                  {d.highGaps > 0 && (
                    <Badge className="bg-amber-100 text-amber-700">{d.highGaps} gap</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team capability index</CardTitle>
            <CardSubtitle>Weighted share of required capability held</CardSubtitle>
          </CardHeader>
          <div className="space-y-2">
            {people.map(({ employee, summary }) => (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xs text-slate-700 flex-1 truncate">{employee.name}</span>
                <div className="w-20">
                  <Progress value={pct(summary.capabilityIndex)} color="auto" />
                </div>
                <span className="text-xs font-semibold text-slate-600 w-8 text-right">
                  {pct(summary.capabilityIndex)}%
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            Σ(min(level, target) × weight) ÷ Σ(target × weight) across each person&apos;s
            rated skills. Measures capability against what the role requires, not against
            a theoretical maximum.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              Deepest capability
            </CardTitle>
            <CardSubtitle>Highest team average among rated skills</CardSubtitle>
          </CardHeader>
          <div className="space-y-1.5">
            {team.strengths.map(s => (
              <div key={s.definition.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-slate-700">{s.definition.name}</span>
                <span className="text-slate-400">{s.coverage} at {thresholds.coverage}+</span>
                <span className="font-semibold text-green-600 w-8 text-right">
                  {s.teamAvg.toFixed(1)}
                </span>
              </div>
            ))}
            {team.strengths.length === 0 && (
              <p className="text-xs text-slate-400">No skills rated yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              Thinnest critical bench
            </CardTitle>
            <CardSubtitle>Critical skills with the fewest depth owners</CardSubtitle>
          </CardHeader>
          <div className="space-y-1.5">
            {team.risks.map(s => (
              <div key={s.definition.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-slate-700" title={s.definition.name}>
                  {s.definition.name}
                </span>
                <span className="text-slate-400">{s.coverage} at {thresholds.coverage}+</span>
                <span
                  className={cn(
                    'font-semibold w-16 text-right',
                    s.depthCount === 0 ? 'text-red-600'
                      : s.depthCount === 1 ? 'text-amber-600' : 'text-green-600',
                  )}
                >
                  {s.depthCount} at {thresholds.depth}+
                </span>
              </div>
            ))}
            {team.risks.length === 0 && (
              <p className="text-xs text-slate-400">No critical skills in the catalog.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
