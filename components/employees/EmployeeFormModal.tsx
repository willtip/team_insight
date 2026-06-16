'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { useEmployees } from '@/lib/employee-store'
import { cn } from '@/lib/utils'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Employee, Skill, SkillLevel, PromotionReadiness } from '@/lib/types'

const SKILL_SUGGESTIONS = [
  'AIOps', 'GenAI/LLMs', 'MLOps', 'Python', 'Ansible', 'Terraform',
  'Kubernetes', 'CI/CD', 'Observability', 'ServiceNow', 'TypeScript',
  'Security', 'Architecture', 'Cloud Infrastructure', 'Go', 'Java',
]

const LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const LEVEL_SCORE: Record<SkillLevel, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }

type Tab = 'info' | 'skills'

interface Props {
  employee?: Employee
  onClose: () => void
}

interface SkillDraft {
  id: string
  name: string
  category: string
  currentLevel: SkillLevel
  targetLevel: SkillLevel
}

const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'text-xs font-medium text-slate-700 mb-1 block'

export default function EmployeeFormModal({ employee, onClose }: Props) {
  const { addEmployee, updateEmployee } = useEmployees()
  const isEdit = !!employee

  const [tab, setTab] = useState<Tab>('info')
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    title: employee?.title ?? '',
    level: employee?.level ?? 'L4',
    department: employee?.department ?? 'Automation Solution Engineering',
    email: employee?.email ?? '',
    location: employee?.location ?? '',
    hireDate: employee?.hireDate ?? '',
    bio: employee?.bio ?? '',
    careerAspirations: employee?.careerAspirations ?? '',
    promotionReadiness: (employee?.promotionReadiness ?? 'Ready in 12 Months') as PromotionReadiness,
    isHighPotential: employee?.isHighPotential ?? false,
    needsCoaching: employee?.needsCoaching ?? false,
    tags: employee?.tags.join(', ') ?? '',
  })

  const [skills, setSkills] = useState<SkillDraft[]>(
    employee?.skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      currentLevel: s.currentLevel,
      targetLevel: s.targetLevel,
    })) ?? []
  )

  const [newSkill, setNewSkill] = useState<{ name: string; category: string; currentLevel: SkillLevel; targetLevel: SkillLevel }>({
    name: '', category: 'Core', currentLevel: 'Intermediate', targetLevel: 'Advanced',
  })

  const addSkill = () => {
    if (!newSkill.name.trim()) return
    setSkills(prev => [...prev, {
      id: `skill-${Date.now()}`,
      name: newSkill.name.trim(),
      category: newSkill.category || 'Core',
      currentLevel: newSkill.currentLevel,
      targetLevel: newSkill.targetLevel,
    }])
    setNewSkill({ name: '', category: 'Core', currentLevel: 'Intermediate', targetLevel: 'Advanced' })
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.title.trim()) return

    const builtSkills: Skill[] = skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      currentLevel: s.currentLevel,
      targetLevel: s.targetLevel,
      score: LEVEL_SCORE[s.currentLevel],
      lastUpdated: new Date().toISOString().split('T')[0],
    }))

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    if (isEdit && employee) {
      updateEmployee(employee.id, {
        name: form.name, title: form.title, level: form.level,
        department: form.department, email: form.email, location: form.location,
        hireDate: form.hireDate, bio: form.bio, careerAspirations: form.careerAspirations,
        promotionReadiness: form.promotionReadiness, isHighPotential: form.isHighPotential,
        needsCoaching: form.needsCoaching, tags, skills: builtSkills,
      })
    } else {
      addEmployee({
        name: form.name, title: form.title, level: form.level,
        department: form.department, email: form.email, location: form.location,
        hireDate: form.hireDate, bio: form.bio, careerAspirations: form.careerAspirations,
        promotionReadiness: form.promotionReadiness, isHighPotential: form.isHighPotential,
        needsCoaching: form.needsCoaching, tags, skills: builtSkills,
        managerId: 'mgr-001', managerName: 'William Tipton',
        employeeId: `ASE-${Date.now().toString().slice(-5)}`,
        goals: [], projectContributions: [], notes: [], accomplishments: [],
        development: { certifications: [], training: [], conferences: [], mentoring: [] },
        performanceScore: {
          overall: 75, goalAchievement: 75, projectContributions: 75,
          professionalDevelopment: 70, leadershipBehaviors: 70, collaboration: 75,
          innovation: 70, growthScore: 70, leadershipReadiness: 65,
          promotionReadiness: 60, trend: 'stable', lastCalculated: new Date().toISOString(),
        },
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit ${employee.name}` : 'Add Team Member'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {(['info', 'skills'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              )}>
              {t === 'info' ? 'Basic Info' : `Skills (${skills.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={INPUT} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className={LABEL}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={INPUT} placeholder="Senior AI Solutions Engineer" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Level</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={INPUT}>
                    {['L3', 'L4', 'L5', 'L6'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={LABEL}>Department</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={INPUT} placeholder="jane.smith@company.com" />
                </div>
                <div>
                  <label className={LABEL}>Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className={INPUT} placeholder="Austin, TX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Hire Date</label>
                  <input type="date" value={form.hireDate} onChange={e => setForm(f => ({ ...f, hireDate: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Promotion Readiness</label>
                  <select value={form.promotionReadiness}
                    onChange={e => setForm(f => ({ ...f, promotionReadiness: e.target.value as PromotionReadiness }))} className={INPUT}>
                    {(['Ready Now', 'Ready in 6 Months', 'Ready in 12 Months', 'Development Needed'] as PromotionReadiness[]).map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Bio</label>
                <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className={cn(INPUT, 'resize-none')} placeholder="Background and expertise summary..." />
              </div>
              <div>
                <label className={LABEL}>Career Aspirations</label>
                <textarea rows={2} value={form.careerAspirations} onChange={e => setForm(f => ({ ...f, careerAspirations: e.target.value }))}
                  className={cn(INPUT, 'resize-none')} placeholder="Long-term goals and development interests..." />
              </div>
              <div>
                <label className={LABEL}>Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className={INPUT} placeholder="AI Specialist, On-Call Lead, Ansible Expert" />
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isHighPotential}
                    onChange={e => setForm(f => ({ ...f, isHighPotential: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-slate-700">High Potential</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.needsCoaching}
                    onChange={e => setForm(f => ({ ...f, needsCoaching: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-slate-700">Needs Coaching</span>
                </label>
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {skills.map((skill, i) => (
                  <div key={skill.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{skill.name}</p>
                      <p className="text-xs text-slate-400">{skill.category}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">Current:</span>
                      <select value={skill.currentLevel}
                        onChange={e => setSkills(prev => prev.map((s, j) => j === i ? { ...s, currentLevel: e.target.value as SkillLevel } : s))}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                        {LEVELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <span className="text-xs text-slate-500">Target:</span>
                      <select value={skill.targetLevel}
                        onChange={e => setSkills(prev => prev.map((s, j) => j === i ? { ...s, targetLevel: e.target.value as SkillLevel } : s))}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                        {LEVELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setSkills(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {skills.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No skills added yet — add from the section below.</p>
                )}
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-xs font-semibold text-slate-600 mb-3">Add Skill</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Skill Name</label>
                    <input list="skill-suggestions" value={newSkill.name}
                      onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addSkill()}
                      className={INPUT} placeholder="e.g. AIOps" />
                    <datalist id="skill-suggestions">
                      {SKILL_SUGGESTIONS.filter(s => !skills.find(sk => sk.name === s)).map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Category</label>
                    <input value={newSkill.category} onChange={e => setNewSkill(s => ({ ...s, category: e.target.value }))}
                      className={INPUT} placeholder="e.g. Core, Emerging, Infra" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-slate-500">Current:</span>
                    <select value={newSkill.currentLevel} onChange={e => setNewSkill(s => ({ ...s, currentLevel: e.target.value as SkillLevel }))}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <span className="text-xs text-slate-500">Target:</span>
                    <select value={newSkill.targetLevel} onChange={e => setNewSkill(s => ({ ...s, targetLevel: e.target.value as SkillLevel }))}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                      {LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addSkill}
                    disabled={!newSkill.name.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.title.trim()}>
            {isEdit ? 'Save Changes' : 'Add to Team'}
          </Button>
        </div>
      </div>
    </div>
  )
}
