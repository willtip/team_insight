'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import SkillsHeatmap from '@/components/charts/SkillsHeatmap'
import Button from '@/components/ui/Button'
import { useEmployees } from '@/lib/employee-store'
import { cn, skillLevelColor } from '@/lib/utils'
import {
  AlertTriangle, TrendingUp, Users, Shield, Zap,
  BarChart3, Map, Download, Pencil, Trash2, Plus, X, Check
} from 'lucide-react'
import type { SkillLevel, Skill } from '@/lib/types'

const CATEGORIES = ['All', 'Platform', 'Infrastructure', 'Languages', 'Emerging', 'Frontend', 'Design']
const SKILL_CATEGORIES = ['Platform', 'Infrastructure', 'Languages', 'Emerging', 'Frontend', 'Design']
const LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const levelToScore = (l: SkillLevel) => LEVELS.indexOf(l) + 1

const SKILL_GAPS = [
  { skill: 'AI Engineering', coverage: 30, risk: 'High', recommended: 'Hire + Upskill' },
  { skill: 'OpenShift', coverage: 20, risk: 'Critical', recommended: 'Bus factor risk — 2 engineers only' },
  { skill: 'Go', coverage: 30, risk: 'Medium', recommended: 'Training program' },
  { skill: 'SRE', coverage: 40, risk: 'Medium', recommended: 'Expand on-call rotation' },
  { skill: 'Architecture', coverage: 50, risk: 'Low', recommended: 'Architecture review program' },
]

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

type SkillEdit = { currentLevel: SkillLevel; targetLevel: SkillLevel }

