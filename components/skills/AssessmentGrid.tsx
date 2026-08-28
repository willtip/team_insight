'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Link2, HelpCircle, Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import { Card } from '@/components/ui/Card'
import LevelPicker from './LevelPicker'
import { resolveEmployeeSkills, summarizeEmployee, gapPriority } from '@/lib/skill-analytics'
import type { RoleProfile, SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import type { AssessmentPatch } from '@/lib/employee-store'
import type { Employee, ProficiencyLevel, SkillAssessment } from '@/lib/types'
import { cn, skillLevelColor, skillPriorityColor, proficiencyShortLabel } from '@/lib/utils'

interface AssessmentGridProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  roleProfiles: RoleProfile[]
  thresholds: SkillThresholds
  selectedId: string
  onSelect: (id: string) => void
  onSave: (edits: Record<string, AssessmentPatch>) => void
  onOpenGuide: () => void
}

type Draft = Record<string, Partial<SkillAssessment>>
type Filter = 'all' | 'unrated' | 'critical' | 'below-target'

export default function AssessmentGrid({
  employees, catalog, roleProfiles, thresholds, selectedId, onSelect, onSave, onOpenGuide,
}: AssessmentGridProps) {
  const [draft, setDraft] = useState<Draft>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)

  const employee = employees.find(e => e.id === selectedId) ?? employees[0]

  // Draft edits are layered over stored ratings so the derived columns update live.
  const preview = useMemo<Employee | undefined>(() => {
    if (!employee) return undefined
    if (Object.keys(draft).length === 0) return employee
    const bySkill = new Map((employee.skills ?? []).map(s => [s.skillId, s]))
    for (const [skillId, patch] of Object.entries(draft)) {
      bySkill.set(skillId, { ...(bySkill.get(skillId) ?? { skillId }), ...patch, skillId })
    }
    return { ...employee, skills: Array.from(bySkill.values()) }
  }, [employee, draft])

  const rows = useMemo(
    () => (preview ? resolveEmployeeSkills(preview, catalog) : []),
    [preview, catalog],
  )
  const summary = useMemo(
    () => (preview ? summarizeEmployee(preview, catalog, roleProfiles, thresholds) : undefined),
    [preview, catalog, roleProfiles, thresholds],
  )

  if (!employee || !summary) {
    return <Card><p className="text-sm text-slate-500">No engineers to assess.</p></Card>
  }

  const visible = rows.filter(r => {
    if (filter === 'unrated') return r.final === undefined
    if (filter === 'critical') return r.definition.critical
    if (filter === 'below-target') return r.gap !== undefined && r.gap > 0
    return true
  })

  const domains: string[] = []
  for (const r of visible) if (!domains.includes(r.definition.domain)) domains.push(r.definition.domain)

  const edit = (skillId: string, patch: Partial<SkillAssessment>) => {
    setSaved(false)
    setDraft(prev => ({ ...prev, [skillId]: { ...prev[skillId], ...patch } }))
  }

  const dirty = Object.keys(draft).length

  const save = () => {
    if (!dirty) return
    onSave({ [employee.id]: draft })
    setDraft({})
    setSaved(true)
  }

  const toggleDomain = (d: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })

  const pct = (n: number) => Math.round(n * 100)

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={employee.id}
            onChange={e => { setDraft({}); setSaved(false); onSelect(e.target.value) }}
            className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.title}</option>
            ))}
          </select>

          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {([
              ['all', `All ${rows.length}`],
              ['unrated', `Unrated ${rows.filter(r => r.final === undefined).length}`],
              ['critical', 'Critical'],
              ['below-target', 'Below target'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                  filter === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Scoring guide
          </button>

          <div className="ml-auto flex items-center gap-2">
            {saved && !dirty && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <Button size="sm" onClick={save} disabled={!dirty} icon={<Save className="w-3.5 h-3.5" />}>
              {dirty ? `Save ${dirty} change${dirty > 1 ? 's' : ''}` : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 mt-4 pt-3 border-t border-slate-100">
          {([
            ['Assessed', `${summary.assessed}/${summary.catalogSize}`, ''],
            [`Breadth (${thresholds.breadth}+)`, String(summary.breadth), summary.roleFit ? `target ${summary.roleFit.breadthTarget}` : ''],
            [`Depth (${thresholds.depth}+)`, String(summary.depth), summary.roleFit ? `target ${summary.roleFit.depthTarget}` : ''],
            ['Avg level', summary.avgLevel.toFixed(1), 'of 5'],
            ['At target', `${pct(summary.targetAttainment)}%`, ''],
            ['High gaps', String(summary.highGaps), ''],
          ] as const).map(([label, value, sub]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
              {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
            </div>
          ))}
        </div>

        {summary.roleFit && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4">
            <span className="text-xs text-slate-500">
              Role profile: <strong className="text-slate-700">{summary.roleFit.profile.name}</strong>
            </span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span className="text-[10px] text-slate-400 w-12">Breadth</span>
              <Progress
                value={Math.min(100, (summary.roleFit.breadth / summary.roleFit.breadthTarget) * 100)}
                color="auto"
                showLabel
                label={`${summary.roleFit.breadth}/${summary.roleFit.breadthTarget}`}
              />
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span className="text-[10px] text-slate-400 w-10">Depth</span>
              <Progress
                value={Math.min(100, (summary.roleFit.depth / summary.roleFit.depthTarget) * 100)}
                color="auto"
                showLabel
                label={`${summary.roleFit.depth}/${summary.roleFit.depthTarget}`}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_56px_92px_92px_64px_52px_84px_150px] gap-2 px-4 py-2.5 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
          <span>Skill</span>
          <span className="text-center">Critical</span>
          <span className="text-center">Target</span>
          <span className="text-center">Self</span>
          <span className="text-center">Reviewer</span>
          <span className="text-center">Final</span>
          <span className="text-center">Gap</span>
          <span className="text-center">Priority</span>
          <span>Evidence</span>
        </div>

        {domains.map(domain => {
          const domainRows = visible.filter(r => r.definition.domain === domain)
          const isCollapsed = collapsed.has(domain)
          return (
            <div key={domain}>
              <button
                onClick={() => toggleDomain(domain)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100 transition-colors"
              >
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-xs font-semibold text-slate-700">{domain}</span>
                <span className="text-[10px] text-slate-400">{domainRows.length}</span>
              </button>

              {!isCollapsed && domainRows.map(r => {
                const d = draft[r.skillId] ?? {}
                const self = 'selfRating' in d ? d.selfRating : r.self
                const reviewer = 'reviewerRating' in d ? d.reviewerRating : r.reviewer
                const final = reviewer ?? self
                const gap = final === undefined ? undefined : Math.max(0, r.target - final)
                const priority = gap === undefined ? undefined : gapPriority(gap, r.definition.critical)
                const evidence = 'evidence' in d ? d.evidence : r.evidence
                const isDirty = r.skillId in draft

                return (
                  <div
                    key={r.skillId}
                    className={cn(
                      'grid grid-cols-[1fr_60px_56px_92px_92px_64px_52px_84px_150px] gap-2 px-4 py-2 border-b border-slate-50 items-center',
                      isDirty ? 'bg-brand-50/60' : 'hover:bg-slate-50/60',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate" title={r.definition.name}>
                        {r.definition.name}
                      </p>
                      <p
                        className="text-[10px] text-slate-400 truncate"
                        title={`${r.definition.observableCapability}\n\nEvidence at target: ${r.definition.exampleEvidence}`}
                      >
                        {r.definition.subdomain} · {r.definition.observableCapability}
                      </p>
                    </div>

                    <div className="text-center">
                      {r.definition.critical && (
                        <Badge className="bg-red-50 text-red-600">Yes</Badge>
                      )}
                    </div>

                    <div className="text-center">
                      <LevelPicker
                        ariaLabel={`Target for ${r.definition.name}`}
                        value={r.target}
                        allowEmpty={false}
                        compact
                        onChange={v => edit(r.skillId, { targetOverride: v })}
                        className="w-full !px-1 text-center"
                      />
                    </div>

                    <LevelPicker
                      ariaLabel={`Self rating for ${r.definition.name}`}
                      value={self}
                      onChange={v => edit(r.skillId, { selfRating: v })}
                      className="w-full"
                    />
                    <LevelPicker
                      ariaLabel={`Reviewer rating for ${r.definition.name}`}
                      value={reviewer}
                      onChange={v => edit(r.skillId, { reviewerRating: v })}
                      className="w-full"
                    />

                    <div className="text-center">
                      {final === undefined ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold',
                            skillLevelColor(final),
                          )}
                          title={reviewer !== undefined ? 'Reviewer rating' : 'Self rating, awaiting review'}
                        >
                          {final} {proficiencyShortLabel(final)}
                        </span>
                      )}
                    </div>

                    <span
                      className={cn(
                        'text-xs font-semibold text-center',
                        gap === undefined ? 'text-slate-300'
                          : gap === 0 ? 'text-green-600'
                          : gap === 1 ? 'text-amber-600' : 'text-red-600',
                      )}
                    >
                      {gap === undefined ? '—' : gap === 0 ? '0' : `−${gap}`}
                    </span>

                    <div className="text-center">
                      {priority && (
                        <Badge className={skillPriorityColor(priority)}>{priority}</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={evidence ?? ''}
                        onChange={e => edit(r.skillId, { evidence: e.target.value })}
                        placeholder={r.definition.exampleEvidence}
                        title={`Example evidence: ${r.definition.exampleEvidence}`}
                        className="w-full text-[11px] border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-300 truncate"
                      />
                      {r.evidenceUrl && (
                        <a
                          href={r.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-brand-600"
                          title={r.evidenceUrl}
                        >
                          <Link2 className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {visible.length === 0 && (
          <p className="text-sm text-slate-400 px-4 py-8 text-center">
            No skills match this filter.
          </p>
        )}
      </div>
    </div>
  )
}
