'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import IntegrationConfigModal from '@/components/admin/IntegrationConfigModal'
import { cn } from '@/lib/utils'
import {
  Check, Link2,
} from 'lucide-react'

const SCORE_WEIGHTS = [
  { label: 'Goal Achievement', key: 'goals', value: 30, color: 'bg-green-500' },
  { label: 'Project Contributions', key: 'projects', value: 25, color: 'bg-blue-500' },
  { label: 'Professional Development', key: 'development', value: 15, color: 'bg-purple-500' },
  { label: 'Leadership Behaviors', key: 'leadership', value: 15, color: 'bg-amber-500' },
  { label: 'Collaboration', key: 'collaboration', value: 10, color: 'bg-teal-500' },
  { label: 'Innovation', key: 'innovation', value: 5, color: 'bg-rose-500' },
]

const INTEGRATIONS = [
  { name: 'Microsoft Entra ID', status: 'connected', icon: '🔐', description: 'SSO and user provisioning' },
  { name: 'Microsoft Teams', status: 'connected', icon: '💬', description: 'Notifications and coaching reminders' },
  { name: 'Azure DevOps', status: 'pending', icon: '🔄', description: 'Project contribution auto-import' },
  { name: 'GitHub', status: 'pending', icon: '🐙', description: 'PR and commit activity signals' },
  { name: 'Jira', status: 'disconnected', icon: '🎫', description: 'Sprint completion and velocity' },
  { name: 'Pluralsight', status: 'connected', icon: '📚', description: 'Training completion auto-sync' },
  { name: 'LinkedIn Learning', status: 'disconnected', icon: '💼', description: 'Course completion import' },
  { name: 'Workday', status: 'pending', icon: '🏢', description: 'HR data and org hierarchy sync' },
  { name: 'Degreed', status: 'disconnected', icon: '🎓', description: 'Skills, ratings, and learning assignments sync' },
]

const NOTIF_STORAGE_KEY = 'admin-notifications'
const ORG_STORAGE_KEY = 'org-settings'

const DEFAULT_NOTIFICATIONS = [
  { label: 'Goal Due Date Reminders', description: 'Notify engineers 7 days before goals are due', enabled: true },
  { label: 'Performance Review Cycle', description: 'Send review cycle kickoff and deadline reminders', enabled: true },
  { label: 'Certification Expiration', description: 'Alert 30 days before certifications expire', enabled: true },
  { label: 'Coaching Follow-Up', description: 'Remind directors of pending coaching follow-ups', enabled: true },
  { label: 'Goal At-Risk Alerts', description: 'Alert manager when goal progress falls below threshold', enabled: false },
  { label: 'Weekly Digest', description: 'Weekly team performance summary email', enabled: false },
  { label: 'Teams Integration', description: 'Send key alerts via Microsoft Teams', enabled: true },
]

const DEFAULT_ORG = {
  orgName: 'Acme Corporation',
  department: 'Automation Solution Engineering (ASE)',
  reviewCycle: 'Semi-Annual',
  fiscalYearStart: 'January',
}

const TABS = ['Scoring Model', 'Integrations', 'Users & Roles', 'Notifications', 'Organization'] as const
type Tab = typeof TABS[number]

