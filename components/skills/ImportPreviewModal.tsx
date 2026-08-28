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
  onApply: () => void
  onCancel: () => void
}

const FIELD_LABEL: Record<string, string> = {
  selfRating: 'Self',
  reviewerRating: 'Reviewer',
  evidence: 'Evidence',
}

/**
 * Import replaces stored ratings, so nothing is written until the reviewer has
 * seen exactly what changes.
 */
export default function ImportPreviewModal({
  filename, preview, applyCatalog, onToggleCatalog, onApply, onCancel,
}: ImportPreviewModalProps) {
  const nothingToDo =
    preview.changes.length === 0 && (!applyCatalog || preview.catalogChanges.length === 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Review import</h2>
            <p className="text-xs text-slate-500 truncate">
              {filename} · {preview.rowsRead} assessment rows read
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

          {(preview.unmatchedEmployees.length > 0 || preview.unknownSkillCodes.length > 0) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                {preview.unmatchedEmployees.length > 0 && (
                  <p>
                    <strong>{preview.unmatchedEmployees.length} employee name(s)</strong> in the
                    file match nobody on the team and will be skipped:{' '}
                    {preview.unmatchedEmployees.slice(0, 6).join(', ')}
                    {preview.unmatchedEmployees.length > 6 && ' …'}
                  </p>
                )}
                {preview.unknownSkillCodes.length > 0 && (
                  <p>
                    <strong>{preview.unknownSkillCodes.length} skill ID(s)</strong> are not in the
                    current catalog and will be skipped:{' '}
                    {preview.unknownSkillCodes.slice(0, 12).join(', ')}
                    {preview.unknownSkillCodes.length > 12 && ' …'}
                  </p>
                )}
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

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">
              {preview.changes.length} rating change{preview.changes.length === 1 ? '' : 's'}
            </p>
            {preview.changes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Every rating in this file already matches what the app holds.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[130px_1fr_80px_120px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Engineer</span><span>Skill</span><span>Field</span><span className="text-right">Change</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {preview.changes.map((c, i) => (
                    <div
                      key={`${c.employeeId}-${c.skillId}-${c.field}-${i}`}
                      className="grid grid-cols-[130px_1fr_80px_120px] gap-2 px-3 py-1.5 text-[11px] border-b border-slate-50"
                    >
                      <span className="truncate text-slate-700">{c.employeeName}</span>
                      <span className="truncate text-slate-600">{c.skillName}</span>
                      <span className="text-slate-400">{FIELD_LABEL[c.field]}</span>
                      <span className="text-right truncate">
                        <span className="text-slate-400">{c.from}</span>
                        <span className="text-slate-300"> → </span>
                        <span className="font-semibold text-slate-800">{c.to}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 flex-1">
            Applying overwrites the stored ratings shown above. Nothing else is touched.
          </p>
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onApply} disabled={nothingToDo}>
            Apply {preview.changes.length > 0 ? `${preview.changes.length} change${preview.changes.length === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