export default function SkillsPage() {
  const { employees: EMPLOYEES, updateEmployee } = useEmployees()
  const [activeCategory, setActiveCategory] = useState('All')
  const [view, setView] = useState<'heatmap' | 'gaps' | 'emerging'>('heatmap')

  const [editingSkillName, setEditingSkillName] = useState<string | null>(null)
  const [skillEdits, setSkillEdits] = useState<Record<string, SkillEdit>>({})
  const [deletingSkillName, setDeletingSkillName] = useState<string | null>(null)

  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState('Platform')
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('Beginner')
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())

  const teamSkillSummary = () => {
    const skillMap: Record<string, { levels: number[]; category: string }> = {}
    EMPLOYEES.forEach(emp => {
      emp.skills.forEach(skill => {
        if (!skillMap[skill.name]) skillMap[skill.name] = { levels: [], category: skill.category }
        skillMap[skill.name].levels.push(skill.score)
      })
    })
    return Object.entries(skillMap).map(([name, { levels, category }]) => ({
      name,
      category,
      avgLevel: Math.round((levels.reduce((a, b) => a + b, 0) / EMPLOYEES.length) * 10) / 10,
      expertCount: levels.filter(l => l === 4).length,
      advancedCount: levels.filter(l => l === 3).length,
      coveragePercent: Math.round((levels.filter(l => l > 0).length / EMPLOYEES.length) * 100),
    })).sort((a, b) => b.avgLevel - a.avgLevel)
  }

  const skills = teamSkillSummary()

  const startEditSkill = (skillName: string) => {
    const edits: Record<string, SkillEdit> = {}
    EMPLOYEES.forEach(emp => {
      const skill = emp.skills.find(s => s.name === skillName)
      if (skill) edits[emp.id] = { currentLevel: skill.currentLevel, targetLevel: skill.targetLevel }
    })
    setSkillEdits(edits)
    setEditingSkillName(skillName)
    setAddingSkill(false)
  }

  const saveSkillEdits = () => {
    EMPLOYEES.forEach(emp => {
      const edit = skillEdits[emp.id]
      if (!edit) return
      updateEmployee(emp.id, {
        skills: emp.skills.map(s => s.name === editingSkillName
          ? { ...s, currentLevel: edit.currentLevel, targetLevel: edit.targetLevel, score: levelToScore(edit.currentLevel), lastUpdated: new Date().toISOString() }
          : s
        )
      })
    })
    setEditingSkillName(null)
    setSkillEdits({})
  }

  const deleteSkill = (skillName: string) => {
    EMPLOYEES.forEach(emp => {
      if (emp.skills.some(s => s.name === skillName)) {
        updateEmployee(emp.id, { skills: emp.skills.filter(s => s.name !== skillName) })
      }
    })
    setDeletingSkillName(null)
  }

  const saveNewSkill = () => {
    if (!newSkillName.trim() || selectedEmployees.size === 0) return
    selectedEmployees.forEach(empId => {
      const emp = EMPLOYEES.find(e => e.id === empId)
      if (!emp || emp.skills.some(s => s.name === newSkillName)) return
      const newSkill: Skill = {
        id: `skill-${Date.now()}-${empId}`,
        name: newSkillName.trim(),
        category: newSkillCategory,
        currentLevel: newSkillLevel,
        targetLevel: newSkillLevel,
        lastUpdated: new Date().toISOString(),
        score: levelToScore(newSkillLevel),
      }
      updateEmployee(empId, { skills: [...emp.skills, newSkill] })
    })
    setAddingSkill(false)
    setNewSkillName('')
    setNewSkillCategory('Platform')
    setNewSkillLevel('Beginner')
    setSelectedEmployees(new Set())
  }

  const toggleEmp = (empId: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev)
      next.has(empId) ? next.delete(empId) : next.add(empId)
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Skills Matrix"
        subtitle="Team-wide skill coverage, gaps, and growth opportunities"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-slate-600">Expert Skills</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {EMPLOYEES.reduce((acc, e) => acc + e.skills.filter(s => s.currentLevel === 'Expert').length, 0)}
            </p>
            <p className="text-xs text-slate-400">across the team</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-600">Skill Gaps</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">5</p>
            <p className="text-xs text-slate-400">critical gaps identified</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs font-semibold text-slate-600">Growing Skills</span>
            </div>
            <p className="text-2xl font-bold text-green-600">8</p>
            <p className="text-xs text-slate-400">skills trending up Q2</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-slate-600">Bus Factor Risk</span>
            </div>
            <p className="text-2xl font-bold text-red-600">3</p>
            <p className="text-xs text-slate-400">single-point skills</p>
          </div>
        </div>

        {/* View toggle and filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {([
              { id: 'heatmap', label: 'Heat Map', icon: Map },
              { id: 'gaps', label: 'Gap Analysis', icon: AlertTriangle },
              { id: 'emerging', label: 'Skill Inventory', icon: BarChart3 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all', view === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {view === 'heatmap' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter:</span>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all', activeCategory === cat ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {cat}
                </button>
              ))}
            </div>
          )}
          {view === 'emerging' && (
            <button onClick={() => { setAddingSkill(true); setEditingSkillName(null) }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Skill
            </button>
          )}
        </div>

        {/* Heatmap */}
        {view === 'heatmap' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Team Skills Coverage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hover any cell to see engineer and skill details</p>
            </div>
            <SkillsHeatmap employees={EMPLOYEES} filterCategory={activeCategory !== 'All' ? activeCategory : undefined} />
          </div>
        )}

        {/* Gap Analysis */}
        {view === 'gaps' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Critical Skills Gaps</h3>
              <div className="space-y-3">
                {SKILL_GAPS.map(gap => (
                  <div key={gap.skill} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <div className="w-32 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-800">{gap.skill}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className={cn('h-full rounded-full', gap.coverage >= 60 ? 'bg-green-500' : gap.coverage >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${gap.coverage}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{gap.coverage}%</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Team coverage</p>
                    </div>
                    <div className="w-20 text-center">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', gap.risk === 'Critical' ? 'bg-red-100 text-red-700' : gap.risk === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                        {gap.risk}
                      </span>
                    </div>
                    <div className="flex-1 text-xs text-slate-600">
                      <span className="font-medium">Rec: </span>{gap.recommended}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Upskilling Candidates — AI Engineering</h3>
              <div className="space-y-2">
                {EMPLOYEES.filter(e => {
                  const aiSkill = e.skills.find(s => s.name === 'AI Engineering')
                  return aiSkill && aiSkill.score <= 2
                }).slice(0, 5).map(emp => {
                  const aiSkill = emp.skills.find(s => s.name === 'AI Engineering')
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{emp.name[0]}</div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-800">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.title}</p>
                      </div>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', skillLevelColor(aiSkill?.currentLevel ?? 'Beginner'))}>{aiSkill?.currentLevel ?? 'None'}</span>
                      <span className="text-xs text-slate-500">→</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', skillLevelColor(aiSkill?.targetLevel ?? 'Intermediate'))}>{aiSkill?.targetLevel ?? 'Intermediate'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Skill Inventory */}
        {view === 'emerging' && (
          <div className="space-y-3">
            {/* Add skill form */}
            {addingSkill && (
              <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-4 h-4 text-brand-600" />
                  <h4 className="text-sm font-semibold text-slate-800">Add New Skill</h4>
                  <button onClick={() => { setAddingSkill(false); setSelectedEmployees(new Set()) }} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Skill Name *</label>
                      <input type="text" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} className={inputCls} placeholder="e.g. Terraform" />
                    </div>
                    <div>
                      <label className={labelCls}>Category</label>
                      <select value={newSkillCategory} onChange={e => setNewSkillCategory(e.target.value)} className={inputCls}>
                        {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Default Level</label>
                      <select value={newSkillLevel} onChange={e => setNewSkillLevel(e.target.value as SkillLevel)} className={inputCls}>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={cn(labelCls, 'mb-2')}>Add to engineers ({selectedEmployees.size} selected)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {EMPLOYEES.map(emp => (
                        <label key={emp.id} className={cn('flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all', selectedEmployees.has(emp.id) ? 'bg-brand-50 border-brand-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}>
                          <input type="checkbox" checked={selectedEmployees.has(emp.id)} onChange={() => toggleEmp(emp.id)} className="w-3.5 h-3.5 accent-brand-600" />
                          <span className="text-xs font-medium text-slate-700 truncate">{emp.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveNewSkill} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
                      <Check className="w-3.5 h-3.5" /> Add Skill
                    </button>
                    <button onClick={() => { setAddingSkill(false); setSelectedEmployees(new Set()) }} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[200px_80px_100px_100px_100px_1fr_80px] gap-4 px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 bg-slate-50">
                <span>Skill</span>
                <span>Category</span>
                <span>Avg Level</span>
                <span>Experts</span>
                <span>Coverage</span>
                <span>Distribution</span>
                <span></span>
              </div>

              {skills.map(skill => (
                <div key={skill.name}>
                  {/* Skill summary row */}
                  <div className={cn('grid grid-cols-[200px_80px_100px_100px_100px_1fr_80px] gap-4 px-5 py-3 border-b border-slate-100 items-center transition-colors', editingSkillName === skill.name ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                    <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                    <span className="text-xs text-slate-500">{skill.category}</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-700">{skill.avgLevel}</span>
                      <span className="text-xs text-slate-400">/4</span>
                    </div>
                    <span className="text-xs font-semibold text-purple-600">{skill.expertCount}</span>
                    <div>
                      <span className={cn('text-xs font-semibold', skill.coveragePercent >= 70 ? 'text-green-600' : skill.coveragePercent >= 40 ? 'text-amber-600' : 'text-red-600')}>
                        {skill.coveragePercent}%
                      </span>
                    </div>
                    <div className="flex gap-1 h-4 items-end">
                      {[4, 3, 2, 1, 0].map(level => {
                        const count = EMPLOYEES.reduce((acc, emp) => {
                          const s = emp.skills.find(sk => sk.name === skill.name)
                          return acc + (s?.score === level ? 1 : 0)
                        }, 0)
                        return (
                          <div
                            key={level}
                            className={cn('rounded-sm min-w-[6px]', level === 4 ? 'bg-blue-700' : level === 3 ? 'bg-blue-500' : level === 2 ? 'bg-blue-300' : level === 1 ? 'bg-blue-200' : 'bg-slate-100')}
                            style={{ height: `${Math.max(2, (count / EMPLOYEES.length) * 100)}%`, width: `${count / EMPLOYEES.length * 40 + 6}px` }}
                            title={`${count} engineers at level ${level}`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingSkillName === skill.name ? (
                        <>
                          <button onClick={saveSkillEdits} className="p-1 text-brand-600 hover:bg-brand-100 rounded" title="Save"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditingSkillName(null); setSkillEdits({}) }} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditSkill(skill.name)} className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit levels"><Pencil className="w-3.5 h-3.5" /></button>
                          {deletingSkillName === skill.name ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteSkill(skill.name)} className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded">Yes</button>
                              <button onClick={() => setDeletingSkillName(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingSkillName(skill.name)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete skill"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded per-engineer level editor */}
                  {editingSkillName === skill.name && (
                    <div className="bg-brand-50 border-b border-brand-100 px-5 py-3">
                      <p className="text-xs font-semibold text-brand-700 mb-3">Edit skill levels per engineer</p>
                      <div className="grid grid-cols-2 gap-2">
                        {EMPLOYEES.filter(emp => emp.skills.some(s => s.name === skill.name)).map(emp => {
                          const edit = skillEdits[emp.id]
                          if (!edit) return null
                          return (
                            <div key={emp.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-brand-100">
                              <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">{emp.name[0]}</div>
                              <span className="text-xs font-medium text-slate-700 flex-1 truncate">{emp.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Current:</span>
                                <select
                                  value={edit.currentLevel}
                                  onChange={e => setSkillEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], currentLevel: e.target.value as SkillLevel } }))}
                                  className="text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <span className="text-[10px] text-slate-500">Target:</span>
                                <select
                                  value={edit.targetLevel}
                                  onChange={e => setSkillEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], targetLevel: e.target.value as SkillLevel } }))}
                                  className="text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
