'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { useEmployees } from '@/lib/employee-store'
import { cn, formatDate } from '@/lib/utils'
import { Briefcase, Plus, TrendingUp, Users, Zap, Star, Pencil, Trash2, X, Check } from 'lucide-react'
import Link from 'next/link'
import type { ProjectContribution } from '@/lib/types'

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

interface ContribFormProps {
  form: Partial<ProjectContribution>
  setForm: React.Dispatch<React.SetStateAction<Partial<ProjectContribution>>>
  showEmpSelect?: boolean
  employees?: { id: string; name: string }[]
  empId?: string
  setEmpId?: (id: string) => void
}

function ContribForm({ form, setForm, showEmpSelect, employees = [], empId = '', setEmpId }: ContribFormProps) {
  return (
    <div className="space-y-3">
      {showEmpSelect && (
        <div>
          <label className={labelCls}>Engineer *</label>
          <select value={empId} onChange={e => setEmpId?.(e.target.value)} className={inputCls}>
            <option value="">Select engineer...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Project Name *</label>
          <input type="text" value={form.projectName || ''} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} className={inputCls} placeholder="Project name..." />
        </div>
        <div>
          <label className={labelCls}>Initiative</label>
          <input type="text" value={form.initiative || ''} onChange={e => setForm(f => ({ ...f, initiative: e.target.value }))} className={inputCls} placeholder="e.g. AIOps Platform" />
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={cn(inputCls, 'resize-none h-16')} placeholder="What was done..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Business Impact</label>
          <textarea value={form.businessImpact || ''} onChange={e => setForm(f => ({ ...f, businessImpact: e.target.value }))} className={cn(inputCls, 'resize-none h-16')} placeholder="Business outcomes..." />
        </div>
        <div>
          <label className={labelCls}>Technical Impact</label>
          <textarea value={form.technicalImpact || ''} onChange={e => setForm(f => ({ ...f, technicalImpact: e.target.value }))} className={cn(inputCls, 'resize-none h-16')} placeholder="Technical outcomes..." />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-1">
        <ScoreInput label="Leadership" value={form.leadershipScore ?? 3} onChange={v => setForm(f => ({ ...f, leadershipScore: v }))} />
        <ScoreInput label="Collaboration" value={form.collaborationScore ?? 3} onChange={v => setForm(f => ({ ...f, collaborationScore: v }))} />
        <ScoreInput label="Innovation" value={form.innovationScore ?? 3} onChange={v => setForm(f => ({ ...f, innovationScore: v }))} />
      </div>
    </div>
  )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className={labelCls}>{label} (1–5)</label>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn('w-7 h-7 rounded-full text-xs font-bold border transition-all', value >= n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-400')}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { employees: EMPLOYEES, updateEmployee } = useEmployees()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ProjectContribution>>({})

  const [addingContrib, setAddingContrib] = useState(false)
  const [addEmpId, setAddEmpId] = useState('')
  const [addForm, setAddForm] = useState<Partial<ProjectContribution>>({ leadershipScore: 3, collaborationScore: 3, innovationScore: 3, evidenceLinks: [] })

  const allContributions = EMPLOYEES.flatMap(e =>
    e.projectContributions.map(c => ({ ...c, employeeName: e.name, employeeId: e.id, employeeTitle: e.title }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const projects = Array.from(new Set(allContributions.map(c => c.projectName)))

  const avgImpact = (contributions: typeof allContributions) => {
    if (!contributions.length) return 0
    return Math.round(
      contributions.reduce((a, c) => a + c.leadershipScore + c.collaborationScore + c.innovationScore, 0) /
      (contributions.length * 3) * 20
    )
  }

  const startEdit = (contrib: ProjectContribution) => {
    setEditingId(contrib.id)
    setEditForm({ ...contrib })
    setAddingContrib(false)
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const saveEdit = () => {
    if (!editForm.projectName?.trim()) return
    const contrib = allContributions.find(c => c.id === editingId)
    if (!contrib) return
    const emp = EMPLOYEES.find(e => e.id === contrib.employeeId)
    if (!emp) return
    updateEmployee(emp.id, {
      projectContributions: emp.projectContributions.map(c => c.id === editingId ? { ...c, ...editForm } : c)
    })
    cancelEdit()
  }

  const deleteContrib = (contribId: string, empId: string) => {
    const emp = EMPLOYEES.find(e => e.id === empId)
    if (!emp) return
    updateEmployee(emp.id, { projectContributions: emp.projectContributions.filter(c => c.id !== contribId) })
    setDeletingId(null)
  }

  const saveNewContrib = () => {
    if (!addForm.projectName?.trim() || !addEmpId) return
    const emp = EMPLOYEES.find(e => e.id === addEmpId)
    if (!emp) return
    const newContrib: ProjectContribution = {
      id: `contrib-${Date.now()}`,
      employeeId: addEmpId,
      projectName: addForm.projectName || '',
      initiative: addForm.initiative || '',
      description: addForm.description || '',
      businessImpact: addForm.businessImpact || '',
      technicalImpact: addForm.technicalImpact || '',
      leadershipScore: addForm.leadershipScore ?? 3,
      collaborationScore: addForm.collaborationScore ?? 3,
      innovationScore: addForm.innovationScore ?? 3,
      date: addForm.date || new Date().toISOString().split('T')[0],
      evidenceLinks: addForm.evidenceLinks ?? [],
    }
    updateEmployee(addEmpId, { projectContributions: [...emp.projectContributions, newContrib] })
    setAddingContrib(false)
    setAddForm({ leadershipScore: 3, collaborationScore: 3, innovationScore: 3, evidenceLinks: [] })
    setAddEmpId('')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Project Contributions"
        subtitle={`${allContributions.length} contributions across ${projects.length} projects`}
        actions={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAddingContrib(true); setEditingId(null) }}>Add Contribution</Button>}
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Contributions', value: allContributions.length, icon: Briefcase, color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Active Projects', value: projects.length, icon: Zap, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Engineers Contributing', value: EMPLOYEES.filter(e => e.projectContributions.length > 0).length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Avg Impact Score', value: `${avgImpact(allContributions)}%`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Add contribution form */}
        {addingContrib && (
          <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-brand-600" />
              <h4 className="text-sm font-semibold text-slate-800">New Contribution</h4>
              <button onClick={() => { setAddingContrib(false); setAddForm({ leadershipScore: 3, collaborationScore: 3, innovationScore: 3, evidenceLinks: [] }); setAddEmpId('') }} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <ContribForm form={addForm} setForm={setAddForm} showEmpSelect employees={EMPLOYEES} empId={addEmpId} setEmpId={setAddEmpId} />
            <div className="flex gap-2 mt-4">
              <button onClick={saveNewContrib} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
                <Check className="w-3.5 h-3.5" /> Save Contribution
              </button>
              <button onClick={() => { setAddingContrib(false); setAddForm({ leadershipScore: 3, collaborationScore: 3, innovationScore: 3, evidenceLinks: [] }); setAddEmpId('') }} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Contributions list */}
        <div className="space-y-4">
          {allContributions.map(contribution => {
            const emp = EMPLOYEES.find(e => e.id === contribution.employeeId)

            if (editingId === contribution.id) {
              return (
                <div key={contribution.id} className="bg-white rounded-xl border-2 border-brand-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-brand-600" />
                    <h4 className="text-sm font-semibold text-slate-800">Edit Contribution</h4>
                    {emp && <span className="text-xs text-slate-400">· {emp.name}</span>}
                    <button onClick={cancelEdit} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <ContribForm form={editForm} setForm={setEditForm} />
                  <div className="flex gap-2 mt-4">
                    <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
                      <Check className="w-3.5 h-3.5" /> Save Contribution
                    </button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={contribution.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <Link href={`/employees/${contribution.employeeId}`}>
                      <Avatar name={contribution.employeeName} size="md" />
                    </Link>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{contribution.projectName}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Link href={`/employees/${contribution.employeeId}`} className="text-brand-600 hover:underline font-medium">
                          {contribution.employeeName}
                        </Link>
                        <span>·</span>
                        <span>{contribution.initiative}</span>
                        <span>·</span>
                        <span>{formatDate(contribution.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => startEdit(contribution)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === contribution.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button onClick={() => deleteContrib(contribution.id, contribution.employeeId)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(contribution.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">{contribution.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-green-700 mb-1 uppercase tracking-wider">Business Impact</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{contribution.businessImpact}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-blue-700 mb-1 uppercase tracking-wider">Technical Impact</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{contribution.technicalImpact}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {[
                    { label: 'Leadership', value: contribution.leadershipScore, color: 'bg-purple-500' },
                    { label: 'Collaboration', value: contribution.collaborationScore, color: 'bg-teal-500' },
                    { label: 'Innovation', value: contribution.innovationScore, color: 'bg-amber-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{label}:</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={cn('w-2.5 h-2.5 rounded-full', i <= value ? color : 'bg-slate-200')} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-600">{value}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
