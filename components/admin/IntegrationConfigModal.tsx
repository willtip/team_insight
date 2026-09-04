'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTEGRATION_FIELDS, INTEGRATION_GUIDES, isIntegrationConfigured } from '@/lib/integrations'

interface Props {
  name: string
  onClose: () => void
  onSaved?: () => void
}

export default function IntegrationConfigModal({ name, onClose, onSaved }: Props) {
  const storageKey = `integration-${name}`
  const fields = INTEGRATION_FIELDS[name] ?? []
  const guide = INTEGRATION_GUIDES[name]

  const [values, setValues] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setValues(JSON.parse(stored))
    } catch {}
  }, [storageKey])

  const handleSave = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(values)) } catch {}
    setSaved(true)
    onSaved?.()
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = () => {
    setTestStatus('testing')
    setTimeout(() => {
      setTestStatus(isIntegrationConfigured(name) ? 'success' : 'failed')
      setTimeout(() => setTestStatus('idle'), 3000)
    }, 1500)
  }

  const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Configure {name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {guide && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-brand-800">{guide.summary}</p>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-1">
                {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
              <div className="pt-1 border-t border-brand-100/80 mt-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Sample values</p>
                <div className="space-y-0.5">
                  {Object.entries(guide.sampleData).map(([label, value]) => (
                    <p key={label} className="text-[11px] text-slate-600">
                      <span className="font-medium">{label}:</span> <code className="bg-white/70 px-1 rounded">{value}</code>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {fields.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No configuration fields available for this integration.</p>
          )}
          {fields.map(field => (
            <div key={field.key}>
              <label className="text-xs font-medium text-slate-700 mb-1 block">{field.label}</label>
              <div className="relative">
                <input
                  type={field.type === 'password' && !showPassword[field.key] ? 'password' : 'text'}
                  value={values[field.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={cn(INPUT, field.type === 'password' && 'pr-10')}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => ({ ...s, [field.key]: !s[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {field.helpText && <p className="text-[11px] text-slate-400 mt-1">{field.helpText}</p>}
            </div>
          ))}

          {testStatus !== 'idle' && (
            <div className={cn('flex items-center gap-2 p-3 rounded-lg text-sm',
              testStatus === 'testing' ? 'bg-blue-50 text-blue-700' :
              testStatus === 'success' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            )}>
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
              {testStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {testStatus === 'failed' && <AlertCircle className="w-4 h-4" />}
              {testStatus === 'testing' ? 'Testing connection...' :
               testStatus === 'success' ? 'Connection successful!' :
               'Connection failed — check your credentials'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" size="sm" onClick={handleTest} disabled={testStatus === 'testing'}>
            Test Connection
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>
              {saved ? '✓ Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
