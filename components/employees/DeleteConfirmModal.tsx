'use client'

import Button from '@/components/ui/Button'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  name: string
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmModal({ name, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Remove Team Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 mb-1">Remove <span className="font-bold">{name}</span> from the team?</p>
              <p className="text-xs text-slate-500">This will remove all their data including goals, notes, and contributions. This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => { onConfirm(); onClose() }}>Remove from Team</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
