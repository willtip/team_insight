'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useEmployees } from '@/lib/employee-store'
import { useSkillCatalog } from '@/lib/skill-catalog-store'
import { useOrganizations, useTeams } from '@/lib/organization-store'
import LevelPicker from '@/components/skills/LevelPicker'
import ScoringGuide from '@/components/skills/ScoringGuide'
import { PROFICIENCY_ANCHORS } from '@/lib/skill-catalog'
import {
  cn, skillLevelColor, BREADTH_THRESHOLD, DEPTH_THRESHOLD,
} from '@/lib/utils'
import { X, Plus, Trash2, Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'
import type {
  Employee, ProficiencyLevel, SkillAssessment, PromotionReadiness,
} from '@/lib/types'

type SkillFilter = 'all' | 'below' | 'review'

const SKILL_GRID = 'grid grid-cols-[minmax(0,1fr)_168px_168px_52px_52px_32px] gap-2 items-center'

type Tab = 'info' | 'skills'

interface Props {
  employee?: Employee
  onClose: () => void
}

interface SkillDraft {
  skillId: string
  selfRating?: ProficiencyLevel
  reviewerRating?: ProficiencyLevel
  targetOverride?: ProficiencyLevel
}

const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'text-xs font-medium text-slate-700 mb-1 block'

/** ISO datetime/date strings -> the yyyy-MM-dd shape <input type="date"> requires,
 * otherwise the browser silently renders the field blank. */
function toDateInputValue(value?: string): string {
  if (!value) return ''
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : ''
}

export default function EmployeeFormModal({ employee, onClose }: Props) {
  const { employees, addEmployee, updateEmployee } = useEmployees()
  const { catalog, skillById, roleProfiles } = useSkillCatalog()
  const { data: organizations = [] } = useOrganizations()
  const isEdit = !!employee

  const [tab, setTab] = useState<Tab>('info')
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    title: employee?.title ?? '',
    level: employee?.level ?? 'L4',
    department: employee?.department ?? 'Automation Solution Engineering',
    email: employee?.email ?? '',
    location: employee?.location ?? '',
    hireDate: toDateInputValue(employee?.hireDate),
    bio: employee?.bio ?? '',
    careerAspirations: employee?.careerAspirations ?? '',
    promotionReadiness: (employee?.promotionReadiness ?? 'Ready in 12 Months') as PromotionReadiness,
    isHighPotential: employee?.isHighPotential ?? false,
    needsCoaching: employee?.needsCoaching ?? false,
    tags: employee?.tags.join(', ') ?? '',
    roleProfileId: employee?.roleProfileId ?? '',
    managerId: employee?.managerId ?? '',
    organizationId: employee?.organizationId ?? '',
    teamId: employee?.teamId ?? '',
  })
  const { data: teams = [] } = useTeams(form.organizationId || undefined)

  /** Year segment of a native date input can be typed past 4 digits in some
   * browsers; clamp anything outside a sane yyyy-MM-dd shape rather than storing it. */
  const handleHireDateChange = (value: string) => {
    const [year = '', month = '', day = ''] = value.split('-')
    if (year.length > 4) return
    setForm(f => ({ ...f, hireDate: [year, month, day].filter(Boolean).join('-') }))
  }

  const [skills, setSkills] = useState<SkillDraft[]>(
    employee?.skills.map(s => ({
      skillId: s.skillId,
      selfRating: s.selfRating,
      reviewerRating: s.reviewerRating,
      targetOverride: s.targetOverride,
    })) ?? []
  )

  const [newSkillId, setNewSkillId] = useState('')
  const [newLevel, setNewLevel] = useState<ProficiencyLevel>(2)
  const [adding, setAdding] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const unrated = catalog.filter(c => !skills.some(s => s.skillId === c.id))

  const addSkill = () => {
    if (!newSkillId) return
    setSkills(prev => [...prev, { skillId: newSkillId, reviewerRating: newLevel }])
    setNewSkillId('')
    setAdding(false)
  }

  const patchSkill = (skillId: string, patch: Partial<SkillDraft>) =>
    setSkills(prev => prev.map(s => (s.skillId === skillId ? { ...s, ...patch } : s)))

  /** Each draft resolved against its catalog definition, for display and filtering. */
  const rows = useMemo(() => skills.map(draft => {
    const def = skillById.get(draft.skillId)
    const final = draft.reviewerRating ?? draft.selfRating
    const target = draft.targetOverride ?? def?.targetLevel ?? 3
    return {
      draft,
      def,
      final,
      target,
      gap: final === undefined ? undefined : Math.max(0, target - final),
      awaitingReview: draft.selfRating !== undefined && draft.reviewerRating === undefined,
    }
  }), [skills, skillById])

  const visibleRows = useMemo(() => {
    const q = skillQuery.trim().toLowerCase()
    return rows.filter(r => {
      if (skillFilter === 'below' && !(r.gap && r.gap > 0)) return false
      if (skillFilter === 'review' && !r.awaitingReview) return false
      if (!q) return true
      const d = r.def
      return !d
        ? r.draft.skillId.toLowerCase().includes(q)
        : d.name.toLowerCase().includes(q) ||
          d.domain.toLowerCase().includes(q) ||
          d.subdomain.toLowerCase().includes(q)
    })
  }, [rows, skillQuery, skillFilter])

  /** Visible rows bucketed by domain, in catalog order. */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleRows>()
    for (const r of visibleRows) {
      const key = r.def?.domain ?? 'Not in the current catalog'
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return Array.from(map.entries())
  }, [visibleRows])

  const summary = useMemo(() => {
    const rated = rows.filter(r => r.final !== undefined)
    return {
      assessed: rated.length,
      breadth: rated.filter(r => r.final! >= BREADTH_THRESHOLD).length,
      depth: rated.filter(r => r.final! >= DEPTH_THRESHOLD).length,
      belowTarget: rated.filter(r => r.gap && r.gap > 0).length,
      awaitingReview: rows.filter(r => r.awaitingReview).length,
    }
  }, [rows])

  const activeProfile = roleProfiles.find(p => p.id === form.roleProfileId)

  const toggleDomain = (d: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })

  const handleSave = () => {
    if (!form.name.trim() || !form.title.trim()) return

    // Only re-stamp rows whose ratings actually changed — otherwise every save
    // would reset assessment dates across the whole catalog and destroy the
    // freshness signal the Overview and the workbook export rely on.
    const now = new Date().toISOString()
    const original = new Map((employee?.skills ?? []).map(a => [a.skillId, a]))
    const builtSkills: SkillAssessment[] = skills.map(s => {
      const prev = original.get(s.skillId)
      const unchanged =
        prev &&
        prev.selfRating === s.selfRating &&
        prev.reviewerRating === s.reviewerRating &&
        prev.targetOverride === s.targetOverride
      return {
        ...prev,
        skillId: s.skillId,
        selfRating: s.selfRating,
        reviewerRating: s.reviewerRating,
        targetOverride: s.targetOverride,
        assessedAt: unchanged ? prev!.assessedAt : now,
        assessedBy: unchanged ? prev!.assessedBy : 'William Tipton',
      }
    })

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    if (isEdit && employee) {
      updateEmployee(employee.id, {
        name: form.name, title: form.title, level: form.level,
        department: form.department, email: form.email, location: form.location,
        hireDate: form.hireDate, bio: form.bio, careerAspirations: form.careerAspirations,
        promotionReadiness: form.promotionReadiness, isHighPotential: form.isHighPotential,
        needsCoaching: form.needsCoaching, tags, skills: builtSkills,
        roleProfileId: form.roleProfileId || undefined,
        managerId: form.managerId || undefined,
        organizationId: form.organizationId || undefined,
        teamId: form.teamId || undefined,
      })
    } else {
      addEmployee({
        name: form.name, title: form.title, level: form.level,
        department: form.department, email: form.email, location: form.location,
        hireDate: form.hireDate, bio: form.bio, careerAspirations: form.careerAspirations,
        promotionReadiness: form.promotionReadiness, isHighPotential: form.isHighPotential,
        needsCoaching: form.needsCoaching, tags, skills: builtSkills,
        roleProfileId: form.roleProfileId || undefined,
        managerId: form.managerId || undefined,
        organizationId: form.organizationId || undefined,
        teamId: form.teamId || undefined,
        employeeId: `ASE-${Date.now().toString().slice(-5)}`,
        goals: [], projectContributions: [], notes: [], accomplishments: [],
        development: { certifications: [], training: [], conferences: [], mentoring: [] },
        performanceScore: {
          overall: 75, goalAchievement: 75, projectContributions: 75,
          professionalDevelopment: 70, leadershipBehaviors: 70, collaboration: 75,
          innovation: 70, growthScore: 70, leadershipReadiness: 65,
          promotionReadiness: 60, trend: 'stable', lastCalculated: new Date().toISOString(),
        },
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'bg-white rounded-2xl w-full max-h-[90vh] flex flex-col shadow-xl transition-[max-width] duration-200',
          // The skills tab is a data grid and needs the room; the info form does not.
          tab === 'skills' ? 'max-w-5xl' : 'max-w-2xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit ${employee.name}` : 'Add Team Member'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {(['info', 'skills'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              )}>
              {t === 'info' ? 'Basic Info' : `Skills (${skills.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={INPUT} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className={LABEL}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={INPUT} placeholder="Senior AI Solutions Engineer" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Level</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={INPUT}>
                    {['L3', 'L4', 'L5', 'L6'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={LABEL}>Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={INPUT} placeholder="jane.smith@company.com" />
                </div>
                <div>
                  <label className={LABEL}>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className={INPUT} placeholder="Austin, TX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Hire Date</label>
                  <input
                    type="date"
                    value={form.hireDate}
                    min="1900-01-01"
                    max="9999-12-31"
                    onChange={e => handleHireDateChange(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Promotion Readiness</label>
                  <select value={form.promotionReadiness}
                    onChange={e => setForm(f => ({ ...f, promotionReadiness: e.target.value as PromotionReadiness }))} className={INPUT}>
                    {(['Ready Now', 'Ready in 6 Months', 'Ready in 12 Months', 'Development Needed'] as PromotionReadiness[]).map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Organization</label>
                  <select
                    value={form.organizationId}
                    onChange={e => setForm(f => ({ ...f, organizationId: e.target.value, teamId: '' }))}
                    className={INPUT}
                  >
                    <option value="">— None —</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Team</label>
                  <select
                    value={form.teamId}
                    onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                    className={INPUT}
                    disabled={!form.organizationId}
                  >
                    <option value="">— None —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Reports To (Manager)</label>
                  <select
                    value={form.managerId}
                    onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="">— None —</option>
                    {employees.filter(e => e.id !== employee?.id).map(e => (
                      <option key={e.id} value={e.id}>{e.name} — {e.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Bio</label>
                <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className={cn(INPUT, 'resize-none')} placeholder="Background and expertise summary..." />
              </div>
              <div>
                <label className={LABEL}>Career Aspirations</label>
                <textarea rows={2} value={form.careerAspirations} onChange={e => setForm(f => ({ ...f, careerAspirations: e.target.value }))}
                  className={cn(INPUT, 'resize-none')} placeholder="Long-term goals and development interests..." />
              </div>
              <div>
                <label className={LABEL}>Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className={INPUT} placeholder="AI Specialist, On-Call Lead, Ansible Expert" />
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isHighPotential}
                    onChange={e => setForm(f => ({ ...f, isHighPotential: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-slate-700">High Potential</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.needsCoaching}
                    onChange={e => setForm(f => ({ ...f, needsCoaching: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-slate-700">Needs Coaching</span>
                </label>
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="space-y-4">
              {/* Role profile + live totals */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
                <div>
                  <label className={LABEL} htmlFor="emp-role">Role profile</label>
                  <select
                    id="emp-role"
                    value={form.roleProfileId}
                    onChange={e => setForm(f => ({ ...f, roleProfileId: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="">— No profile —</option>
                    {roleProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} · breadth {p.breadthTarget} / depth {p.depthTarget}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeProfile
                      ? activeProfile.primaryOutcome
                      : 'Sets the breadth and depth targets this engineer is measured against.'}
                  </p>
                </div>

                <div className="flex gap-4 pt-5">
                  {([
                    ['Rated', `${summary.assessed}`, `of ${catalog.length}`],
                    ['Breadth', `${summary.breadth}`, activeProfile ? `of ${activeProfile.breadthTarget}` : '2+'],
                    ['Depth', `${summary.depth}`, activeProfile ? `of ${activeProfile.depthTarget}` : '4+'],
                    ['Below target', `${summary.belowTarget}`, ''],
                  ] as const).map(([label, value, sub]) => (
                    <div key={label} className="text-center min-w-[64px]">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="text-base font-semibold text-slate-800 leading-tight">{value}</p>
                      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* What the numbers mean — the whole point of an anchored scale */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Rate on recent demonstrated evidence
                  </p>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="ml-auto flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Full scoring guide
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {PROFICIENCY_ANCHORS.map(a => (
                    <div
                      key={a.level}
                      className="rounded-lg bg-white border border-slate-200 px-2 py-1.5"
                      title={`${a.observableBehavior} · ${a.independence} · evidence: ${a.evidence}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold',
                          skillLevelColor(a.level),
                        )}>
                          {a.level}
                        </span>
                        <span className="text-[10px] font-medium text-slate-700 truncate">{a.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                        {a.independence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Filter by skill, domain or subdomain…"
                    value={skillQuery}
                    onChange={e => setSkillQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {([
                    ['all', `All ${rows.length}`],
                    ['below', `Below target ${summary.belowTarget}`],
                    ['review', `Awaiting review ${summary.awaitingReview}`],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSkillFilter(id)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                        skillFilter === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAdding(a => !a)}
                  disabled={unrated.length === 0}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add rating
                </Button>
              </div>

              {/* Add a rating */}
              {adding && (
                <div className="rounded-xl border-2 border-brand-200 bg-brand-50/40 p-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                        Catalog skill ({unrated.length} not yet rated)
                      </label>
                      <select
                        value={newSkillId}
                        onChange={e => setNewSkillId(e.target.value)}
                        className={INPUT}
                      >
                        <option value="">Select a skill…</option>
                        {unrated.map(c => (
                          <option key={c.id} value={c.id}>{c.domain} — {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 mb-1 block">Level</label>
                      <LevelPicker
                        value={newLevel}
                        allowEmpty={false}
                        onChange={v => setNewLevel(v ?? 2)}
                        className="!py-2 !text-sm w-44"
                        ariaLabel="Level for the new rating"
                      />
                    </div>
                    <Button size="sm" onClick={addSkill} disabled={!newSkillId}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                  </div>
                  {newSkillId && (
                    <p className="text-[11px] text-slate-600 mt-2">
                      {skillById.get(newSkillId)?.observableCapability}
                    </p>
                  )}
                </div>
              )}

              {/* Ratings grid */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={cn(
                  SKILL_GRID,
                  'px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500',
                )}>
                  <span>Skill</span>
                  <span>Self rating</span>
                  <span>Reviewer rating</span>
                  <span className="text-center">Target</span>
                  <span className="text-center">Gap</span>
                  <span />
                </div>

                {grouped.map(([domain, domainRows]) => {
                  const isCollapsed = collapsed.has(domain)
                  return (
                    <div key={domain}>
                      <button
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        {isCollapsed
                          ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-xs font-semibold text-slate-700">{domain}</span>
                        <span className="text-[10px] text-slate-400">{domainRows.length}</span>
                      </button>

                      {!isCollapsed && domainRows.map(({ draft, def, final, target, gap, awaitingReview }) => (
                        <div
                          key={draft.skillId}
                          className={cn(SKILL_GRID, 'px-3 py-2 border-b border-slate-50 hover:bg-slate-50/60')}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {def?.name ?? draft.skillId}
                              </p>
                              {def?.critical && (
                                <Badge className="bg-red-50 text-red-600 flex-shrink-0">critical</Badge>
                              )}
                              {awaitingReview && (
                                <Badge className="bg-amber-50 text-amber-700 flex-shrink-0">self only</Badge>
                              )}
                            </div>
                            <p
                              className="text-[10px] text-slate-400 truncate"
                              title={def ? `${def.observableCapability}\n\nEvidence at target: ${def.exampleEvidence}` : undefined}
                            >
                              {def?.observableCapability ?? 'Not in the current catalog'}
                            </p>
                          </div>

                          <LevelPicker
                            value={draft.selfRating}
                            onChange={v => patchSkill(draft.skillId, { selfRating: v })}
                            className="w-full"
                            ariaLabel={`Self rating for ${def?.name ?? draft.skillId}`}
                          />
                          <LevelPicker
                            value={draft.reviewerRating}
                            onChange={v => patchSkill(draft.skillId, { reviewerRating: v })}
                            className="w-full"
                            ariaLabel={`Reviewer rating for ${def?.name ?? draft.skillId}`}
                          />

                          <div className="flex justify-center">
                            <LevelPicker
                              value={target}
                              allowEmpty={false}
                              compact
                              onChange={v => patchSkill(draft.skillId, { targetOverride: v })}
                              className="w-full !px-1 text-center"
                              ariaLabel={`Target for ${def?.name ?? draft.skillId}`}
                            />
                          </div>

                          <span
                            className={cn(
                              'text-xs font-semibold text-center',
                              gap === undefined ? 'text-slate-300'
                                : gap === 0 ? 'text-green-600'
                                : gap === 1 ? 'text-amber-600' : 'text-red-600',
                            )}
                            title={
                              final === undefined
                                ? 'Not rated'
                                : `Final ${final} against target ${target}`
                            }
                          >
                            {gap === undefined ? '—' : gap === 0 ? '✓' : `−${gap}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSkills(prev => prev.filter(x => x.skillId !== draft.skillId))}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors justify-self-center"
                            title="Remove this rating"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {rows.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-10 px-4">
                    No skills rated yet. Add one above, or use the Assessment tab on the
                    Skills Matrix to work through the whole catalog at once.
                  </p>
                )}
                {rows.length > 0 && visibleRows.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-10">
                    No skills match this filter.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.title.trim()}>
            {isEdit ? 'Save Changes' : 'Add to Team'}
          </Button>
        </div>
      </div>

      {/* Rendered after the dialog so it layers above it. */}
      <ScoringGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
