'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  MATCHED_BY_LABEL, PROBLEM_STATUSES, STATUS_LABEL,
} from '@/lib/assessment-import'
import type { ImportBatch, ImportRow, ImportRowStatus, ImportValues } from '@/lib/assessment-import'
import { cn } from '@/lib/utils'

interface ImportBatchPreviewProps {
  batch: ImportBatch
  applying?: boolean
  error?: string | null
  onApply: () => void
  onCancel: () => void
}

const FIELD_LABEL: Record<keyof ImportValues, string> = {
  targetOverride: 'Target',
  selfRating: 'Self',
  reviewerRating: 'Reviewer',
  evidence: 'Evidence',
  evidenceUrl: 'Link',
}

const STATUS_STYLE: Partial<Record<ImportRowStatus, string>> = {
  ok: 'bg-green-100 text-green-700',
  unchanged: 'bg-slate-100 text-slate-500',
  duplicate: 'bg-amber-100 text-amber-700',
  unknown_employee: 'bg-red-100 text-red-700',
  ambiguous_employee: 'bg-red-100 text-red-700',
  unknown_skill: 'bg-red-100 text-red-700',
  invalid_value: 'bg-red-100 text-red-700',
  forbidden_field: 'bg-red-100 text-red-700',
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** The fields this row would actually change, as `Field from → to`. */
function changes(row: ImportRow): { field: string; from: string; to: string }[] {
  return (Object.keys(row.values) as (keyof ImportValues)[])
    .filter(field => row.values[field] !== row.before[field])
    .map(field => ({
      field: FIELD_LABEL[field] ?? field,
      from: show(row.before[field]),
      to: show(row.values[field]),
    }))
}

/**
 * Nothing is written until the reviewer has seen exactly what would change — the same
 * contract as the workbook import, but over the server's staged batch.
 */
export default function ImportBatchPreview({
  batch, applying, error, onApply, onCancel,
}: ImportBatchPreviewProps) {
  const [tab, setTab] = useState<'apply' | 'problems' | 'unchanged'>('apply')

  const groups = useMemo(() => ({
    apply: batch.rows.filter(r => r.status === 'ok'),
    problems: batch.rows.filter(r => PROBLEM_STATUSES.includes(r.status)),
    unchanged: batch.rows.filter(r => r.status === 'unchanged'),
  }), [batch.rows])

  const tabs = [
    ['apply', `Will apply ${groups.apply.length}`],
    ['problems', `Needs attention ${groups.problems.length}`],
    ['unchanged', `No change ${groups.unchanged.length}`],
  ] as const

  const visible = groups[tab]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Review import</h2>
            <p className="text-xs text-slate-500 truncate">
              {batch.filename ?? 'In-app submission'} · {batch.counts.rowsRead} rows read
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {batch.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                {batch.warnings.map(w => <p key={w}>{w}</p>)}
              </div>
            </div>
          )}

          <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
            {tabs.map(([id, label]) => (
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

          {visible.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              {tab === 'apply'
                ? 'Nothing in this file would change a stored rating.'
                : 'Nothing here.'}
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[40px_130px_1fr_92px_150px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Row</span><span>Engineer</span><span>Skill</span>
                <span>Status</span><span className="text-right">Change</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {visible.map(row => {
                  const diff = changes(row)
                  return (
                    <div
                      key={row.rowNumber}
                      className="grid grid-cols-[40px_130px_1fr_92px_150px] gap-2 px-3 py-1.5 text-[11px] border-b border-slate-50"
                    >
                      <span className="text-slate-400">{row.rowNumber}</span>
                      <span className="truncate text-slate-700" title={row.employeeName ?? ''}>
                        {row.employeeName ?? '—'}
                        {row.matchedBy && (
                          <span className="text-slate-400">
                            {' '}· {MATCHED_BY_LABEL[row.matchedBy] ?? row.matchedBy}
                          </span>
                        )}
                      </span>
                      <span className="truncate text-slate-600" title={row.skillName ?? ''}>
                        {row.skillName ?? '—'}
                        {row.messages.length > 0 && (
                          <span className="block text-[10px] text-slate-400 truncate" title={row.messages.join(' ')}>
                            {row.messages.join(' ')}
                          </span>
                        )}
                      </span>
                      <span>
                        <Badge className={STATUS_STYLE[row.status] ?? ''}>
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      </span>
                      <span className="text-right truncate" title={diff.map(d => `${d.field} ${d.from}→${d.to}`).join(', ')}>
                        {diff.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          diff.map(d => (
                            <span key={d.field} className="block">
                              <span className="text-slate-400">{d.field} {d.from}</span>
                              <span className="text-slate-300"> → </span>
                              <span className="font-semibold text-slate-800">{d.to}</span>
                            </span>
                          ))
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-400 flex-1">
            Only the {groups.apply.length} row{groups.apply.length === 1 ? '' : 's'} under
            &ldquo;Will apply&rdquo; are written. Final, Gap and Priority are always recalculated.
          </p>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={applying}>Cancel</Button>
          <Button size="sm" onClick={onApply} loading={applying} disabled={groups.apply.length === 0}>
            Apply {groups.apply.length > 0 ? `${groups.apply.length} change${groups.apply.length === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
