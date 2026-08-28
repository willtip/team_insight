'use client'

import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import LevelPicker from './LevelPicker'
import type { SkillDefinition } from '@/lib/skill-catalog'
import type { ProficiencyLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SkillEditorModalProps {
  /** Omit to create a new skill. */
  skill?: SkillDefinition
  domains: string[]
  /** How many engineers currently hold a rating for this skill. */
  ratingCount?: number
  /** Role profiles naming this skill as a depth area. */
  usedByRoles?: string[]
  onSave: (data: Omit<SkillDefinition, 'id' | 'code'>) => void
  onDelete?: () => void
  onClose: () => void
}

const FIELD =
  'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'block text-xs font-medium text-slate-700 mb-1'
const HINT = 'text-[11px] text-slate-400 mt-1'

const NEW_DOMAIN = '__new__'

export default function SkillEditorModal({
  skill, domains, ratingCount = 0, usedByRoles = [], onSave, onDelete, onClose,
}: SkillEditorModalProps) {
  const isEdit = !!skill
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    name: skill?.name ?? '',
    domain: skill?.domain ?? domains[0] ?? '',
    subdomain: skill?.subdomain ?? '',
    observableCapability: skill?.observableCapability ?? '',
    exampleEvidence: skill?.exampleEvidence ?? '',
    critical: skill?.critical ?? false,
    targetLevel: (skill?.targetLevel ?? 3) as ProficiencyLevel,
    weight: skill?.weight ?? 1.2,
  })
  // Lets someone introduce a domain that does not exist yet.
  const [newDomain, setNewDomain] = useState('')
  const [addingDomain, setAddingDomain] = useState(domains.length === 0)

  const resolvedDomain = addingDomain ? newDomain.trim() : form.domain
  const valid = form.name.trim().length > 0 && resolvedDomain.length > 0

  const submit = () => {
    if (!valid) return
    onSave({
      name: form.name.trim(),
      domain: resolvedDomain,
      subdomain: form.subdomain.trim() || 'General',
      observableCapability: form.observableCapability.trim(),
      exampleEvidence: form.exampleEvidence.trim(),
      critical: form.critical,
      targetLevel: form.targetLevel,
      weight: Number(form.weight) || 1,
      ...(skill?.custom ? { custom: true } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit skill' : 'Add a skill to the catalog'}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {isEdit
                ? `${skill!.domain} · ${skill!.subdomain}`
                : 'Describe the observable capability, not the tool — that is what raters judge against.'}
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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className={LABEL} htmlFor="skill-name">Skill name *</label>
            <input
              id="skill-name"
              className={FIELD}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Event-Driven Ansible"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="skill-domain">Domain *</label>
              {addingDomain ? (
                <div className="flex gap-2">
                  <input
                    className={FIELD}
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    placeholder="New domain name"
                  />
                  {domains.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setAddingDomain(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              ) : (
                <select
                  id="skill-domain"
                  className={FIELD}
                  value={form.domain}
                  onChange={e => {
                    if (e.target.value === NEW_DOMAIN) { setAddingDomain(true); return }
                    setForm(f => ({ ...f, domain: e.target.value }))
                  }}
                >
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value={NEW_DOMAIN}>+ New domain…</option>
                </select>
              )}
            </div>
            <div>
              <label className={LABEL} htmlFor="skill-subdomain">Subdomain</label>
              <input
                id="skill-subdomain"
                className={FIELD}
                value={form.subdomain}
                onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))}
                placeholder="e.g. EDA"
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="skill-capability">Observable capability</label>
            <textarea
              id="skill-capability"
              className={cn(FIELD, 'resize-none')}
              rows={2}
              value={form.observableCapability}
              onChange={e => setForm(f => ({ ...f, observableCapability: e.target.value }))}
              placeholder="What someone at target level can actually do."
            />
            <p className={HINT}>Shown under the skill name whenever anyone rates it.</p>
          </div>

          <div>
            <label className={LABEL} htmlFor="skill-evidence">Example evidence</label>
            <textarea
              id="skill-evidence"
              className={cn(FIELD, 'resize-none')}
              rows={2}
              value={form.exampleEvidence}
              onChange={e => setForm(f => ({ ...f, exampleEvidence: e.target.value }))}
              placeholder="What proof at target looks like — e.g. 'Production rulebook with outcome metrics'."
            />
            <p className={HINT}>
              Becomes the placeholder in the Evidence field and the default success evidence on
              development plans.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className={LABEL}>Target level</label>
              <LevelPicker
                value={form.targetLevel}
                allowEmpty={false}
                onChange={v => setForm(f => ({ ...f, targetLevel: v ?? 3 }))}
                className="w-full !py-2 !text-sm"
                ariaLabel="Target level"
              />
              <p className={HINT}>The bar ratings are measured against.</p>
            </div>
            <div>
              <label className={LABEL} htmlFor="skill-weight">Weight</label>
              <input
                id="skill-weight"
                type="number" step="0.1" min="0.1" max="3"
                className={FIELD}
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))}
              />
              <p className={HINT}>1.1–1.6 typical.</p>
            </div>
            <div>
              <label className={LABEL}>Criticality</label>
              <label className="flex items-center gap-2 text-sm text-slate-700 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.critical}
                  onChange={e => setForm(f => ({ ...f, critical: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                Critical
              </label>
              <p className={HINT}>Drives risk and gap priority.</p>
            </div>
          </div>

          {isEdit && (ratingCount > 0 || usedByRoles.length > 0) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {ratingCount > 0 && (
                  <p>
                    <strong>{ratingCount}</strong> engineer{ratingCount === 1 ? '' : 's'} already
                    rated on this skill. Editing the target or criticality re-scores them
                    immediately.
                  </p>
                )}
                {usedByRoles.length > 0 && (
                  <p>Named as a depth area by: {usedByRoles.join(', ')}.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          {isEdit && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-slate-600">
                  Delete this skill{ratingCount > 0 && ` and hide ${ratingCount} rating${ratingCount === 1 ? '' : 's'}`}?
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
          {/* Not "Add skill" — that is the toolbar button that opened this dialog. */}
          <Button size="sm" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add to catalog'}
          </Button>
        </div>
      </div>
    </div>
  )
}
