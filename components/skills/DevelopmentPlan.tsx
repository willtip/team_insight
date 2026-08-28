'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Wand2, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import { collectGaps } from '@/lib/skill-analytics'
import type { SkillDefinition } from '@/lib/skill-catalog'
import type { DevelopmentPlanItem, Employee } from '@/lib/types'
import { cn, formatDate, skillPriorityColor } from '@/lib/utils'

interface DevelopmentPlanProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  onChange: (employeeId: string, items: DevelopmentPlanItem[]) => void
}

const STATUSES: DevelopmentPlanItem['status'][] = ['Planned', 'In Progress', 'Complete']

const statusColor: Record<DevelopmentPlanItem['status'], string> = {
  Planned: 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  Complete: 'bg-green-100 text-green-700',
}

const FIELD =
  'w-full text-[11px] border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-slate-300'

/** Assignments seeded per person. A plan containing every gap is not a plan. */
const SEED_LIMIT_PER_PERSON = 4

export default function DevelopmentPlan({ employees, catalog, onChange }: DevelopmentPlanProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const byId = useMemo(() => new Map(catalog.map(s => [s.id, s])), [catalog])
  const gaps = useMemo(() => collectGaps(employees, catalog, 1), [employees, catalog])

  const total = employees.reduce((n, e) => n + (e.developmentPlan?.length ?? 0), 0)

  /**
   * Seeds each person's top few High-priority gaps as pre-filled assignments.
   * Capped deliberately: a plan with every gap in it is not a plan.
   */
  const seedFromGaps = () => {
    const now = new Date().toISOString()
    const due = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10)

    for (const emp of employees) {
      const existing = emp.developmentPlan ?? []
      const additions: DevelopmentPlanItem[] = []

      for (const g of gaps) {
        if (additions.length >= SEED_LIMIT_PER_PERSON) break
        if (g.employeeId !== emp.id || g.row.priority !== 'High') continue
        if (existing.some(i => i.skillId === g.row.skillId)) continue
        const def = byId.get(g.row.skillId)
        if (!def) continue

        additions.push({
          id: `dev-${emp.id}-${g.row.skillId}-${Date.now()}`,
          employeeId: emp.id,
          skillId: g.row.skillId,
          objective: `Reach level ${g.row.target} — ${def.observableCapability}`,
          experienceAssignment: '',
          coach: '',
          course: '',
          dueDate: due,
          successEvidence: def.exampleEvidence,
          status: 'Planned',
          createdAt: now,
        })
      }

      if (additions.length) onChange(emp.id, [...existing, ...additions])
    }
  }

  const addBlank = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return
    onChange(employeeId, [
      ...(emp.developmentPlan ?? []),
      {
        id: `dev-${employeeId}-${Date.now()}`,
        employeeId,
        skillId: catalog[0]?.id ?? '',
        objective: '',
        experienceAssignment: '',
        coach: '',
        course: '',
        dueDate: '',
        successEvidence: '',
        status: 'Planned',
        createdAt: new Date().toISOString(),
      },
    ])
    setExpanded(prev => new Set(prev).add(employeeId))
  }

  const patch = (employeeId: string, itemId: string, updates: Partial<DevelopmentPlanItem>) => {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return
    onChange(
      employeeId,
      (emp.developmentPlan ?? []).map(i => (i.id === itemId ? { ...i, ...updates } : i)),
    )
  }

  const remove = (employeeId: string, itemId: string) => {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return
    onChange(employeeId, (emp.developmentPlan ?? []).filter(i => i.id !== itemId))
  }

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const highGapCount = gaps.filter(g => g.row.priority === 'High').length

  // How many rows the seed button would actually add right now.
  const seedable = employees.reduce((n, emp) => {
    const existing = emp.developmentPlan ?? []
    const candidates = gaps.filter(
      g => g.employeeId === emp.id &&
        g.row.priority === 'High' &&
        !existing.some(i => i.skillId === g.row.skillId),
    )
    return n + Math.min(SEED_LIMIT_PER_PERSON, candidates.length)
  }, 0)

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {total} assignment{total === 1 ? '' : 's'} across the team
            </p>
            <p className="text-xs text-slate-500">
              Gaps become work: an experience assignment, a coach, and evidence that closes it.
              {highGapCount > 0 && (
                <> {highGapCount} High-priority gaps outstanding across the team.</>
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={seedFromGaps}
            disabled={seedable === 0}
            title={`Adds each engineer's top ${SEED_LIMIT_PER_PERSON} High-priority gaps`}
            icon={<Wand2 className="w-3.5 h-3.5" />}
          >
            Seed top {SEED_LIMIT_PER_PERSON} per engineer ({seedable})
          </Button>
        </div>
      </Card>

      {employees.map(emp => {
        const items = emp.developmentPlan ?? []
        const open = expanded.has(emp.id)
        return (
          <Card key={emp.id} padding="none">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggle(emp.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                {open
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <Avatar name={emp.name} size="xs" />
                <span className="text-sm font-medium text-slate-800">{emp.name}</span>
                <span className="text-xs text-slate-400 truncate">{emp.title}</span>
                <Badge className="ml-2">{items.length}</Badge>
                {items.some(i => i.status === 'In Progress') && (
                  <Badge className="bg-blue-100 text-blue-700">
                    {items.filter(i => i.status === 'In Progress').length} in progress
                  </Badge>
                )}
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addBlank(emp.id)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>

            {open && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 py-2">
                    No assignments yet. Seed from gaps above, or add one manually.
                  </p>
                )}

                {items.map(item => {
                  const def = byId.get(item.skillId)
                  const gap = gaps.find(
                    g => g.employeeId === emp.id && g.row.skillId === item.skillId,
                  )
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.skillId}
                          onChange={e => patch(emp.id, item.id, { skillId: e.target.value })}
                          className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {catalog.map(s => (
                            <option key={s.id} value={s.id}>{s.domain} — {s.name}</option>
                          ))}
                        </select>

                        {gap && (
                          <Badge className={skillPriorityColor(gap.row.priority!)}>
                            {gap.row.final} → {gap.row.target}
                          </Badge>
                        )}

                        <select
                          value={item.status}
                          onChange={e =>
                            patch(emp.id, item.id, {
                              status: e.target.value as DevelopmentPlanItem['status'],
                            })
                          }
                          className={cn(
                            'text-[11px] font-medium rounded-md px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-brand-500',
                            statusColor[item.status],
                          )}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <button
                          onClick={() => remove(emp.id, item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        className={FIELD}
                        value={item.objective}
                        onChange={e => patch(emp.id, item.id, { objective: e.target.value })}
                        placeholder="Objective — what capability this builds"
                      />

                      <div className="grid grid-cols-4 gap-2">
                        <input
                          className={FIELD}
                          value={item.experienceAssignment}
                          onChange={e => patch(emp.id, item.id, { experienceAssignment: e.target.value })}
                          placeholder="Experience assignment"
                        />
                        <input
                          className={FIELD}
                          value={item.coach}
                          onChange={e => patch(emp.id, item.id, { coach: e.target.value })}
                          placeholder="Coach / reviewer"
                        />
                        <input
                          className={FIELD}
                          value={item.course}
                          onChange={e => patch(emp.id, item.id, { course: e.target.value })}
                          placeholder="Course / lab"
                        />
                        <input
                          type="date"
                          className={FIELD}
                          value={item.dueDate}
                          onChange={e => patch(emp.id, item.id, { dueDate: e.target.value })}
                        />
                      </div>

                      <input
                        className={FIELD}
                        value={item.successEvidence}
                        onChange={e => patch(emp.id, item.id, { successEvidence: e.target.value })}
                        placeholder={def?.exampleEvidence ?? 'Success evidence'}
                      />

                      {item.dueDate && (
                        <p className="text-[10px] text-slate-400">
                          Due {formatDate(item.dueDate)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
