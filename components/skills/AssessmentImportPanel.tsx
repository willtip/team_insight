'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, ClipboardEdit, Download, Loader2, Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import ImportBatchPreview from './ImportBatchPreview'
import { useCommitImport, useDiscardImport, useUploadImport } from '@/lib/assessment-import'
import type { ImportBatch } from '@/lib/assessment-import'
import { cn } from '@/lib/utils'

interface AssessmentImportPanelProps {
  onOpenForm: () => void
}

const ACCEPT = '.xlsx,.xlsm,.csv,.tsv'

/**
 * Bulk intake for the Assessment tab: drop a spreadsheet or CSV, review the diff the
 * server computed, then apply. Parsing happens server-side, so this only moves bytes
 * and renders the result.
 */
export default function AssessmentImportPanel({ onOpenForm }: AssessmentImportPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [batch, setBatch] = useState<ImportBatch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)

  const upload = useUploadImport()
  const commit = useCommitImport()
  const discard = useDiscardImport()

  const handleFile = (file: File) => {
    setError(null)
    setApplied(null)
    upload.mutate(file, {
      onSuccess: setBatch,
      onError: e => setError(e instanceof Error ? e.message : 'Could not read that file.'),
    })
    if (fileInput.current) fileInput.current.value = ''
  }

  const applyImport = () => {
    if (!batch) return
    setError(null)
    commit.mutate(batch.id, {
      onSuccess: result => {
        setBatch(null)
        setApplied(
          `Applied ${result.applied} rating${result.applied === 1 ? '' : 's'}` +
          (result.skippedUnchanged ? `, skipped ${result.skippedUnchanged} unchanged` : '') + '.',
        )
      },
      onError: e => setError(e instanceof Error ? e.message : 'Could not apply that import.'),
    })
  }

  const cancelImport = () => {
    if (batch) discard.mutate(batch.id)
    setBatch(null)
  }

  return (
    <>
      <Card padding="sm">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          className={cn(
            'flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors',
            dragging ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200',
          )}
        >
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs font-semibold text-slate-700">Import assessments</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Drop a spreadsheet or CSV here, or use the buttons. Rows are matched on email,
              then employee ID, then name. A blank cell leaves a rating alone; a{' '}
              <code className="text-slate-600">-</code> clears it.
            </p>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <a href="/templates/assessment-import-template.csv" download>
            <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />}>
              CSV template
            </Button>
          </a>
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenForm}
            icon={<ClipboardEdit className="w-3.5 h-3.5" />}
          >
            Enter assessments
          </Button>
          <Button
            size="sm"
            onClick={() => fileInput.current?.click()}
            loading={upload.isPending}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload file
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-600 font-medium">
              Dismiss
            </button>
          </div>
        )}

        {applied && (
          <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-2">
            {applied}
          </p>
        )}
      </Card>

      {batch && (
        <ImportBatchPreview
          batch={batch}
          applying={commit.isPending}
          error={error}
          onApply={applyImport}
          onCancel={cancelImport}
        />
      )}

      {upload.isPending && !batch && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20">
          <div className="bg-white rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span className="text-sm text-slate-700">Reading file…</span>
          </div>
        </div>
      )}
    </>
  )
}
