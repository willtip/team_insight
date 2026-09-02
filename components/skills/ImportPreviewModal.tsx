'use client'

import { AlertTriangle, X, FileSpreadsheet } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { ImportPreview } from '@/lib/skill-workbook'
import { cn } from '@/lib/utils'

interface ImportPreviewModalProps {
  filename: string
  preview: ImportPreview
  applyCatalog: boolean
  onToggleCatalog: (next: boolean) => void
  applyRoleProfiles: boolean
  onToggleRoleProfiles: (next: boolean) => void
  onApply: () => void
  onCancel: () => void
}

/**
 * Catalog and role-profile changes from an uploaded workbook. Ratings take the
 * server-side path (components/skills/AssessmentImportPanel.tsx), so nothing here
 * touches an assessment.
 */
export default function ImportPreviewModal({
  filename, preview, applyCatalog, onToggleCatalog,
  applyRoleProfiles, onToggleRoleProfiles, onApply, onCancel,
}: ImportPreviewModalProps) {
  const newRoles = preview.roleProfileChanges.filter(r => r.action === 'add').length
  const updatedRoles = preview.roleProfileChanges.length - newRoles

  const totalCount =
    (applyCatalog ? preview.catalogChanges.length : 0) +
    (applyRoleProfiles ? preview.roleProfileChanges.length : 0)
  const nothingToDo = totalCount === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Review import</h2>
            <p className="text-xs text-slate-500 truncate">
              {filename} · {preview.catalogChanges.length} catalog row
              {preview.catalogChanges.length === 1 ? '' : 's'}
              {preview.roleProfileChanges.length > 0 &&
                ` · ${preview.roleProfileChanges.length} role profile row${preview.roleProfileChanges.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {preview.errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 space-y-0.5">
                {preview.errors.map(e => <p key={e}>{e}</p>)}
              </div>
            </div>
          )}

          {preview.catalogChanges.length > 0 && (
            <div className="border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCatalog}
                  onChange={e => onToggleCatalog(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Also apply {preview.catalogChanges.length} catalog change
                  {preview.catalogChanges.length === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-slate-400">
                  criticality, target level and weight
                </span>
              </label>
              <div className={cn('max-h-32 overflow-y-auto', !applyCatalog && 'opacity-40')}>
                {preview.catalogChanges.map((c, i) => (
                  <div key={`${c.skillId}-${c.field}-${i}`} className="flex items-center gap-2 px-3 py-1 text-[11px]">
                    <span className="flex-1 truncate text-slate-600">{c.name}</span>
                    <Badge>{c.field}</Badge>
                    <span className="text-slate-400 w-24 text-right">{c.from} → {c.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.roleProfileChanges.length > 0 && (
            <div className="border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyRoleProfiles}
                  onChange={e => onToggleRoleProfiles(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Also apply {preview.roleProfileChanges.length} role profile change
                  {preview.roleProfileChanges.length === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {newRoles > 0 && `${newRoles} new`}
                  {newRoles > 0 && updatedRoles > 0 && ' · '}
                  {updatedRoles > 0 && `${updatedRoles} updated`}
                </span>
              </label>
              <div className={cn('max-h-40 overflow-y-auto', !applyRoleProfiles && 'opacity-40')}>
                {preview.roleProfileChanges.map(r =>
                  r.action === 'add' ? (
                    <div key={r.name} className="flex items-center gap-2 px-3 py-1 text-[11px]">
                      <span className="flex-1 truncate text-slate-600">{r.name}</span>
                      <Badge className="bg-green-100 text-green-700">New role</Badge>
                      <span className="text-slate-400 w-40 text-right truncate">
                        breadth {r.profile.breadthTarget} · depth {r.profile.depthTarget}
                      </span>
                    </div>
                  ) : (
                    r.fieldChanges.map((c, i) => (
                      <div key={`${r.name}-${c.field}-${i}`} className="flex items-center gap-2 px-3 py-1 text-[11px]">
                        <span className="flex-1 truncate text-slate-600">{r.name}</span>
                        <Badge>{c.field}</Badge>
                        <span className="text-slate-400 w-40 text-right truncate">{c.from} → {c.to}</span>
                      </div>
                    ))
                  ),
                )}
              </div>
            </div>
          )}

        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 flex-1">
            Applying writes exactly what&apos;s shown above and checked. Ratings are imported
            separately, from the Assessment tab.
          </p>
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onApply} disabled={nothingToDo}>
            Apply {totalCount > 0 ? `${totalCount} change${totalCount === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
