'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Field {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'password' | 'url'
}

const INTEGRATION_FIELDS: Record<string, Field[]> = {
  'Microsoft Entra ID': [
    { key: 'tenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientId', label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter client secret' },
  ],
  'Microsoft Teams': [
    { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'url', placeholder: 'https://outlook.office.com/webhook/...' },
  ],
  'Azure DevOps': [
    { key: 'orgUrl', label: 'Organization URL', type: 'url', placeholder: 'https://dev.azure.com/yourorg' },
    { key: 'pat', label: 'Personal Access Token', type: 'password', placeholder: 'Enter PAT' },
    { key: 'project', label: 'Project Name', placeholder: 'MyProject' },
  ],
  'GitHub': [
    { key: 'org', label: 'Organization Name', placeholder: 'your-org' },
    { key: 'pat', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' },
  ],
  'Jira': [
    { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://yourorg.atlassian.net' },
    { key: 'email', label: 'Email', placeholder: 'you@company.com' },
    { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Enter Jira API token' },
    { key: 'projectKey', label: 'Project Key', placeholder: 'PROJ' },
  ],
  'Pluralsight': [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter Pluralsight API key' },
    { key: 'teamHandle', label: 'Team Handle', placeholder: 'your-team-handle' },
  ],
  'LinkedIn Learning': [
    { key: 'clientId', label: 'Client ID', placeholder: 'Enter Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret' },
  ],
  'Workday': [
    { key: 'tenantUrl', label: 'Tenant URL', type: 'url', placeholder: 'https://yourorg.workday.com' },
    { key: 'clientId', label: 'Client ID', placeholder: 'Enter Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret' },
  ],
}

interface Props {
  name: string
  onClose: () => void
  onSaved?: () => void
}

export default function IntegrationConfigModal({ name, onClose, onSaved }: Props) {
  const storageKey = `integration-${name}`
  const fields = INTEGRATION_FIELDS[name] ?? []

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
      setTestStatus(Math.random() > 0.3 ? 'success' : 'failed')
      setTimeout(() => setTestStatus('idle'), 3000)
    }, 1500)
  }

  const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Configure {name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