import { MessageSquare } from 'lucide-react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Scoring Model')
  const [weights, setWeights] = useState(SCORE_WEIGHTS.map(w => ({ ...w })))
  const [configuringIntegration, setConfiguringIntegration] = useState<string | null>(null)

  // Notification settings state
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)

  const toggleNotif = (label: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.label === label ? { ...n, enabled: !n.enabled } : n)
      try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Org settings state
  const [orgSettings, setOrgSettings] = useState(DEFAULT_ORG)
  const [orgSaved, setOrgSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_STORAGE_KEY)
      if (stored) setNotifications(JSON.parse(stored))
    } catch {}
    try {
      const stored = localStorage.getItem(ORG_STORAGE_KEY)
      if (stored) setOrgSettings(JSON.parse(stored))
    } catch {}
  }, [])

  const saveOrgSettings = () => {
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(orgSettings))
    setOrgSaved(true)
    setTimeout(() => setOrgSaved(false), 2500)
  }

  const totalWeight = weights.reduce((a, w) => a + w.value, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Admin Settings"
        subtitle="Platform configuration and integration management"
      />

      <div className="flex-1 p-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-5 bg-white px-4 rounded-t-xl shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-all',
                activeTab === tab
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Scoring Model' && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Performance Score Weights</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Adjust the weight of each category. Total must equal 100%.</p>
                </div>
                <div className={cn('text-sm font-bold px-3 py-1 rounded-full', totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {totalWeight}%
                </div>
              </div>

              <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
                {weights.map(w => (
                  <div
                    key={w.key}
                    className={cn('h-full transition-all', w.color)}
                    style={{ width: `${w.value}%` }}
                    title={`${w.label}: ${w.value}%`}
                  />
                ))}
              </div>

              <div className="space-y-4">
                {weights.map((weight, i) => (
                  <div key={weight.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded-full', weight.color)} />
                        <span className="text-xs font-medium text-slate-700">{weight.label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">{weight.value}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      value={weight.value}
                      onChange={e => {
                        const newVal = parseInt(e.target.value)
                        setWeights(prev => prev.map((w, j) => j === i ? { ...w, value: newVal } : w))
                      }}
                      className="w-full h-1.5 accent-brand-600"
                    />
                  </div>
                ))}
              </div>

              {totalWeight !== 100 && (
                <p className="text-xs text-red-600 mt-3">Weights must total 100%. Current total: {totalWeight}%</p>
              )}

              <div className="mt-5 flex items-center gap-3">
                <Button size="sm" disabled={totalWeight !== 100}>Save Configuration</Button>
                <Button size="sm" variant="secondary" onClick={() => setWeights(SCORE_WEIGHTS.map(w => ({ ...w })))}>
                  Reset to Defaults
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Performance Bands</h3>
              <div className="space-y-2">
                {[
                  { range: '90-100', label: 'Outstanding', color: 'bg-green-500' },
                  { range: '80-89', label: 'Exceeds Expectations', color: 'bg-blue-500' },
                  { range: '70-79', label: 'Meets Expectations', color: 'bg-indigo-500' },
                  { range: '60-69', label: 'Developing', color: 'bg-amber-500' },
                  { range: '0-59', label: 'Needs Improvement', color: 'bg-red-500' },
                ].map(band => (
                  <div key={band.range} className="flex items-center gap-3">
                    <div className={cn('w-4 h-4 rounded-sm', band.color)} />
                    <span className="text-xs font-mono text-slate-600 w-16">{band.range}</span>
                    <span className="text-xs text-slate-700">{band.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Integrations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {INTEGRATIONS.map(integration => (
              <div key={integration.name} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{integration.name}</p>
                      <p className="text-xs text-slate-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                    integration.status === 'connected' ? 'bg-green-100 text-green-700' :
                    integration.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      integration.status === 'connected' ? 'bg-green-500' :
                      integration.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
                    )} />
                    {integration.status === 'connected' ? 'Connected' :
                     integration.status === 'pending' ? 'Pending' : 'Not connected'}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {integration.status === 'connected' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setConfiguringIntegration(integration.name)}>
                        Configure
                      </Button>
                      <Button size="sm" variant="ghost">Sync Now</Button>
                    </>
                  )}
                  {integration.status === 'disconnected' && (
                    <Button size="sm" icon={<Link2 className="w-3.5 h-3.5" />}
                      onClick={() => setConfiguringIntegration(integration.name)}>
                      Connect
                    </Button>
                  )}
                  {integration.status === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => setConfiguringIntegration(integration.name)}>
                      Complete Setup
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Users & Roles' && (
          <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Role & Permission Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500 font-semibold">Permission</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Employee</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Manager</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Director</th>
                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['View own profile', true, true, true, true],
                    ['View team profiles', false, true, true, true],
                    ['Add coaching notes', false, true, true, true],
                    ['View private notes', false, false, true, true],
                    ['Edit score weights', false, false, false, true],
                    ['Manage users', false, false, false, true],
                    ['Configure integrations', false, false, false, true],
                    ['Generate all reports', false, false, true, true],
                    ['Manage employee goals', true, true, true, true],
                    ['Export data', false, true, true, true],
                  ].map(([perm, ...roles]) => (
                    <tr key={String(perm)} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-700">{perm}</td>
                      {roles.map((allowed, i) => (
                        <td key={i} className="text-center py-2.5 px-3">
                          {allowed
                            ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" />
                            : <span className="text-slate-300 text-base">–</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="max-w-2xl space-y-4">
            {notifications.map(notif => (
              <div key={notif.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{notif.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{notif.description}</p>
                </div>
                <button
                  onClick={() => toggleNotif(notif.label)}
                  className={cn(
                    'w-10 h-5 rounded-full flex items-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    notif.enabled ? 'bg-brand-600 justify-end' : 'bg-slate-200 justify-start'
                  )}
                  aria-label={`${notif.enabled ? 'Disable' : 'Enable'} ${notif.label}`}
                  role="switch"
                  aria-checked={notif.enabled}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow mx-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Organization' && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Organization Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Organization Name</label>
                  <input
                    type="text"
                    value={orgSettings.orgName}
                    onChange={e => setOrgSettings(s => ({ ...s, orgName: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Primary Department</label>
                  <input
                    type="text"
                    value={orgSettings.department}
                    onChange={e => setOrgSettings(s => ({ ...s, department: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Performance Review Cycle</label>
                  <select
                    value={orgSettings.reviewCycle}
                    onChange={e => setOrgSettings(s => ({ ...s, reviewCycle: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {['Quarterly', 'Semi-Annual', 'Annual'].map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Fiscal Year Start</label>
                  <select
                    value={orgSettings.fiscalYearStart}
                    onChange={e => setOrgSettings(s => ({ ...s, fiscalYearStart: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {['January', 'April', 'July', 'October'].map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" onClick={saveOrgSettings}>Save Settings</Button>
                {orgSaved && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />Saved!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {configuringIntegration && (
        <IntegrationConfigModal
          name={configuringIntegration}
          onClose={() => setConfiguringIntegration(null)}
        />
      )}
    </div>
  )
}
