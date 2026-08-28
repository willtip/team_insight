'use client'

import { useMemo, useState } from 'react'
import { X, Trash2, AlertTriangle, Search, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { PROFICIENCY_LABELS } from '@/lib/types'
import type { RoleProfile, SkillDefinition, SkillThresholds } from '@/lib/skill-catalog'
import { cn } from '@/lib/utils'

interface RoleProfileModalProps {
  /** Omit to create a new profile. */
  profile?: RoleProfile
  catalog: SkillDefinition[]
  thresholds: SkillThresholds
  /** Engineers currently assigned to this profile. */
  assignedNames?: string[]
  onSave: (data: Omit<RoleProfile, 'id'>) => void
  onDelete?: () => void
  onClose: () => void
}

const FIELD =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'block text-xs font-medium text-slate-700 mb-1'
const HINT = 'text-[11px] text-slate-400 mt-1'

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

export default function RoleProfileModal({
  profile, catalog, thresholds, assignedNames = [], onSave, onDelete, onClose,
}: RoleProfileModalProps) {
  const isEdit = !!profile
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    primaryOutcome: profile?.primaryOutcome ?? '',
    depthAreas: profile?.depthAreas ?? '',
    workingBreadth: profile?.workingBreadth ?? '',
    aiExpectation: profile?.aiExpectation ?? '',
    evidence: profile?.evidence ?? '',
    breadthTarget: profile?.breadthTarget ?? 30,
    depthTarget: profile?.depthTarget ?? 10,
  })
  const [depthSkillIds, setDepthSkillIds] = useState<string[]>(
    profile?.depthSkillIds ?? [],
  )

  const valid = form.name.trim().length > 0

  const filtered = useMemo(() => {
    const q = skillQuery.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.subdomain.toLowerCase().includes(q),
    )
  }, [catalog, skillQuery])

  const byDomain = useMemo(() => {
    const map = new Map<string, SkillDefinition[]>()
    for (const s of filtered) {
      const list = map.get(s.domain) ?? []
      list.push(s)
      map.set(s.domain, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const toggleSkill = (id: string) =>
    setDepthSkillIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )

  const submit = () => {
    if (!valid) return
    onSave({
      name: form.name.trim(),
      primaryOutcome: form.primaryOutcome.trim(),
      depthAreas: form.depthAreas.trim(),
      workingBreadth: form.workingBreadth.trim(),
      aiExpectation: form.aiExpectation.trim(),
      evidence: form.evidence.trim(),
      breadthTarget: Math.max(0, Number(form.breadthTarget) || 0),
      depthTarget: Math.max(0, Number(form.depthTarget) || 0),
      depthSkillIds,
    })
  }

  const depthMismatch =
    depthSkillIds.length > 0 && depthSkillIds.length !== Number(form.depthTarget)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit role profile' : 'New role profile'}
            </h2>
            <p className="text-xs text-slate-500">
              Two numbers describe the shape of this role: how much it must cover, and
              how much it must own.
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: descriptive fields */}
            <div className="space-y-4">
              <div>
                <label className={LABEL} htmlFor="role-name">Profile name *</label>
                <input
                  id="role-name"
                  className={FIELD}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Automation Reliability Engineer"
                  autoFocus
                />
                {isEdit && (
                  <p className={HINT}>
                    Renaming is safe — engineers stay assigned.
                  </p>
                )}
              </div>

              <div>
                <label className={LABEL} htmlFor="role-outcome">Primary outcome</label>
                <textarea
                  id="role-outcome"
                  rows={2}
                  className={cn(FIELD, 'resize-none')}
                  value={form.primaryOutcome}
                  onChange={e => setForm(f => ({ ...f, primaryOutcome: e.target.value }))}
                  placeholder="What this role is accountable for delivering."
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="role-depth-areas">Depth areas</label>
                <textarea
                  id="role-depth-areas"
                  rows={2}
                  className={cn(FIELD, 'resize-none')}
                  value={form.depthAreas}
                  onChange={e => setForm(f => ({ ...f, depthAreas: e.target.value }))}
                  placeholder="Prose summary of where this role goes deep."
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="role-breadth">Working breadth</label>
                <textarea
                  id="role-breadth"
                  rows={2}
                  className={cn(FIELD, 'resize-none')}
                  value={form.workingBreadth}
                  onChange={e => setForm(f => ({ ...f, workingBreadth: e.target.value }))}
                  placeholder="Areas this role needs to work in competently."
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="role-ai">AI-era expectation</label>
                <textarea
                  id="role-ai"
                  rows={2}
                  className={cn(FIELD, 'resize-none')}
                  value={form.aiExpectation}
                  onChange={e => setForm(f => ({ ...f, aiExpectation: e.target.value }))}
                  placeholder="How this role is expected to use AI."
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="role-evidence">Evidence</label>
                <textarea
                  id="role-evidence"
                  rows={2}
                  className={cn(FIELD, 'resize-none')}
                  value={form.evidence}
                  onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
                  placeholder="What good looks like for this role."
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Capability targets</p>

                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 items-start">
                  <div>
                    <label className={LABEL} htmlFor="role-bt">Breadth</label>
                    <input
                      id="role-bt"
                      type="number" min="0" max={catalog.length}
                      className={FIELD}
                      value={form.breadthTarget}
                      onChange={e => setForm(f => ({ ...f, breadthTarget: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="pt-5">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <strong>How wide the role reaches.</strong> This engineer should be able to
                      work <strong>{form.breadthTarget}</strong> of the {catalog.length} catalog
                      skills at <strong>level {thresholds.breadth} ({PROFICIENCY_LABELS[thresholds.breadth]})</strong> or
                      above — {pct(form.breadthTarget, catalog.length)}% of the catalog.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Low breadth = a specialist. High breadth = a generalist who can pick up
                      most work with review.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 items-start border-t border-slate-100 pt-3">
                  <div>
                    <label className={LABEL} htmlFor="role-dt">Depth</label>
                    <input
                      id="role-dt"
                      type="number" min="0" max={catalog.length}
                      className={FIELD}
                      value={form.depthTarget}
                      onChange={e => setForm(f => ({ ...f, depthTarget: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="pt-5">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <strong>How far the role goes down.</strong> This engineer should{' '}
                      <em>own</em> <strong>{form.depthTarget}</strong> skills at{' '}
                      <strong>level {thresholds.depth} ({PROFICIENCY_LABELS[thresholds.depth]})</strong> or
                      above — {pct(form.depthTarget, catalog.length)}% of the catalog.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Depth is what makes someone a primary owner. It is the number that
                      protects you from bus-factor risk.
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2.5 leading-relaxed">
                  Targets are counts, not percentages, and they are compared against everything
                  this engineer is rated on — not only the depth-area skills chosen on the right.
                  The level each threshold uses is configurable under Measurement thresholds.
                </p>
              </div>
            </div>

            {/* Right: depth-skill picker */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-baseline justify-between mb-1">
                <label className={LABEL}>Depth-area skills</label>
                <span className="text-[11px] text-slate-500">
                  {depthSkillIds.length} selected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                The specific catalog skills this role is expected to own at level 4+. These
                drive the &ldquo;N depth areas short&rdquo; list on the role-fit table.
              </p>

              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Filter skills…"
                  value={skillQuery}
                  onChange={e => setSkillQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 min-h-0 max-h-[420px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {byDomain.map(([domain, skills]) => (
                  <div key={domain}>
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-50 sticky top-0">
                      {domain}
                    </p>
                    {skills.map(s => {
                      const on = depthSkillIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSkill(s.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                            on ? 'bg-brand-50' : 'hover:bg-slate-50',
                          )}
                        >
                          <span
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                              on ? 'bg-brand-600 border-brand-600' : 'border-slate-300',
                            )}
                          >
                            {on && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-xs text-slate-700 flex-1 truncate">{s.name}</span>
                          {s.critical && (
                            <Badge className="bg-red-50 text-red-600 flex-shrink-0">critical</Badge>
                          )}
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            →{s.targetLevel}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
                {byDomain.length === 0 && (
                  <p className="px-3 py-6 text-xs text-slate-400 text-center">
                    No skills match that filter.
                  </p>
                )}
              </div>

              {depthMismatch && (
                <p className="text-[11px] text-amber-600 mt-2">
                  {depthSkillIds.length} depth skills selected but the depth target is{' '}
                  {form.depthTarget}. That is allowed — the target counts any skills at level
                  4+, not only these — but matching them usually reads more clearly.
                </p>
              )}
            </div>
          </div>

          {isEdit && assignedNames.length > 0 && (
            <div className="flex items-start gap-2 p-3 mt-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p>
                Assigned to <strong>{assignedNames.length}</strong> engineer
                {assignedNames.length === 1 ? '' : 's'}: {assignedNames.join(', ')}. Changing
                targets re-scores their role fit immediately.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          {isEdit && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-slate-600">
                  {assignedNames.length > 0
                    ? `Delete and unassign ${assignedNames.length} engineer${assignedNames.length === 1 ? '' : 's'}?`
                    : 'Delete this profile?'}
                </span>
                <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="mr-auto text-red-600 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            )
          )}
          {!isEdit && <div className="mr-auto" />}
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Create profile'}
          </Button>
        </div>
      </div>
    </div>
  )
}
