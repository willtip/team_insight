'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LevelPicker from './LevelPicker'
import { gapPriority, resolveEmployeeSkills } from '@/lib/skill-analytics'
import { useSubmitSelfAssessment } from '@/lib/assessment-import'
import type { SelfAssessmentItem } from '@/lib/assessment-import'
import type { SkillDefinition } from '@/lib/skill-catalog'
import type { Employee, ProficiencyLevel } from '@/lib/types'
import { cn, skillLevelColor, skillPriorityColor, proficiencyShortLabel } from '@/lib/utils'

interface SelfAssessmentFormProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  defaultEmployeeId?: string
  onClose: () => void
  onSubmitted: (message: string) => void
}

interface Entry {
  selfRating?: ProficiencyLevel
  evidence?: string
}

/**
 * The in-app equivalent of the shipped `Skills_Self_Assessment_INTAKE.xlsx` workbook:
 * one row per catalog skill, rating and evidence only.
 *
 * Deliberately narrower than AssessmentGrid, which is the manager's editing surface.
 * A reviewer rating always supersedes a self rating (`finalRating = reviewerRating ??
 * selfRating`), so this never offers Reviewer or Target — it captures what the person
 * claims, with the evidence they would point at.
 */
export default function SelfAssessmentForm({
  employees, catalog, defaultEmployeeId, onClose, onSubmitted,
}: SelfAssessmentFormProps) {
  // `||` not `??`: the page seeds its selection before the employees query resolves,
  // so defaultEmployeeId arrives as '' rather than undefined.
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || employees[0]?.id || '')
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const submit = useSubmitSelfAssessment()
  // Same fallback AssessmentGrid uses, so an unresolved id still shows someone.
  const employee = employees.find(e => e.id === employeeId) ?? employees[0]

  const rows = useMemo(
    () => (employee ? resolveEmployeeSkills(employee, catalog) : []),
    [employee, catalog],
  )

  const domains = useMemo(() => {
    const seen: string[] = []
    for (const r of rows) if (!seen.includes(r.definition.domain)) seen.push(r.definition.domain)
    return seen
  }, [rows])

  const filled = Object.values(entries).filter(e => e.selfRating !== undefined || e.evidence).length

  const edit = (skillId: string, patch: Entry) =>
    setEntries(prev => ({ ...prev, [skillId]: { ...prev[skillId], ...patch } }))

  const toggle = (domain: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })

  const send = () => {
    const items: SelfAssessmentItem[] = Object.entries(entries)
      .filter(([, e]) => e.selfRating !== undefined || e.evidence)
      .map(([skillId, e]) => ({ skillId, selfRating: e.selfRating, evidence: e.evidence }))
    if (items.length === 0 || !employee) return

    setError(null)
    submit.mutate(
      { items, employeeId: employee.id },
      {
        onSuccess: result => {
          onSubmitted(`Submitted ${result.applied} rating${result.applied === 1 ? '' : 's'}.`)
          onClose()
        },
        onError: e => setError(e instanceof Error ? e.message : 'Could not submit that assessment.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Enter assessments</h2>
            <p className="text-xs text-slate-500">
              Rate against demonstrated evidence. Final, Gap and Priority are calculated.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100">
          <select
            value={employee?.id ?? ''}
            onChange={e => { setEntries({}); setEmployeeId(e.target.value) }}
            className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.title}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="flex items-start gap-2 mb-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_56px_92px_64px_84px_180px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Skill</span>
              <span className="text-center">Target</span>
              <span className="text-center">Your rating</span>
              <span className="text-center">Final</span>
              <span className="text-center">Priority</span>
              <span>Evidence</span>
            </div>

            {domains.map(domain => {
              const domainRows = rows.filter(r => r.definition.domain === domain)
              const isCollapsed = collapsed.has(domain)
              return (
                <div key={domain}>
                  <button
                    onClick={() => toggle(domain)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="text-xs font-semibold text-slate-700">{domain}</span>
                    <span className="text-[10px] text-slate-400">{domainRows.length}</span>
                  </button>

                  {!isCollapsed && domainRows.map(r => {
                    const entry = entries[r.skillId] ?? {}
                    const self = entry.selfRating !== undefined ? entry.selfRating : r.self
                    // Mirrors AssessmentGrid: reviewer wins when present, else self.
                    const final = r.reviewer ?? self
                    const gap = final === undefined ? undefined : Math.max(0, r.target - final)
                    const priority = gap === undefined ? undefined : gapPriority(gap, r.definition.critical)

                    return (
                      <div
                        key={r.skillId}
                        className={cn(
                          'grid grid-cols-[1fr_56px_92px_64px_84px_180px] gap-2 px-3 py-2 border-b border-slate-50 items-center',
                          r.skillId in entries ? 'bg-brand-50/60' : 'hover:bg-slate-50/60',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate" title={r.definition.name}>
                            {r.definition.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate" title={r.definition.observableCapability}>
                            {r.definition.observableCapability}
                          </p>
                        </div>

                        <span className="text-xs text-center text-slate-500">{r.target}</span>

                        <LevelPicker
                          ariaLabel={`Rating for ${r.definition.name}`}
                          value={self}
                          onChange={v => edit(r.skillId, { selfRating: v })}
                          className="w-full"
                        />

                        <div className="text-center">
                          {final === undefined ? (
                            <span className="text-xs text-slate-300">—</span>
                          ) : (
                            <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold', skillLevelColor(final))}>
                              {final} {proficiencyShortLabel(final)}
                            </span>
                          )}
                        </div>

                        <div className="text-center">
                          {priority && <Badge className={skillPriorityColor(priority)}>{priority}</Badge>}
                        </div>

                        <input
                          type="text"
                          value={entry.evidence ?? r.evidence ?? ''}
                          onChange={e => edit(r.skillId, { evidence: e.target.value })}
                          placeholder={r.definition.exampleEvidence}
                          title={`Example evidence: ${r.definition.exampleEvidence}`}
                          className="w-full text-[11px] border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-300 truncate"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 flex-1">
            {filled} skill{filled === 1 ? '' : 's'} filled in. Only those are submitted.
          </p>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <Button size="sm" onClick={send} loading={submit.isPending} disabled={filled === 0}>
            Submit {filled > 0 ? filled : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
