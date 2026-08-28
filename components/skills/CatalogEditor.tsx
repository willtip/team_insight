'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Trash2, RotateCcw, ChevronDown, ChevronRight, ExternalLink, Pencil, Users,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import { Card, CardTitle, CardSubtitle } from '@/components/ui/Card'
import LevelPicker from './LevelPicker'
import SkillEditorModal from './SkillEditorModal'
import RoleProfileModal from './RoleProfileModal'
import ThresholdSettings from './ThresholdSettings'
import { summarizeEmployee, summarizeAllSkills } from '@/lib/skill-analytics'
import { CATALOG_SOURCES } from '@/lib/skill-catalog'
import type { RoleProfile, SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import type { Employee } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CatalogEditorProps {
  employees: Employee[]
  catalog: SkillDefinition[]
  domains: string[]
  roleProfiles: RoleProfile[]
  thresholds: SkillThresholds
  onUpdateThresholds: (updates: Partial<SkillThresholds>) => void

  onAddSkill: (data: Omit<SkillDefinition, 'id' | 'code'>) => void
  onUpdateSkill: (id: string, updates: Partial<SkillDefinition>) => void
  onDeleteSkill: (id: string) => void

  onAddRoleProfile: (data: Omit<RoleProfile, 'id'>) => void
  onUpdateRoleProfile: (id: string, updates: Partial<RoleProfile>) => void
  onDeleteRoleProfile: (id: string) => void

  onResetPreset: () => void
  onAssignRole: (employeeId: string, roleProfileId: string) => void
}

const GRID = 'grid grid-cols-[1fr_120px_70px_70px_70px_80px_64px] gap-3'

export default function CatalogEditor({
  employees, catalog, domains, roleProfiles, thresholds, onUpdateThresholds,
  onAddSkill, onUpdateSkill, onDeleteSkill,
  onAddRoleProfile, onUpdateRoleProfile, onDeleteRoleProfile,
  onResetPreset, onAssignRole,
}: CatalogEditorProps) {
  const [tab, setTab] = useState<'catalog' | 'roles'>('catalog')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [confirmReset, setConfirmReset] = useState(false)

  // `true` means "create new"; a definition means "edit that one".
  const [skillEditor, setSkillEditor] = useState<SkillDefinition | true | null>(null)
  const [roleEditor, setRoleEditor] = useState<RoleProfile | true | null>(null)

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of summarizeAllSkills(employees, catalog, thresholds)) {
      counts.set(s.definition.id, s.assessedCount)
    }
    return counts
  }, [employees, catalog, thresholds])

  const assignedByRole = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of employees) {
      if (!e.roleProfileId) continue
      map.set(e.roleProfileId, [...(map.get(e.roleProfileId) ?? []), e.name])
    }
    return map
  }, [employees])

  const rolesUsingSkill = (skillId: string) =>
    roleProfiles.filter(p => p.depthSkillIds.includes(skillId)).map(p => p.name)

  const toggle = (d: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })

  const deleteRole = (id: string) => {
    // Clear the assignment first so nobody points at a profile that is gone.
    for (const e of employees) {
      if (e.roleProfileId === id) onAssignRole(e.id, '')
    }
    onDeleteRoleProfile(id)
    setRoleEditor(null)
  }

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {([
              ['catalog', `Skill catalog (${catalog.length})`],
              ['roles', `Role profiles (${roleProfiles.length})`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  tab === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {confirmReset ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-600">
                  Discard all catalog and role-profile edits, restoring the shipped set?
                </span>
                <Button size="sm" variant="danger" onClick={() => { onResetPreset(); setConfirmReset(false) }}>
                  Reset
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmReset(true)}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset to preset
              </Button>
            )}
            {tab === 'catalog' ? (
              <Button size="sm" onClick={() => setSkillEditor(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                Add skill
              </Button>
            ) : (
              <Button size="sm" onClick={() => setRoleEditor(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                New role profile
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Skill catalog ─────────────────────────────────────── */}
      {tab === 'catalog' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className={cn(GRID, 'px-4 py-2.5 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50')}>
              <span>Skill / observable capability</span>
              <span>Subdomain</span>
              <span className="text-center">Critical</span>
              <span className="text-center">Target</span>
              <span className="text-center">Weight</span>
              <span className="text-center">Rated by</span>
              <span className="text-center">Edit</span>
            </div>

            {domains.map(domain => {
              const rows = catalog.filter(s => s.domain === domain)
              if (rows.length === 0) return null
              const isCollapsed = collapsed.has(domain)
              return (
                <div key={domain}>
                  <button
                    onClick={() => toggle(domain)}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="text-xs font-semibold text-slate-700">{domain}</span>
                    <span className="text-[10px] text-slate-400">
                      {rows.length} · {rows.filter(s => s.critical).length} critical
                    </span>
                  </button>

                  {!isCollapsed && rows.map(s => (
                    <div
                      key={s.id}
                      className={cn(GRID, 'px-4 py-2 border-b border-slate-50 items-center hover:bg-slate-50/60')}
                    >
                      <button
                        onClick={() => setSkillEditor(s)}
                        className="min-w-0 text-left group"
                        title="Edit this skill"
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                            {s.name}
                          </p>
                          {s.custom && <Badge className="bg-violet-100 text-violet-700">custom</Badge>}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate" title={s.observableCapability}>
                          {s.observableCapability || <em>No observable capability set</em>}
                        </p>
                      </button>

                      <span className="text-[11px] text-slate-500 truncate">{s.subdomain}</span>

                      <div className="text-center">
                        <input
                          type="checkbox"
                          checked={s.critical}
                          onChange={e => onUpdateSkill(s.id, { critical: e.target.checked })}
                          className="w-3.5 h-3.5 accent-brand-600"
                          aria-label={`${s.name} is critical`}
                        />
                      </div>

                      <div className="text-center">
                        <LevelPicker
                          value={s.targetLevel}
                          allowEmpty={false}
                          compact
                          onChange={v => onUpdateSkill(s.id, { targetLevel: v ?? 3 })}
                          className="w-full !px-1 text-center"
                          ariaLabel={`Target level for ${s.name}`}
                        />
                      </div>

                      <input
                        type="number" step="0.1" min="0.1" max="3"
                        value={s.weight}
                        onChange={e => onUpdateSkill(s.id, { weight: Number(e.target.value) })}
                        className="w-full text-xs border border-slate-200 rounded-md px-1.5 py-1 text-center"
                        aria-label={`Weight for ${s.name}`}
                      />

                      <span className="text-[11px] text-slate-500 text-center">
                        {usage.get(s.id) ?? 0}/{employees.length}
                      </span>

                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setSkillEditor(s)}
                          title="Edit skill"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {catalog.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-slate-500">The catalog is empty.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add a skill, or reset to the shipped preset.
                </p>
              </div>
            )}
          </div>

          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-700 mb-2">Reference sources</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
              {CATALOG_SOURCES.map(s => (
                <li key={s.url} className="text-[11px] text-slate-500 truncate">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                  >
                    {s.name}<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {' — '}{s.relevance}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* ── Role profiles ─────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <ThresholdSettings
            employees={employees}
            catalog={catalog}
            thresholds={thresholds}
            onChange={onUpdateThresholds}
          />

          <Card padding="none">
            <div className="px-4 py-3 border-b border-slate-100">
              <CardTitle>Role assignment and fit</CardTitle>
              <CardSubtitle>
                <strong>Breadth</strong> is how many of the {catalog.length} catalog skills this
                engineer can work at level {thresholds.breadth}+. <strong>Depth</strong> is how
                many they own at level {thresholds.depth}+. Each profile sets the target for both.
              </CardSubtitle>
            </div>
            <div className="divide-y divide-slate-50">
              {employees.map(emp => {
                const summary = summarizeEmployee(emp, catalog, roleProfiles, thresholds)
                const fit = summary.roleFit
                return (
                  <div key={emp.id} className="grid grid-cols-[180px_220px_1fr_1fr] gap-4 px-4 py-2.5 items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.title}</p>
                    </div>

                    <select
                      value={emp.roleProfileId ?? ''}
                      onChange={e => onAssignRole(emp.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">— No profile —</option>
                      {roleProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {fit ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-12">Breadth</span>
                          <Progress
                            value={fit.breadthTarget ? Math.min(100, (fit.breadth / fit.breadthTarget) * 100) : 100}
                            color="auto" showLabel
                            label={`${fit.breadth}/${fit.breadthTarget}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-10">Depth</span>
                          <Progress
                            value={fit.depthTarget ? Math.min(100, (fit.depth / fit.depthTarget) * 100) : 100}
                            color="auto" showLabel
                            label={`${fit.depth}/${fit.depthTarget}`}
                          />
                          {fit.depthAreasMissing.length > 0 && (
                            <span
                              className="text-[10px] text-amber-600 whitespace-nowrap"
                              title={fit.depthAreasMissing
                                .map(id => catalog.find(s => s.id === id)?.name ?? id)
                                .join('\n')}
                            >
                              {fit.depthAreasMissing.length} depth area
                              {fit.depthAreasMissing.length === 1 ? '' : 's'} short
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="col-span-2 text-[11px] text-slate-400">
                        Assign a profile to measure breadth and depth against a target.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {roleProfiles.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-slate-500 text-center">No role profiles yet.</p>
              <p className="text-xs text-slate-400 text-center mt-1">
                Create one to give engineers breadth and depth targets to be measured against.
              </p>
              <div className="flex justify-center mt-3">
                <Button size="sm" onClick={() => setRoleEditor(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                  New role profile
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {roleProfiles.map(p => {
                const assigned = assignedByRole.get(p.id) ?? []
                return (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="min-w-0">
                        <CardTitle>{p.name}</CardTitle>
                        <CardSubtitle>{p.primaryOutcome || 'No primary outcome set'}</CardSubtitle>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setRoleEditor(p)}
                          title="Edit profile"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRoleEditor(p)}
                          title="Delete profile"
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <dl className="space-y-2 text-[11px]">
                      {([
                        ['Depth areas', p.depthAreas],
                        ['Working breadth', p.workingBreadth],
                        ['AI-era expectation', p.aiExpectation],
                        ['Evidence', p.evidence],
                      ] as const)
                        .filter(([, value]) => !!value)
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
                            <dd className="text-slate-600">{value}</dd>
                          </div>
                        ))}
                    </dl>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-700">
                        Breadth target {p.breadthTarget}
                      </Badge>
                      <Badge className="bg-indigo-100 text-indigo-700">
                        Depth target {p.depthTarget}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {p.depthSkillIds.length} mapped depth skills
                      </span>
                      {assigned.length > 0 && (
                        <span
                          className="ml-auto flex items-center gap-1 text-[10px] text-slate-500"
                          title={assigned.join('\n')}
                        >
                          <Users className="w-3 h-3" />
                          {assigned.length} assigned
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Editors ───────────────────────────────────────────── */}
      {skillEditor && (
        <SkillEditorModal
          skill={skillEditor === true ? undefined : skillEditor}
          domains={domains}
          ratingCount={skillEditor === true ? 0 : usage.get(skillEditor.id) ?? 0}
          usedByRoles={skillEditor === true ? [] : rolesUsingSkill(skillEditor.id)}
          onSave={data => {
            if (skillEditor === true) onAddSkill(data)
            else onUpdateSkill(skillEditor.id, data)
            setSkillEditor(null)
          }}
          onDelete={
            skillEditor === true
              ? undefined
              : () => { onDeleteSkill(skillEditor.id); setSkillEditor(null) }
          }
          onClose={() => setSkillEditor(null)}
        />
      )}

      {roleEditor && (
        <RoleProfileModal
          profile={roleEditor === true ? undefined : roleEditor}
          catalog={catalog}
          thresholds={thresholds}
          assignedNames={roleEditor === true ? [] : assignedByRole.get(roleEditor.id) ?? []}
          onSave={data => {
            if (roleEditor === true) onAddRoleProfile(data)
            else onUpdateRoleProfile(roleEditor.id, data)
            setRoleEditor(null)
          }}
          onDelete={roleEditor === true ? undefined : () => deleteRole(roleEditor.id)}
          onClose={() => setRoleEditor(null)}
        />
      )}
    </div>
  )
}
