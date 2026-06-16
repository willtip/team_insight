'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Avatar from '@/components/ui/Avatar'
import { useEmployees } from '@/lib/employee-store'
import { cn, goalStatusColor, goalPriorityColor, formatDate, scoreToColor } from '@/lib/utils'
import {
  Plus, CheckCircle, Clock, AlertTriangle, Target,
  Pencil, Trash2, X, Check, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus, GoalCategory, GoalPriority, Goal } from '@/lib/types'

const STATUS_COLUMNS: GoalStatus[] = ['Not Started', 'In Progress', 'At Risk', 'Completed']

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  'Not Started': { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  'In Progress': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  'At Risk': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Completed': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
}

const STATUSES: GoalStatus[] = ['Not Started', 'In Progress', 'At Risk', 'Completed', 'Deferred']
const PRIORITIES: GoalPriority[] = ['Low', 'Medium', 'High', 'Critical']
const GOAL_CATEGORIES: GoalCategory[] = ['Quarterly', 'Annual', 'Personal Development', 'Organizational']

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

export default function GoalsPage() {
  const { employees: EMPLOYEES, updateEmployee } = useEmployees()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | 'All'>('All')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Goal>>({})

  const [addingGoal, setAddingGoal] = useState(false)
  const [addEmpId, setAddEmpId] = useState('')
  const [addForm, setAddForm] = useState<Partial<Goal>>({ status: 'Not Started', priority: 'Medium', category: 'Quarterly', progress: 0 })

  const allGoals = EMPLOYEES.flatMap(e => e.goals.map(g => ({ ...g, employeeId: e.id })))

  const filtered = useMemo(() => {
    return allGoals.filter(goal => {
      if (categoryFilter !== 'All' && goal.category !== categoryFilter) return false
      if (employeeFilter !== 'all' && goal.employeeId !== employeeFilter) return false
      if (search && !goal.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [allGoals, categoryFilter, employeeFilter, search])

  const getEmployee = (id: string) => EMPLOYEES.find(e => e.id === id)
  const goalsByStatus = (status: GoalStatus) => filtered.filter(g => g.status === status)

  const summary = {
    total: allGoals.length,
    completed: allGoals.filter(g => g.status === 'Completed').length,
    inProgress: allGoals.filter(g => g.status === 'In Progress').length,
    atRisk: allGoals.filter(g => g.status === 'At Risk').length,
    avgProgress: allGoals.length ? Math.round(allGoals.reduce((a, g) => a + g.progress, 0) / allGoals.length) : 0,
  }

  const startEdit = (goal: Goal) => {
    setEditingGoalId(goal.id)
    setEditForm({ ...goal })
    setAddingGoal(false)
  }

  const cancelEdit = () => { setEditingGoalId(null); setEditForm({}) }

  const saveEdit = () => {
    if (!editForm.title?.trim()) return
    const goal = allGoals.find(g => g.id === editingGoalId)
    if (!goal) return
    const emp = EMPLOYEES.find(e => e.id === goal.employeeId)
    if (!emp) return
    updateEmployee(emp.id, {
      goals: emp.goals.map(g => g.id === editingGoalId
        ? { ...g, ...editForm, updatedAt: new Date().toISOString() }
        : g
      )
    })
    cancelEdit()
  }

  const deleteGoal = (goalId: string, empId: string) => {
    const emp = EMPLOYEES.find(e => e.id === empId)
    if (!emp) return
    updateEmployee(emp.id, { goals: emp.goals.filter(g => g.id !== goalId) })
    setDeletingGoalId(null)
  }

  const saveNewGoal = () => {
    if (!addForm.title?.trim() || !addEmpId) return
    const emp = EMPLOYEES.find(e => e.id === addEmpId)
    if (!emp) return
    const now = new Date().toISOString()
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      employeeId: addEmpId,
      title: addForm.title || '',
      description: addForm.description || '',
      strategicAlignment: addForm.strategicAlignment || '',
      dueDate: addForm.dueDate || '',
      priority: addForm.priority || 'Medium',
      progress: addForm.progress ?? 0,
      status: addForm.status || 'Not Started',
      category: addForm.category || 'Quarterly',
      createdAt: now,
      updatedAt: now,
    }
    updateEmployee(addEmpId, { goals: [...emp.goals, newGoal] })
    setAddingGoal(false)
    setAddForm({ status: 'Not Started', priority: 'Medium', category: 'Quarterly', progress: 0 })
    setAddEmpId('')
  }

  const GoalFormFields = ({ form, setForm, showEmpSelect }: { form: Partial<Goal>; setForm: React.Dispatch<React.SetStateAction<Partial<Goal>>>; showEmpSelect?: boolean }) => (
    <div className="space-y-3">
      {showEmpSelect && (
        <div>
          <label className={labelCls}>Engineer *</label>
          <select value={addEmpId} onChange={e => setAddEmpId(e.target.value)} className={inputCls}>
            <option value="">Select engineer...</option>
            {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Title *</label>
          <input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Goal title..." />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status || 'Not Started'} onChange={e => setForm(f => ({ ...f, status: e.target.value as GoalStatus }))} className={inputCls}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value as GoalPriority }))} className={inputCls}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select value={form.category || 'Quarterly'} onChange={e => setForm(f => ({ ...f, category: e.target.value as GoalCategory }))} className={inputCls}>
            {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" value={form.dueDate || ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Progress (%)</label>
          <input type="number" min={0} max={100} value={form.progress ?? 0} onChange={e => setForm(f => ({ ...f, progress: Math.min(100, Math.max(0, Number(e.target.value))) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Strategic Alignment</label>
          <input type="text" value={form.strategicAlignment || ''} onChange={e => setForm(f => ({ ...f, strategicAlignment: e.target.value }))} className={inputCls} placeholder="e.g. Team OKR Q3" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Description</label>
          <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={cn(inputCls, 'resize-none h-16')} placeholder="Goal description..." />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Goal Management"
        subtitle={`${summary.total} goals across ${EMPLOYEES.length} engineers`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setView('kanban')} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-all', view === 'kanban' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}>Kanban</button>
              <button onClick={() => setView('list')} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-all', view === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}>List</button>
            </div>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAddingGoal(true); setEditingGoalId(null) }}>New Goal</Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total Goals', value: summary.total, color: 'text-slate-800' },
            { label: 'Completed', value: summary.completed, color: 'text-green-600' },
            { label: 'In Progress', value: summary.inProgress, color: 'text-blue-600' },
            { label: 'At Risk', value: summary.atRisk, color: 'text-amber-600' },
            { label: 'Avg Progress', value: `${summary.avgProgress}%`, color: scoreToColor(summary.avgProgress) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <input type="text" placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-3 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category:</span>
            {(['All', 'Quarterly', 'Annual', 'Personal Development', 'Organizational'] as const).map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all', categoryFilter === cat ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {cat === 'Personal Development' ? 'Dev' : cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Engineer:</span>
            <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="all">All Engineers</option>
              {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        {/* Add goal form */}
        {addingGoal && (
          <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-brand-600" />
              <h4 className="text-sm font-semibold text-slate-800">New Goal</h4>
              <button onClick={() => { setAddingGoal(false); setAddForm({ status: 'Not Started', priority: 'Medium', category: 'Quarterly', progress: 0 }); setAddEmpId('') }} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <GoalFormFields form={addForm} setForm={setAddForm} showEmpSelect />
            <div className="flex gap-2 mt-4">
              <button onClick={saveNewGoal} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
                <Check className="w-3.5 h-3.5" /> Save Goal
              </button>
              <button onClick={() => { setAddingGoal(false); setAddForm({ status: 'Not Started', priority: 'Medium', category: 'Quarterly', progress: 0 }); setAddEmpId('') }} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Kanban view */}
        {view === 'kanban' && (
          <div className="grid grid-cols-4 gap-4">
            {STATUS_COLUMNS.map(status => {
              const goals = goalsByStatus(status)
              const config = STATUS_CONFIG[status]
              const Icon = config.icon
              return (
                <div key={status} className="flex flex-col gap-2">
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', config.bg, config.border)}>
                    <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    <span className={cn('text-xs font-semibold', config.color)}>{status}</span>
                    <span className="ml-auto text-xs font-bold text-slate-600">{goals.length}</span>
                  </div>
                  <div className="space-y-2.5 min-h-32">
                    {goals.map(goal => {
                      const emp = getEmployee(goal.employeeId)

                      if (editingGoalId === goal.id) {
                        return (
                          <div key={goal.id} className="bg-white rounded-lg border-2 border-brand-200 p-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-brand-700">Edit Goal</span>
                              <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <GoalFormFields form={editForm} setForm={setEditForm} />
                            <div className="flex gap-1.5 mt-3">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700">
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button onClick={cancelEdit} className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={goal.id} className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-card-hover transition-all">
                          <div className="flex items-start gap-2 mb-2">
                            {emp && (
                              <Link href={`/employees/${goal.employeeId}`} onClick={e => e.stopPropagation()}>
                                <Avatar name={emp.name} size="xs" />
                              </Link>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 leading-tight">{goal.title}</p>
                              {emp && (
                                <Link href={`/employees/${goal.employeeId}`} className="text-[10px] text-brand-500 hover:underline">
                                  {emp.name.split(' ')[0]}
                                </Link>
                              )}
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                              <button onClick={() => startEdit(goal)} className="p-0.5 text-slate-400 hover:text-brand-600 rounded" title="Edit"><Pencil className="w-3 h-3" /></button>
                              {deletingGoalId === goal.id ? (
                                <>
                                  <button onClick={() => deleteGoal(goal.id, goal.employeeId)} className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded">Yes</button>
                                  <button onClick={() => setDeletingGoalId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">No</button>
                                </>
                              ) : (
                                <button onClick={() => setDeletingGoalId(goal.id)} className="p-0.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                              )}
                            </div>
                          </div>
                          <div className="mb-2">
                            <Progress value={goal.progress} color="auto" size="sm" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', goalPriorityColor(goal.priority))}>{goal.priority}</span>
                            <span className="text-[10px] text-slate-400">{formatDate(goal.dueDate)}</span>
                            <span className="text-[10px] font-semibold text-slate-600">{goal.progress}%</span>
                          </div>
                        </div>
                      )
                    })}
                    {goals.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                        <p className="text-xs text-slate-400">No goals</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_80px_80px_100px_80px_72px] gap-4 px-5 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <span>Goal</span>
              <span>Owner</span>
              <span>Priority</span>
              <span>Category</span>
              <span>Progress</span>
              <span>Due Date</span>
              <span></span>
            </div>
            {filtered.map(goal => {
              const emp = getEmployee(goal.employeeId)

              if (editingGoalId === goal.id) {
                return (
                  <div key={goal.id} className="px-5 py-4 border-b border-slate-100 bg-brand-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-brand-700">Edit Goal</span>
                      <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <GoalFormFields form={editForm} setForm={setEditForm} />
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700">
                        <Check className="w-3.5 h-3.5" /> Save Goal
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={goal.id} className="grid grid-cols-[2fr_1fr_80px_80px_100px_80px_72px] gap-4 px-5 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', goalStatusColor(goal.status))}>{goal.status}</span>
                      <p className="text-xs font-medium text-slate-800 truncate">{goal.title}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{goal.strategicAlignment}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {emp && <Avatar name={emp.name} size="xs" />}
                    <Link href={`/employees/${goal.employeeId}`} className="text-xs text-slate-600 hover:text-brand-600 hover:underline">{emp?.name.split(' ')[0]}</Link>
                  </div>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium w-fit', goalPriorityColor(goal.priority))}>{goal.priority}</span>
                  <span className="text-xs text-slate-500">{goal.category === 'Personal Development' ? 'Dev' : goal.category}</span>
                  <div><Progress value={goal.progress} color="auto" size="sm" showLabel /></div>
                  <span className="text-xs text-slate-500">{formatDate(goal.dueDate)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(goal)} className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    {deletingGoalId === goal.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteGoal(goal.id, goal.employeeId)} className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded">Yes</button>
                        <button onClick={() => setDeletingGoalId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingGoalId(goal.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No goals match your filters</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
