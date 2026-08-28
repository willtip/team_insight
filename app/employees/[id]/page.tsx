'use client'

import { useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import SkillsRadar from '@/components/charts/SkillsRadar'
import ContributionRadar from '@/components/charts/ContributionRadar'
import EmployeeFormModal from '@/components/employees/EmployeeFormModal'
import { useEmployees } from '@/lib/employee-store'
import { useSkillCatalog } from '@/lib/skill-catalog-store'
import { resolveEmployeeSkills, summarizeEmployee } from '@/lib/skill-analytics'
import {
  cn, formatDate, skillLevelColor, skillPriorityColor, goalStatusColor, goalPriorityColor,
  promotionReadinessColor, scoreToColor, proficiencyLabel, clampLevel,
} from '@/lib/utils'
import {
  MapPin, Mail, Calendar, Building2, ArrowLeft, Star,
  AlertCircle, Target, Zap, BookOpen, MessageSquare,
  Award, TrendingUp, TrendingDown, Minus, ExternalLink,
  CheckCircle, Clock, AlertTriangle, Lock, Plus,
  Lightbulb, Flame, Pencil, Share2, Trophy, Trash2,
} from 'lucide-react'
import type {
  Accomplishment, ProficiencyLevel, Goal, ProjectContribution,
  DirectorNote, Certification, Training, Conference, MentoringRelation,
  GoalStatus, GoalPriority, GoalCategory, NoteCategory,
} from '@/lib/types'

const TABS = ['Overview', 'Goals', 'Skills', 'Projects', 'Development', 'Accomplishments', 'Notes', 'Performance'] as const
type Tab = typeof TABS[number]

const ACCOMPLISHMENT_CATEGORIES = ['Technical', 'Leadership', 'Collaboration', 'Innovation', 'Other'] as const
const ACCOM_COLORS: Record<string, string> = {
  Technical: 'bg-blue-100 text-blue-700',
  Leadership: 'bg-amber-100 text-amber-700',
  Collaboration: 'bg-teal-100 text-teal-700',
  Innovation: 'bg-purple-100 text-purple-700',
  Other: 'bg-slate-100 text-slate-600',
}

const GOAL_STATUSES: GoalStatus[] = ['Not Started', 'In Progress', 'At Risk', 'Completed', 'Deferred']
const GOAL_PRIORITIES: GoalPriority[] = ['Low', 'Medium', 'High', 'Critical']
const GOAL_CATEGORIES: GoalCategory[] = ['Quarterly', 'Annual', 'Personal Development', 'Organizational']
const NOTE_CATEGORIES: NoteCategory[] = [
  'Coaching', 'Recognition', 'Leadership Potential', 'Performance Observation',
  'Career Aspirations', 'Succession Planning', 'Concerns', 'Follow-Up Actions',
]

const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'text-xs font-medium text-slate-700 mb-1 block'

// Reusable inline delete confirm component
function DeleteConfirm({ id, deletingId, onArm, onConfirm, onCancel }: {
  id: string; deletingId: string | null
  onArm: () => void; onConfirm: () => void; onCancel: () => void
}) {
  if (deletingId === id) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-red-600 font-medium">Delete?</span>
        <button onClick={onConfirm} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">Yes</button>
        <button onClick={onCancel} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200">No</button>
      </div>
    )
  }
  return (
    <button onClick={onArm} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors" title="Edit">
      <Pencil className="w-3.5 h-3.5" />
    </button>
  )
}

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const { employees, updateEmployee, updateSkillAssessment } = useEmployees()
  const { catalog, roleProfiles, thresholds } = useSkillCatalog()
  const employee = employees.find(e => e.id === params.id)
  if (!employee) return notFound()

  const skillRows = resolveEmployeeSkills(employee, catalog)
  const skillSummary = summarizeEmployee(employee, catalog, roleProfiles, thresholds)

  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [showEditModal, setShowEditModal] = useState(false)

  // ── Goals ──────────────────────────────────────────────
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [addingGoal, setAddingGoal] = useState(false)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [goalForm, setGoalForm] = useState<Partial<Goal>>({})

  const blankGoal = (): Partial<Goal> => ({
    title: '', description: '', strategicAlignment: '', dueDate: '',
    priority: 'Medium', progress: 0, status: 'Not Started', category: 'Quarterly',
  })

  const openEditGoal = (g: Goal) => { setGoalForm({ ...g }); setEditingGoalId(g.id); setAddingGoal(false) }
  const openAddGoal = () => { setGoalForm(blankGoal()); setEditingGoalId(null); setAddingGoal(true) }
  const cancelGoal = () => { setEditingGoalId(null); setAddingGoal(false) }
  const saveGoal = () => {
    if (!goalForm.title?.trim()) return
    const now = new Date().toISOString()
    if (addingGoal) {
      const item: Goal = {
        id: `goal-${Date.now()}`, employeeId: employee.id,
        title: goalForm.title!, description: goalForm.description ?? '',
        strategicAlignment: goalForm.strategicAlignment ?? '',
        dueDate: goalForm.dueDate ?? '', priority: goalForm.priority ?? 'Medium',
        progress: goalForm.progress ?? 0, status: goalForm.status ?? 'Not Started',
        category: goalForm.category ?? 'Quarterly', createdAt: now, updatedAt: now,
      }
      updateEmployee(employee.id, { goals: [...employee.goals, item] })
    } else {
      updateEmployee(employee.id, {
        goals: employee.goals.map(g => g.id === editingGoalId ? { ...g, ...goalForm, updatedAt: now } : g)
      })
    }
    cancelGoal()
  }
  const deleteGoal = (id: string) => {
    updateEmployee(employee.id, { goals: employee.goals.filter(g => g.id !== id) })
    setDeletingGoalId(null)
  }

  // ── Projects ───────────────────────────────────────────
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [addingProject, setAddingProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<Partial<ProjectContribution>>({})

  const blankProject = (): Partial<ProjectContribution> => ({
    projectName: '', initiative: '', description: '', businessImpact: '',
    technicalImpact: '', leadershipScore: 3, collaborationScore: 3, innovationScore: 3,
    date: '', evidenceLinks: [],
  })
  const openEditProject = (p: ProjectContribution) => { setProjectForm({ ...p }); setEditingProjectId(p.id); setAddingProject(false) }
  const openAddProject = () => { setProjectForm(blankProject()); setEditingProjectId(null); setAddingProject(true) }
  const cancelProject = () => { setEditingProjectId(null); setAddingProject(false) }
  const saveProject = () => {
    if (!projectForm.projectName?.trim()) return
    if (addingProject) {
      const item: ProjectContribution = {
        id: `proj-${Date.now()}`, employeeId: employee.id,
        projectName: projectForm.projectName!, initiative: projectForm.initiative ?? '',
        description: projectForm.description ?? '', businessImpact: projectForm.businessImpact ?? '',
        technicalImpact: projectForm.technicalImpact ?? '', date: projectForm.date ?? '',
        leadershipScore: projectForm.leadershipScore ?? 3,
        collaborationScore: projectForm.collaborationScore ?? 3,
        innovationScore: projectForm.innovationScore ?? 3,
        evidenceLinks: projectForm.evidenceLinks ?? [],
      }
      updateEmployee(employee.id, { projectContributions: [...employee.projectContributions, item] })
    } else {
      updateEmployee(employee.id, {
        projectContributions: employee.projectContributions.map(p =>
          p.id === editingProjectId ? { ...p, ...projectForm } : p
        )
      })
    }
    cancelProject()
  }
  const deleteProject = (id: string) => {
    updateEmployee(employee.id, { projectContributions: employee.projectContributions.filter(p => p.id !== id) })
    setDeletingProjectId(null)
  }

  // ── Notes ──────────────────────────────────────────────
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [addingNote, setAddingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [noteForm, setNoteForm] = useState<Partial<DirectorNote>>({})
  const [noteTags, setNoteTags] = useState('')

  const blankNote = (): Partial<DirectorNote> => ({
    title: '', content: '', category: 'Coaching', followUpDate: '', isPrivate: true, tags: [],
  })
  const openEditNote = (n: DirectorNote) => {
    setNoteForm({ ...n }); setNoteTags(n.tags.join(', ')); setEditingNoteId(n.id); setAddingNote(false)
  }
  const openAddNote = () => { setNoteForm(blankNote()); setNoteTags(''); setEditingNoteId(null); setAddingNote(true) }
  const cancelNote = () => { setEditingNoteId(null); setAddingNote(false) }
  const saveNote = () => {
    if (!noteForm.title?.trim()) return
    const now = new Date().toISOString()
    const tags = noteTags.split(',').map(t => t.trim()).filter(Boolean)
    if (addingNote) {
      const item: DirectorNote = {
        id: `note-${Date.now()}`, employeeId: employee.id,
        authorId: 'mgr-001', authorName: 'William Tipton',
        title: noteForm.title!, content: noteForm.content ?? '',
        category: noteForm.category ?? 'Coaching',
        followUpDate: noteForm.followUpDate || undefined,
        isPrivate: noteForm.isPrivate ?? true,
        tags, createdAt: now, updatedAt: now,
      }
      updateEmployee(employee.id, { notes: [...employee.notes, item] })
    } else {
      updateEmployee(employee.id, {
        notes: employee.notes.map(n =>
          n.id === editingNoteId ? { ...n, ...noteForm, tags, updatedAt: now } : n
        )
      })
    }
    cancelNote()
  }
  const deleteNote = (id: string) => {
    updateEmployee(employee.id, { notes: employee.notes.filter(n => n.id !== id) })
    setDeletingNoteId(null)
  }

  // ── Development ────────────────────────────────────────
  const [addingDevType, setAddingDevType] = useState<string | null>(null)
  const [editingDevId, setEditingDevId] = useState<string | null>(null)
  const [deletingDevId, setDeletingDevId] = useState<string | null>(null)

  const [certForm, setCertForm] = useState<Partial<Certification>>({})
  const [trainingForm, setTrainingForm] = useState<Partial<Training>>({})
  const [confForm, setConfForm] = useState<Partial<Conference>>({})
  const [mentorForm, setMentorForm] = useState<Partial<MentoringRelation>>({})

  const cancelDev = () => { setAddingDevType(null); setEditingDevId(null) }

  const saveCert = () => {
    if (!certForm.name?.trim()) return
    const dev = employee.development
    if (addingDevType === 'cert') {
      const item: Certification = {
        id: `cert-${Date.now()}`, name: certForm.name!, provider: certForm.provider ?? '',
        dateEarned: certForm.dateEarned ?? '', expirationDate: certForm.expirationDate || undefined,
        credentialId: certForm.credentialId || undefined,
      }
      updateEmployee(employee.id, { development: { ...dev, certifications: [...dev.certifications, item] } })
    } else {
      updateEmployee(employee.id, {
        development: {
          ...dev,
          certifications: dev.certifications.map(c => c.id === editingDevId ? { ...c, ...certForm } : c)
        }
      })
    }
    cancelDev(); setCertForm({})
  }
  const deleteCert = (id: string) => {
    updateEmployee(employee.id, {
      development: { ...employee.development, certifications: employee.development.certifications.filter(c => c.id !== id) }
    })
    setDeletingDevId(null)
  }

  const saveTraining = () => {
    if (!trainingForm.courseName?.trim()) return
    const dev = employee.development
    if (addingDevType === 'training') {
      const item: Training = {
        id: `tr-${Date.now()}`, courseName: trainingForm.courseName!, platform: trainingForm.platform ?? '',
        status: trainingForm.status ?? 'In Progress',
        completionDate: trainingForm.completionDate || undefined,
        hoursCompleted: trainingForm.hoursCompleted,
      }
      updateEmployee(employee.id, { development: { ...dev, training: [...dev.training, item] } })
    } else {
      updateEmployee(employee.id, {
        development: {
          ...dev,
          training: dev.training.map(t => t.id === editingDevId ? { ...t, ...trainingForm } : t)
        }
      })
    }
    cancelDev(); setTrainingForm({})
  }
  const deleteTraining = (id: string) => {
    updateEmployee(employee.id, {
      development: { ...employee.development, training: employee.development.training.filter(t => t.id !== id) }
    })
    setDeletingDevId(null)
  }

  const saveConf = () => {
    if (!confForm.eventName?.trim()) return
    const dev = employee.development
    if (addingDevType === 'conf') {
      const item: Conference = {
        id: `conf-${Date.now()}`, eventName: confForm.eventName!, date: confForm.date ?? '',
        role: confForm.role ?? 'Attendee', keyLearnings: confForm.keyLearnings ?? '',
      }
      updateEmployee(employee.id, { development: { ...dev, conferences: [...dev.conferences, item] } })
    } else {
      updateEmployee(employee.id, {
        development: {
          ...dev,
          conferences: dev.conferences.map(c => c.id === editingDevId ? { ...c, ...confForm } : c)
        }
      })
    }
    cancelDev(); setConfForm({})
  }
  const deleteConf = (id: string) => {
    updateEmployee(employee.id, {
      development: { ...employee.development, conferences: employee.development.conferences.filter(c => c.id !== id) }
    })
    setDeletingDevId(null)
  }

  const saveMentor = () => {
    if (!mentorForm.partnerName?.trim()) return
    const dev = employee.development
    if (addingDevType === 'mentor') {
      const item: MentoringRelation = {
        id: `mtr-${Date.now()}`, type: mentorForm.type ?? 'Mentee',
        partnerName: mentorForm.partnerName!, startDate: mentorForm.startDate ?? '',
        endDate: mentorForm.endDate || undefined, outcomes: mentorForm.outcomes ?? '',
        active: mentorForm.active ?? true,
      }
      updateEmployee(employee.id, { development: { ...dev, mentoring: [...dev.mentoring, item] } })
    } else {
      updateEmployee(employee.id, {
        development: {
          ...dev,
          mentoring: dev.mentoring.map(m => m.id === editingDevId ? { ...m, ...mentorForm } : m)
        }
      })
    }
    cancelDev(); setMentorForm({})
  }
  const deleteMentor = (id: string) => {
    updateEmployee(employee.id, {
      development: { ...employee.development, mentoring: employee.development.mentoring.filter(m => m.id !== id) }
    })
    setDeletingDevId(null)
  }

  // ── Accomplishments ────────────────────────────────────
  const accomplishments = employee.accomplishments ?? []
  const [editingAccomId, setEditingAccomId] = useState<string | null>(null)
  const [addingAccom, setAddingAccom] = useState(false)
  const [deletingAccomId, setDeletingAccomId] = useState<string | null>(null)
  const [accomForm, setAccomForm] = useState<Partial<Accomplishment>>({})

  const blankAccom = (): Partial<Accomplishment> => ({
    title: '', description: '', date: '', impact: '', category: 'Technical', recognizedBy: '',
  })
  const openEditAccom = (a: Accomplishment) => { setAccomForm({ ...a }); setEditingAccomId(a.id); setAddingAccom(false) }
  const openAddAccom = () => { setAccomForm(blankAccom()); setEditingAccomId(null); setAddingAccom(true) }
  const cancelAccom = () => { setEditingAccomId(null); setAddingAccom(false) }
  const saveAccom = () => {
    if (!accomForm.title?.trim()) return
    if (addingAccom) {
      const item: Accomplishment = {
        id: `accom-${Date.now()}`, title: accomForm.title!, description: accomForm.description ?? '',
        date: accomForm.date ?? '', impact: accomForm.impact ?? '',
        category: accomForm.category ?? 'Technical',
        recognizedBy: accomForm.recognizedBy || undefined,
      }
      updateEmployee(employee.id, { accomplishments: [...accomplishments, item] })
    } else {
      updateEmployee(employee.id, {
        accomplishments: accomplishments.map(a => a.id === editingAccomId ? { ...a, ...accomForm } : a)
      })
    }
    cancelAccom()
  }
  const deleteAccom = (id: string) => {
    updateEmployee(employee.id, { accomplishments: accomplishments.filter(a => a.id !== id) })
    setDeletingAccomId(null)
  }

  // ── Derived ────────────────────────────────────────────
  const goalStats = {
    total: employee.goals.length,
    completed: employee.goals.filter(g => g.status === 'Completed').length,
    inProgress: employee.goals.filter(g => g.status === 'In Progress').length,
    atRisk: employee.goals.filter(g => g.status === 'At Risk').length,
    avgProgress: Math.round(employee.goals.reduce((a, g) => a + g.progress, 0) / (employee.goals.length || 1)),
  }
  const TrendIcon = employee.performanceScore.trend === 'up' ? TrendingUp :
    employee.performanceScore.trend === 'down' ? TrendingDown : Minus
  const GoalStatusIcon = ({ status }: { status: string }) => {
    if (status === 'Completed') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
    if (status === 'At Risk') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
    if (status === 'In Progress') return <Clock className="w-3.5 h-3.5 text-blue-500" />
    return <Clock className="w-3.5 h-3.5 text-slate-400" />
  }
  // Manager's view, so the click cycles the reviewer rating, which supersedes self.
  const cycleSkillLevel = (skillId: string) => {
    const skill = employee.skills.find(s => s.skillId === skillId)
    if (!skill) return
    const current = skill.reviewerRating ?? skill.selfRating ?? 0
    const next = clampLevel((current + 1) % 6)
    updateSkillAssessment(employee.id, skillId, { reviewerRating: next })
  }

  // ── Forms ──────────────────────────────────────────────
  const GoalForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <Target className="w-4 h-4 text-brand-600" />{addingGoal ? 'New Goal' : 'Edit Goal'}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={LABEL}>Title *</label>
          <input value={goalForm.title ?? ''} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} className={INPUT} placeholder="Goal title" />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Description</label>
          <textarea rows={2} value={goalForm.description ?? ''} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} className={cn(INPUT, 'resize-none')} />
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select value={goalForm.status ?? 'Not Started'} onChange={e => setGoalForm(f => ({ ...f, status: e.target.value as GoalStatus }))} className={INPUT}>
            {GOAL_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Priority</label>
          <select value={goalForm.priority ?? 'Medium'} onChange={e => setGoalForm(f => ({ ...f, priority: e.target.value as GoalPriority }))} className={INPUT}>
            {GOAL_PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={goalForm.category ?? 'Quarterly'} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value as GoalCategory }))} className={INPUT}>
            {GOAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Due Date</label>
          <input type="date" value={goalForm.dueDate ?? ''} onChange={e => setGoalForm(f => ({ ...f, dueDate: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Progress: {goalForm.progress ?? 0}%</label>
          <input type="range" min={0} max={100} value={goalForm.progress ?? 0} onChange={e => setGoalForm(f => ({ ...f, progress: parseInt(e.target.value) }))} className="w-full accent-brand-600" />
        </div>
        <div>
          <label className={LABEL}>Strategic Alignment</label>
          <input value={goalForm.strategicAlignment ?? ''} onChange={e => setGoalForm(f => ({ ...f, strategicAlignment: e.target.value }))} className={INPUT} placeholder="e.g. AIOps Transformation" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!goalForm.title?.trim()}>Save Goal</Button>
      </div>
    </div>
  )

  const ProjectForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-600" />{addingProject ? 'New Contribution' : 'Edit Contribution'}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Project Name *</label>
          <input value={projectForm.projectName ?? ''} onChange={e => setProjectForm(f => ({ ...f, projectName: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Initiative</label>
          <input value={projectForm.initiative ?? ''} onChange={e => setProjectForm(f => ({ ...f, initiative: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input type="date" value={projectForm.date ?? ''} onChange={e => setProjectForm(f => ({ ...f, date: e.target.value }))} className={INPUT} />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Description</label>
          <textarea rows={2} value={projectForm.description ?? ''} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} className={cn(INPUT, 'resize-none')} />
        </div>
        <div>
          <label className={LABEL}>Business Impact</label>
          <textarea rows={2} value={projectForm.businessImpact ?? ''} onChange={e => setProjectForm(f => ({ ...f, businessImpact: e.target.value }))} className={cn(INPUT, 'resize-none')} />
        </div>
        <div>
          <label className={LABEL}>Technical Impact</label>
          <textarea rows={2} value={projectForm.technicalImpact ?? ''} onChange={e => setProjectForm(f => ({ ...f, technicalImpact: e.target.value }))} className={cn(INPUT, 'resize-none')} />
        </div>
        {(['leadership', 'collaboration', 'innovation'] as const).map(key => {
          const formKey = `${key}Score` as 'leadershipScore' | 'collaborationScore' | 'innovationScore'
          return (
            <div key={key}>
              <label className={LABEL}>{key.charAt(0).toUpperCase() + key.slice(1)}: {projectForm[formKey] ?? 3}/5</label>
              <input type="range" min={1} max={5} value={projectForm[formKey] ?? 3}
                onChange={e => setProjectForm(f => ({ ...f, [formKey]: parseInt(e.target.value) }))}
                className="w-full accent-brand-600" />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!projectForm.projectName?.trim()}>Save Contribution</Button>
      </div>
    </div>
  )

  const NoteForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-brand-600" />{addingNote ? 'New Note' : 'Edit Note'}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={LABEL}>Title *</label>
          <input value={noteForm.title ?? ''} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={noteForm.category ?? 'Coaching'} onChange={e => setNoteForm(f => ({ ...f, category: e.target.value as NoteCategory }))} className={INPUT}>
            {NOTE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Follow-Up Date <span className="font-normal text-slate-400">(optional)</span></label>
          <input type="date" value={noteForm.followUpDate ?? ''} onChange={e => setNoteForm(f => ({ ...f, followUpDate: e.target.value }))} className={INPUT} />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Content</label>
          <textarea rows={3} value={noteForm.content ?? ''} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} className={cn(INPUT, 'resize-none')} />
        </div>
        <div>
          <label className={LABEL}>Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
          <input value={noteTags} onChange={e => setNoteTags(e.target.value)} className={INPUT} placeholder="promotion, q2, follow-up" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="isPrivate" checked={noteForm.isPrivate ?? true}
            onChange={e => setNoteForm(f => ({ ...f, isPrivate: e.target.checked }))} className="accent-brand-600" />
          <label htmlFor="isPrivate" className="text-xs text-slate-700 cursor-pointer flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />Private note
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!noteForm.title?.trim()}>Save Note</Button>
      </div>
    </div>
  )

  const noteCategoryColor = (category: string) => {
    if (category === 'Concerns') return 'bg-red-100 text-red-700'
    if (category === 'Recognition') return 'bg-green-100 text-green-700'
    if (category === 'Succession Planning') return 'bg-purple-100 text-purple-700'
    if (category === 'Career Aspirations') return 'bg-blue-100 text-blue-700'
    if (category === 'Leadership Potential') return 'bg-amber-100 text-amber-700'
    if (category === 'Coaching') return 'bg-orange-100 text-orange-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={employee.name}
        subtitle={`${employee.title} · ${employee.level} · ${employee.department}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => router.back()}>Back</Button>
            <Button size="sm" variant="secondary" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setShowEditModal(true)}>Edit Profile</Button>
            <Button size="sm" variant="secondary" icon={<Share2 className="w-3.5 h-3.5" />}
              onClick={() => router.push(`/employees/${employee.id}/view`)}>Share View</Button>
            <Button size="sm" icon={<Lightbulb className="w-3.5 h-3.5" />}>AI Summary</Button>
          </div>
        }
      />

      <div className="flex-1 p-6">
        {/* Profile header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-start gap-4 flex-1">
              <Avatar name={employee.name} size="xl" />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{employee.name}</h2>
                    <p className="text-slate-600 font-medium">{employee.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <span className="font-medium text-brand-600">{employee.level}</span>
                      <span className="text-slate-300">·</span>
                      <Building2 className="w-3.5 h-3.5" />{employee.department}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {employee.isHighPotential && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">High Potential</span>
                      </div>
                    )}
                    {employee.needsCoaching && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-semibold text-red-700">Coaching Active</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="w-3 h-3" />{employee.email}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="w-3 h-3" />{employee.location}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar className="w-3 h-3" />Hired {formatDate(employee.hireDate)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Building2 className="w-3 h-3" />Manager: {employee.managerName}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {employee.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{tag}</span>
                  ))}
                </div>
                <div className="mt-3">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', promotionReadinessColor(employee.promotionReadiness))}>
                    {employee.promotionReadiness === 'Ready Now' && <Flame className="inline w-3 h-3 mr-1" />}
                    Promotion: {employee.promotionReadiness}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 bg-slate-50 rounded-xl p-5 border border-slate-100">
              <ScoreRing score={employee.performanceScore.overall} size="lg" label="Overall" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-center">
                {[
                  { label: 'Goals', value: employee.performanceScore.goalAchievement },
                  { label: 'Projects', value: employee.performanceScore.projectContributions },
                  { label: 'Growth', value: employee.performanceScore.growthScore },
                  { label: 'Leadership', value: employee.performanceScore.leadershipReadiness },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className={cn('text-lg font-bold', scoreToColor(value))}>{value}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <TrendIcon className={cn('w-4 h-4',
                  employee.performanceScore.trend === 'up' ? 'text-green-500' :
                  employee.performanceScore.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                )} />
                <span className="text-slate-500">
                  {employee.performanceScore.trend === 'up' ? 'Trending up' :
                   employee.performanceScore.trend === 'down' ? 'Trending down' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-5 -mt-2 bg-white px-4 rounded-t-xl shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === tab ? 'border-brand-600 text-brand-600' :
                'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}>
              {tab}
              {tab === 'Notes' && employee.notes.length > 0 && (
                <span className="ml-1.5 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{employee.notes.length}</span>
              )}
              {tab === 'Goals' && goalStats.atRisk > 0 && (
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{goalStats.atRisk} at risk</span>
              )}
              {tab === 'Accomplishments' && accomplishments.length > 0 && (
                <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{accomplishments.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">About</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{employee.bio}</p>
                <div className="mt-3 p-3 bg-brand-50 border border-brand-100 rounded-lg">
                  <p className="text-xs font-semibold text-brand-700 mb-1">Career Aspirations</p>
                  <p className="text-xs text-brand-600 leading-relaxed">{employee.careerAspirations}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">Goals Summary</h3>
                  <button onClick={() => setActiveTab('Goals')} className="text-xs text-brand-600 hover:underline">View all →</button>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total', value: goalStats.total, color: 'text-slate-800' },
                    { label: 'Done', value: goalStats.completed, color: 'text-green-600' },
                    { label: 'Active', value: goalStats.inProgress, color: 'text-blue-600' },
                    { label: 'At Risk', value: goalStats.atRisk, color: 'text-amber-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className={cn('text-xl font-bold', color)}>{value}</p>
                      <p className="text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
                {employee.goals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 py-2 border-t border-slate-100">
                    <GoalStatusIcon status={goal.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{goal.title}</p>
                      <Progress value={goal.progress} size="sm" color="auto" className="mt-1" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{goal.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">Skills Profile</h3>
                  <button onClick={() => setActiveTab('Skills')} className="text-xs text-brand-600 hover:underline">Details →</button>
                </div>
                <SkillsRadar employee={employee} catalog={catalog} />
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {skillRows
                    .filter(r => r.final !== undefined)
                    .sort((a, b) => b.final! - a.final!)
                    .slice(0, 4)
                    .map(r => (
                      <div key={r.skillId} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-600 truncate" title={r.definition.name}>
                          {r.definition.name}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0', skillLevelColor(r.final))}>
                          {r.final}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent Certifications</h3>
                {employee.development.certifications.length > 0 ? (
                  <div className="space-y-2">
                    {employee.development.certifications.map(cert => (
                      <div key={cert.id} className="p-2.5 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Award className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-slate-800">{cert.name}</p>
                            <p className="text-[10px] text-slate-500">{cert.provider} · {formatDate(cert.dateEarned)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-400">No certifications yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── GOALS ── */}
        {activeTab === 'Goals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{employee.goals.length} goals · Avg {goalStats.avgProgress}% progress</p>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddGoal}>Add Goal</Button>
            </div>
            {addingGoal && <GoalForm onSave={saveGoal} onCancel={cancelGoal} />}
            {employee.goals.map(goal => (
              editingGoalId === goal.id
                ? <GoalForm key={goal.id} onSave={saveGoal} onCancel={cancelGoal} />
                : (
                  <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-card-hover transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <GoalStatusIcon status={goal.status} />
                          <h4 className="text-sm font-semibold text-slate-900">{goal.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{goal.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <EditBtn onClick={() => openEditGoal(goal)} />
                          <DeleteConfirm
                            id={goal.id} deletingId={deletingGoalId}
                            onArm={() => setDeletingGoalId(goal.id)}
                            onConfirm={() => deleteGoal(goal.id)}
                            onCancel={() => setDeletingGoalId(null)}
                          />
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', goalStatusColor(goal.status))}>{goal.status}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', goalPriorityColor(goal.priority))}>{goal.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-xs text-slate-500">Due {formatDate(goal.dueDate)}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{goal.category}</span>
                      {goal.strategicAlignment && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />{goal.strategicAlignment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={goal.progress} color="auto" className="flex-1" size="md" />
                      <span className={cn('text-xs font-bold min-w-[32px] text-right', scoreToColor(goal.progress))}>{goal.progress}%</span>
                    </div>
                  </div>
                )
            ))}
            {employee.goals.length === 0 && !addingGoal && (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No goals yet</p>
                <Button size="sm" className="mt-4" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddGoal}>Add First Goal</Button>
              </div>
            )}
          </div>
        )}

        {/* ── SKILLS ── */}
        {activeTab === 'Skills' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Capability by domain</h3>
                <SkillsRadar employee={employee} catalog={catalog} />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Assessment summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Assessed', `${skillSummary.assessed}/${skillSummary.catalogSize}`],
                    ['Avg level', `${skillSummary.avgLevel.toFixed(1)}/5`],
                    ['Breadth (2+)', String(skillSummary.breadth)],
                    ['Depth (4+)', String(skillSummary.depth)],
                    ['At target', `${Math.round(skillSummary.targetAttainment * 100)}%`],
                    ['High gaps', String(skillSummary.highGaps)],
                  ] as const).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>

                {skillSummary.roleFit && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-medium text-slate-700">
                      {skillSummary.roleFit.profile.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-12">Breadth</span>
                      <Progress
                        value={Math.min(100, (skillSummary.roleFit.breadth / skillSummary.roleFit.breadthTarget) * 100)}
                        color="auto" showLabel
                        label={`${skillSummary.roleFit.breadth}/${skillSummary.roleFit.breadthTarget}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-12">Depth</span>
                      <Progress
                        value={Math.min(100, (skillSummary.roleFit.depth / skillSummary.roleFit.depthTarget) * 100)}
                        color="auto" showLabel
                        label={`${skillSummary.roleFit.depth}/${skillSummary.roleFit.depthTarget}`}
                      />
                    </div>
                    {skillSummary.roleFit.depthAreasMissing.length > 0 && (
                      <p className="text-[11px] text-amber-600">
                        {skillSummary.roleFit.depthAreasMissing.length} role depth area
                        {skillSummary.roleFit.depthAreasMissing.length === 1 ? '' : 's'} still below level 4
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-3">
                  Weighted capability index{' '}
                  <strong className="text-slate-600">
                    {Math.round(skillSummary.capabilityIndex * 100)}%
                  </strong>{' '}
                  of what the role requires.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Rated skills</h3>
                  <p className="text-xs text-slate-400">
                    Click a level badge to cycle the reviewer rating
                  </p>
                </div>
                <Link href="/skills" className="text-xs text-brand-600 hover:underline">
                  Full assessment →
                </Link>
              </div>

              <div className="space-y-3">
                {skillRows.filter(r => r.final !== undefined).map(r => (
                  <div key={r.skillId} className="flex items-center gap-4">
                    <div className="w-44 flex-shrink-0 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate" title={r.definition.observableCapability}>
                        {r.definition.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {r.definition.domain}
                        {r.definition.critical && <span className="text-red-500"> · critical</span>}
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              title={level <= r.target ? `Target is ${r.target}` : undefined}
                              className={cn(
                                'h-2 rounded-sm flex-1 transition-all',
                                level <= (r.final ?? 0) ? 'bg-brand-500'
                                  : level <= r.target ? 'bg-brand-100' : 'bg-slate-100',
                              )}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => cycleSkillLevel(r.skillId)}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity',
                            skillLevelColor(r.final),
                          )}
                          title="Click to cycle the reviewer rating"
                        >
                          {r.final} {proficiencyLabel(r.final)}
                        </button>
                      </div>
                      {r.evidence && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate" title={r.evidence}>
                          Evidence: {r.evidence}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 w-16">
                      <p className="text-[10px] text-slate-400">Target</p>
                      <span className="text-xs font-semibold text-slate-700">{r.target}</span>
                    </div>

                    <div className="flex-shrink-0 w-20 text-center">
                      {r.priority && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', skillPriorityColor(r.priority))}>
                          {r.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {skillSummary.assessed === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No skills rated yet. Use the{' '}
                    <Link href="/skills" className="text-brand-600 hover:underline">Skills Matrix</Link>{' '}
                    to assess against the catalog.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECTS ── */}
        {activeTab === 'Projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{employee.projectContributions.length} project contributions</p>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddProject}>Add Contribution</Button>
            </div>
            {addingProject && <ProjectForm onSave={saveProject} onCancel={cancelProject} />}
            {employee.projectContributions.map(contribution => (
              editingProjectId === contribution.id
                ? <ProjectForm key={contribution.id} onSave={saveProject} onCancel={cancelProject} />
                : (
                  <div key={contribution.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{contribution.projectName}</h4>
                        <p className="text-xs text-slate-500">{contribution.initiative}{contribution.initiative && ' · '}{formatDate(contribution.date)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {contribution.evidenceLinks.map((link, i) => (
                          <a key={i} href={link} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                        <EditBtn onClick={() => openEditProject(contribution)} />
                        <DeleteConfirm
                          id={contribution.id} deletingId={deletingProjectId}
                          onArm={() => setDeletingProjectId(contribution.id)}
                          onConfirm={() => deleteProject(contribution.id)}
                          onCancel={() => setDeletingProjectId(null)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">{contribution.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-[10px] font-semibold text-green-700 mb-1">BUSINESS IMPACT</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{contribution.businessImpact}</p>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-[10px] font-semibold text-blue-700 mb-1">TECHNICAL IMPACT</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{contribution.technicalImpact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-500">
                      {[
                        { label: 'Leadership', value: contribution.leadershipScore },
                        { label: 'Collaboration', value: contribution.collaborationScore },
                        { label: 'Innovation', value: contribution.innovationScore },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span>{label}:</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={cn('w-2 h-2 rounded-full', i <= value ? 'bg-brand-500' : 'bg-slate-200')} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            ))}
            {employee.projectContributions.length === 0 && !addingProject && (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No project contributions yet</p>
                <Button size="sm" className="mt-4" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddProject}>Add First Contribution</Button>
              </div>
            )}
          </div>
        )}

        {/* ── DEVELOPMENT ── */}
        {activeTab === 'Development' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Certifications */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Certifications</h3>
                <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => { setCertForm({}); setAddingDevType('cert'); setEditingDevId(null) }}>Add</Button>
              </div>
              {addingDevType === 'cert' && (
                <div className="border-2 border-brand-200 rounded-xl p-4 mb-3 space-y-2">
                  <div><label className={LABEL}>Name *</label><input value={certForm.name ?? ''} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>Provider</label><input value={certForm.provider ?? ''} onChange={e => setCertForm(f => ({ ...f, provider: e.target.value }))} className={INPUT} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={LABEL}>Date Earned</label><input type="date" value={certForm.dateEarned ?? ''} onChange={e => setCertForm(f => ({ ...f, dateEarned: e.target.value }))} className={INPUT} /></div>
                    <div><label className={LABEL}>Expiration</label><input type="date" value={certForm.expirationDate ?? ''} onChange={e => setCertForm(f => ({ ...f, expirationDate: e.target.value }))} className={INPUT} /></div>
                  </div>
                  <div><label className={LABEL}>Credential ID</label><input value={certForm.credentialId ?? ''} onChange={e => setCertForm(f => ({ ...f, credentialId: e.target.value }))} className={INPUT} /></div>
                  <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveCert} disabled={!certForm.name?.trim()}>Save</Button></div>
                </div>
              )}
              <div className="space-y-3">
                {employee.development.certifications.map(cert => (
                  editingDevId === cert.id
                    ? (
                      <div key={cert.id} className="border-2 border-brand-200 rounded-xl p-4 space-y-2">
                        <div><label className={LABEL}>Name *</label><input value={certForm.name ?? ''} onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} className={INPUT} /></div>
                        <div><label className={LABEL}>Provider</label><input value={certForm.provider ?? ''} onChange={e => setCertForm(f => ({ ...f, provider: e.target.value }))} className={INPUT} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className={LABEL}>Date Earned</label><input type="date" value={certForm.dateEarned ?? ''} onChange={e => setCertForm(f => ({ ...f, dateEarned: e.target.value }))} className={INPUT} /></div>
                          <div><label className={LABEL}>Expiration</label><input type="date" value={certForm.expirationDate ?? ''} onChange={e => setCertForm(f => ({ ...f, expirationDate: e.target.value }))} className={INPUT} /></div>
                        </div>
                        <div><label className={LABEL}>Credential ID</label><input value={certForm.credentialId ?? ''} onChange={e => setCertForm(f => ({ ...f, credentialId: e.target.value }))} className={INPUT} /></div>
                        <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveCert} disabled={!certForm.name?.trim()}>Save</Button></div>
                      </div>
                    ) : (
                      <div key={cert.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{cert.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{cert.provider}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                              <span>Earned {formatDate(cert.dateEarned)}</span>
                              {cert.expirationDate && <span>Expires {formatDate(cert.expirationDate)}</span>}
                              {cert.credentialId && <span className="font-mono">{cert.credentialId}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <EditBtn onClick={() => { setCertForm({ ...cert }); setEditingDevId(cert.id); setAddingDevType(null) }} />
                            <DeleteConfirm id={cert.id} deletingId={deletingDevId} onArm={() => setDeletingDevId(cert.id)} onConfirm={() => deleteCert(cert.id)} onCancel={() => setDeletingDevId(null)} />
                          </div>
                        </div>
                      </div>
                    )
                ))}
                {employee.development.certifications.length === 0 && addingDevType !== 'cert' && <p className="text-xs text-slate-400 text-center py-4">No certifications recorded</p>}
              </div>
            </div>

            {/* Training */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" />Training & Courses</h3>
                <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => { setTrainingForm({}); setAddingDevType('training'); setEditingDevId(null) }}>Add</Button>
              </div>
              {addingDevType === 'training' && (
                <div className="border-2 border-brand-200 rounded-xl p-4 mb-3 space-y-2">
                  <div><label className={LABEL}>Course Name *</label><input value={trainingForm.courseName ?? ''} onChange={e => setTrainingForm(f => ({ ...f, courseName: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>Platform</label><input value={trainingForm.platform ?? ''} onChange={e => setTrainingForm(f => ({ ...f, platform: e.target.value }))} className={INPUT} placeholder="Pluralsight, Udemy, Coursera…" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={LABEL}>Status</label>
                      <select value={trainingForm.status ?? 'In Progress'} onChange={e => setTrainingForm(f => ({ ...f, status: e.target.value as Training['status'] }))} className={INPUT}>
                        {['In Progress', 'Completed', 'Planned'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className={LABEL}>Hours</label><input type="number" value={trainingForm.hoursCompleted ?? ''} onChange={e => setTrainingForm(f => ({ ...f, hoursCompleted: parseInt(e.target.value) || undefined }))} className={INPUT} /></div>
                  </div>
                  <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveTraining} disabled={!trainingForm.courseName?.trim()}>Save</Button></div>
                </div>
              )}
              <div className="space-y-3">
                {employee.development.training.map(tr => (
                  editingDevId === tr.id
                    ? (
                      <div key={tr.id} className="border-2 border-brand-200 rounded-xl p-4 space-y-2">
                        <div><label className={LABEL}>Course Name *</label><input value={trainingForm.courseName ?? ''} onChange={e => setTrainingForm(f => ({ ...f, courseName: e.target.value }))} className={INPUT} /></div>
                        <div><label className={LABEL}>Platform</label><input value={trainingForm.platform ?? ''} onChange={e => setTrainingForm(f => ({ ...f, platform: e.target.value }))} className={INPUT} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={LABEL}>Status</label>
                            <select value={trainingForm.status ?? 'In Progress'} onChange={e => setTrainingForm(f => ({ ...f, status: e.target.value as Training['status'] }))} className={INPUT}>
                              {['In Progress', 'Completed', 'Planned'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div><label className={LABEL}>Hours</label><input type="number" value={trainingForm.hoursCompleted ?? ''} onChange={e => setTrainingForm(f => ({ ...f, hoursCompleted: parseInt(e.target.value) || undefined }))} className={INPUT} /></div>
                        </div>
                        <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveTraining} disabled={!trainingForm.courseName?.trim()}>Save</Button></div>
                      </div>
                    ) : (
                      <div key={tr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{tr.courseName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{tr.platform}</p>
                            {tr.hoursCompleted && <p className="text-[10px] text-slate-400 mt-1">{tr.hoursCompleted}h completed</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              tr.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              tr.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                            )}>{tr.status}</span>
                            <EditBtn onClick={() => { setTrainingForm({ ...tr }); setEditingDevId(tr.id); setAddingDevType(null) }} />
                            <DeleteConfirm id={tr.id} deletingId={deletingDevId} onArm={() => setDeletingDevId(tr.id)} onConfirm={() => deleteTraining(tr.id)} onCancel={() => setDeletingDevId(null)} />
                          </div>
                        </div>
                      </div>
                    )
                ))}
                {employee.development.training.length === 0 && addingDevType !== 'training' && <p className="text-xs text-slate-400 text-center py-4">No training recorded</p>}
              </div>
            </div>

            {/* Conferences */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500" />Conferences & Events</h3>
                <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => { setConfForm({}); setAddingDevType('conf'); setEditingDevId(null) }}>Add</Button>
              </div>
              {addingDevType === 'conf' && (
                <div className="border-2 border-brand-200 rounded-xl p-4 mb-3 space-y-2">
                  <div><label className={LABEL}>Event Name *</label><input value={confForm.eventName ?? ''} onChange={e => setConfForm(f => ({ ...f, eventName: e.target.value }))} className={INPUT} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={LABEL}>Date</label><input type="date" value={confForm.date ?? ''} onChange={e => setConfForm(f => ({ ...f, date: e.target.value }))} className={INPUT} /></div>
                    <div>
                      <label className={LABEL}>Role</label>
                      <select value={confForm.role ?? 'Attendee'} onChange={e => setConfForm(f => ({ ...f, role: e.target.value as Conference['role'] }))} className={INPUT}>
                        {['Attendee', 'Speaker', 'Panelist'].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className={LABEL}>Key Learnings</label><textarea rows={2} value={confForm.keyLearnings ?? ''} onChange={e => setConfForm(f => ({ ...f, keyLearnings: e.target.value }))} className={cn(INPUT, 'resize-none')} /></div>
                  <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveConf} disabled={!confForm.eventName?.trim()}>Save</Button></div>
                </div>
              )}
              <div className="space-y-3">
                {employee.development.conferences.map(conf => (
                  editingDevId === conf.id
                    ? (
                      <div key={conf.id} className="border-2 border-brand-200 rounded-xl p-4 space-y-2">
                        <div><label className={LABEL}>Event Name *</label><input value={confForm.eventName ?? ''} onChange={e => setConfForm(f => ({ ...f, eventName: e.target.value }))} className={INPUT} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className={LABEL}>Date</label><input type="date" value={confForm.date ?? ''} onChange={e => setConfForm(f => ({ ...f, date: e.target.value }))} className={INPUT} /></div>
                          <div>
                            <label className={LABEL}>Role</label>
                            <select value={confForm.role ?? 'Attendee'} onChange={e => setConfForm(f => ({ ...f, role: e.target.value as Conference['role'] }))} className={INPUT}>
                              {['Attendee', 'Speaker', 'Panelist'].map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div><label className={LABEL}>Key Learnings</label><textarea rows={2} value={confForm.keyLearnings ?? ''} onChange={e => setConfForm(f => ({ ...f, keyLearnings: e.target.value }))} className={cn(INPUT, 'resize-none')} /></div>
                        <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveConf} disabled={!confForm.eventName?.trim()}>Save</Button></div>
                      </div>
                    ) : (
                      <div key={conf.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{conf.eventName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(conf.date)}</p>
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{conf.keyLearnings}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">{conf.role}</span>
                            <EditBtn onClick={() => { setConfForm({ ...conf }); setEditingDevId(conf.id); setAddingDevType(null) }} />
                            <DeleteConfirm id={conf.id} deletingId={deletingDevId} onArm={() => setDeletingDevId(conf.id)} onConfirm={() => deleteConf(conf.id)} onCancel={() => setDeletingDevId(null)} />
                          </div>
                        </div>
                      </div>
                    )
                ))}
                {employee.development.conferences.length === 0 && addingDevType !== 'conf' && <p className="text-xs text-slate-400 text-center py-4">No conferences recorded</p>}
              </div>
            </div>

            {/* Mentoring */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-teal-500" />Mentoring</h3>
                <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => { setMentorForm({ active: true }); setAddingDevType('mentor'); setEditingDevId(null) }}>Add</Button>
              </div>
              {addingDevType === 'mentor' && (
                <div className="border-2 border-brand-200 rounded-xl p-4 mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={LABEL}>Type</label>
                      <select value={mentorForm.type ?? 'Mentee'} onChange={e => setMentorForm(f => ({ ...f, type: e.target.value as MentoringRelation['type'] }))} className={INPUT}>
                        <option>Mentor</option><option>Mentee</option>
                      </select>
                    </div>
                    <div><label className={LABEL}>Partner Name *</label><input value={mentorForm.partnerName ?? ''} onChange={e => setMentorForm(f => ({ ...f, partnerName: e.target.value }))} className={INPUT} /></div>
                    <div><label className={LABEL}>Start Date</label><input type="date" value={mentorForm.startDate ?? ''} onChange={e => setMentorForm(f => ({ ...f, startDate: e.target.value }))} className={INPUT} /></div>
                    <div><label className={LABEL}>End Date</label><input type="date" value={mentorForm.endDate ?? ''} onChange={e => setMentorForm(f => ({ ...f, endDate: e.target.value }))} className={INPUT} /></div>
                  </div>
                  <div><label className={LABEL}>Outcomes / Focus</label><textarea rows={2} value={mentorForm.outcomes ?? ''} onChange={e => setMentorForm(f => ({ ...f, outcomes: e.target.value }))} className={cn(INPUT, 'resize-none')} /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="mentorActive" checked={mentorForm.active ?? true} onChange={e => setMentorForm(f => ({ ...f, active: e.target.checked }))} className="accent-brand-600" />
                    <label htmlFor="mentorActive" className="text-xs text-slate-700 cursor-pointer">Active relationship</label>
                  </div>
                  <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveMentor} disabled={!mentorForm.partnerName?.trim()}>Save</Button></div>
                </div>
              )}
              <div className="space-y-3">
                {employee.development.mentoring.map(m => (
                  editingDevId === m.id
                    ? (
                      <div key={m.id} className="border-2 border-brand-200 rounded-xl p-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={LABEL}>Type</label>
                            <select value={mentorForm.type ?? 'Mentee'} onChange={e => setMentorForm(f => ({ ...f, type: e.target.value as MentoringRelation['type'] }))} className={INPUT}>
                              <option>Mentor</option><option>Mentee</option>
                            </select>
                          </div>
                          <div><label className={LABEL}>Partner Name *</label><input value={mentorForm.partnerName ?? ''} onChange={e => setMentorForm(f => ({ ...f, partnerName: e.target.value }))} className={INPUT} /></div>
                          <div><label className={LABEL}>Start Date</label><input type="date" value={mentorForm.startDate ?? ''} onChange={e => setMentorForm(f => ({ ...f, startDate: e.target.value }))} className={INPUT} /></div>
                          <div><label className={LABEL}>End Date</label><input type="date" value={mentorForm.endDate ?? ''} onChange={e => setMentorForm(f => ({ ...f, endDate: e.target.value }))} className={INPUT} /></div>
                        </div>
                        <div><label className={LABEL}>Outcomes / Focus</label><textarea rows={2} value={mentorForm.outcomes ?? ''} onChange={e => setMentorForm(f => ({ ...f, outcomes: e.target.value }))} className={cn(INPUT, 'resize-none')} /></div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="editMentorActive" checked={mentorForm.active ?? true} onChange={e => setMentorForm(f => ({ ...f, active: e.target.checked }))} className="accent-brand-600" />
                          <label htmlFor="editMentorActive" className="text-xs text-slate-700 cursor-pointer">Active relationship</label>
                        </div>
                        <div className="flex gap-2 justify-end"><Button variant="secondary" size="sm" onClick={cancelDev}>Cancel</Button><Button size="sm" onClick={saveMentor} disabled={!mentorForm.partnerName?.trim()}>Save</Button></div>
                      </div>
                    ) : (
                      <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{m.partnerName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Since {formatDate(m.startDate)}{m.active ? ' · Active' : m.endDate ? ` · Ended ${formatDate(m.endDate)}` : ''}
                            </p>
                            {m.outcomes && <p className="text-xs text-slate-600 mt-1.5">{m.outcomes}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', m.type === 'Mentor' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700')}>{m.type}</span>
                            <EditBtn onClick={() => { setMentorForm({ ...m }); setEditingDevId(m.id); setAddingDevType(null) }} />
                            <DeleteConfirm id={m.id} deletingId={deletingDevId} onArm={() => setDeletingDevId(m.id)} onConfirm={() => deleteMentor(m.id)} onCancel={() => setDeletingDevId(null)} />
                          </div>
                        </div>
                      </div>
                    )
                ))}
                {employee.development.mentoring.length === 0 && addingDevType !== 'mentor' && <p className="text-xs text-slate-400 text-center py-4">No mentoring relationships</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ACCOMPLISHMENTS ── */}
        {activeTab === 'Accomplishments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{accomplishments.length} accomplishments recorded</p>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddAccom}>Add Accomplishment</Button>
            </div>
            {addingAccom && (
              <AccomForm form={accomForm} setForm={setAccomForm} onSave={saveAccom} onCancel={cancelAccom} isNew />
            )}
            {[...accomplishments].reverse().map(accom => (
              editingAccomId === accom.id
                ? <AccomForm key={accom.id} form={accomForm} setForm={setAccomForm} onSave={saveAccom} onCancel={cancelAccom} />
                : (
                  <div key={accom.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-purple-500" />
                        <h4 className="text-sm font-semibold text-slate-900">{accom.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ACCOM_COLORS[accom.category])}>{accom.category}</span>
                        {accom.date && <span className="text-xs text-slate-400">{formatDate(accom.date)}</span>}
                        <EditBtn onClick={() => openEditAccom(accom)} />
                        <DeleteConfirm id={accom.id} deletingId={deletingAccomId} onArm={() => setDeletingAccomId(accom.id)} onConfirm={() => deleteAccom(accom.id)} onCancel={() => setDeletingAccomId(null)} />
                      </div>
                    </div>
                    {accom.description && <p className="text-xs text-slate-600 leading-relaxed mb-2">{accom.description}</p>}
                    {accom.impact && (
                      <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg mb-2">
                        <p className="text-[10px] font-semibold text-green-700 mb-0.5">IMPACT</p>
                        <p className="text-xs text-slate-700">{accom.impact}</p>
                      </div>
                    )}
                    {accom.recognizedBy && <p className="text-xs text-slate-400">Recognized by: <span className="text-slate-600">{accom.recognizedBy}</span></p>}
                  </div>
                )
            ))}
            {accomplishments.length === 0 && !addingAccom && (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No accomplishments recorded yet</p>
                <p className="text-sm text-slate-400 mt-1">Add wins, milestones, and notable contributions</p>
                <Button size="sm" className="mt-4" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddAccom}>Add First Accomplishment</Button>
              </div>
            )}
          </div>
        )}

        {/* ── NOTES ── */}
        {activeTab === 'Notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-500">Director notes — private by default</p>
              </div>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddNote}>Add Note</Button>
            </div>
            {addingNote && <NoteForm onSave={saveNote} onCancel={cancelNote} />}
            {employee.notes.map(note => (
              editingNoteId === note.id
                ? <NoteForm key={note.id} onSave={saveNote} onCancel={cancelNote} />
                : (
                  <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', noteCategoryColor(note.category))}>{note.category}</span>
                          {note.isPrivate && <Lock className="w-3 h-3 text-slate-300" />}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">{note.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-[10px] text-slate-400">
                          <p>{formatDate(note.createdAt)}</p>
                          <p className="mt-0.5">{note.authorName}</p>
                        </div>
                        <EditBtn onClick={() => openEditNote(note)} />
                        <DeleteConfirm id={note.id} deletingId={deletingNoteId} onArm={() => setDeletingNoteId(note.id)} onConfirm={() => deleteNote(note.id)} onCancel={() => setDeletingNoteId(null)} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{note.content}</p>
                    {note.followUpDate && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-700">Follow-up: {formatDate(note.followUpDate)}</span>
                      </div>
                    )}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
            ))}
            {employee.notes.length === 0 && !addingNote && (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No notes yet</p>
                <p className="text-sm text-slate-400 mt-1">Add coaching notes, recognition, or observations</p>
                <Button size="sm" className="mt-4" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddNote}>Add First Note</Button>
              </div>
            )}
          </div>
        )}

        {/* ── PERFORMANCE ── */}
        {activeTab === 'Performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Goal Achievement', value: employee.performanceScore.goalAchievement, weight: '30%' },
                  { label: 'Project Contributions', value: employee.performanceScore.projectContributions, weight: '25%' },
                  { label: 'Professional Development', value: employee.performanceScore.professionalDevelopment, weight: '15%' },
                  { label: 'Leadership Behaviors', value: employee.performanceScore.leadershipBehaviors, weight: '15%' },
                  { label: 'Collaboration', value: employee.performanceScore.collaboration, weight: '10%' },
                  { label: 'Innovation', value: employee.performanceScore.innovation, weight: '5%' },
                ].map(({ label, value, weight }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{weight}</span>
                        <span className={cn('font-bold w-8 text-right', scoreToColor(value))}>{value}</span>
                      </div>
                    </div>
                    <Progress value={value} color="auto" size="md" />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Overall Score</span>
                <span className={cn('text-xl font-bold', scoreToColor(employee.performanceScore.overall))}>
                  {employee.performanceScore.overall}
                </span>
              </div>
            </div>
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Leadership & Promotion</h3>
                <div className="flex items-center justify-around">
                  <ScoreRing score={employee.performanceScore.growthScore} size="md" label="Growth" />
                  <ScoreRing score={employee.performanceScore.leadershipReadiness} size="md" label="Leadership" />
                  <ScoreRing score={employee.performanceScore.promotionReadiness} size="md" label="Promotion" />
                </div>
                <div className="mt-4 p-3 rounded-lg border text-xs text-center font-semibold" style={{
                  background: employee.promotionReadiness === 'Ready Now' ? '#f0fdf4' : employee.promotionReadiness === 'Ready in 6 Months' ? '#eff6ff' : employee.promotionReadiness === 'Ready in 12 Months' ? '#fffbeb' : '#fff1f2',
                  borderColor: employee.promotionReadiness === 'Ready Now' ? '#bbf7d0' : employee.promotionReadiness === 'Ready in 6 Months' ? '#bfdbfe' : employee.promotionReadiness === 'Ready in 12 Months' ? '#fde68a' : '#fecdd3',
                  color: employee.promotionReadiness === 'Ready Now' ? '#15803d' : employee.promotionReadiness === 'Ready in 6 Months' ? '#1d4ed8' : employee.promotionReadiness === 'Ready in 12 Months' ? '#b45309' : '#be123c',
                }}>
                  {employee.promotionReadiness === 'Ready Now' && <Flame className="inline w-3.5 h-3.5 mr-1" />}
                  {employee.promotionReadiness}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Contribution Analysis</h3>
                <ContributionRadar contributions={employee.projectContributions} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showEditModal && <EmployeeFormModal employee={employee} onClose={() => setShowEditModal(false)} />}
    </div>
  )
}

// Pulled out to avoid re-declaring inside the component on every render
function AccomForm({ form, setForm, onSave, onCancel, isNew }: {
  form: Partial<Accomplishment>
  setForm: (fn: (f: Partial<Accomplishment>) => Partial<Accomplishment>) => void
  onSave: () => void; onCancel: () => void; isNew?: boolean
}) {
  const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
  const LABEL = 'text-xs font-medium text-slate-700 mb-1 block'
  const ACCOMPLISHMENT_CATEGORIES = ['Technical', 'Leadership', 'Collaboration', 'Innovation', 'Other'] as const
  return (
    <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-brand-600" />{isNew ? 'New Accomplishment' : 'Edit Accomplishment'}
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2"><label className={LABEL}>Title *</label><input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={INPUT} /></div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={form.category ?? 'Technical'} onChange={e => setForm(f => ({ ...f, category: e.target.value as Accomplishment['category'] }))} className={INPUT}>
            {ACCOMPLISHMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className={LABEL}>Date</label><input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT} /></div>
        <div className="col-span-2"><label className={LABEL}>Description</label><textarea rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={cn(INPUT, 'resize-none')} /></div>
        <div className="col-span-2"><label className={LABEL}>Impact</label><input value={form.impact ?? ''} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} className={INPUT} /></div>
        <div className="col-span-2"><label className={LABEL}>Recognized By <span className="font-normal text-slate-400">(optional)</span></label><input value={form.recognizedBy ?? ''} onChange={e => setForm(f => ({ ...f, recognizedBy: e.target.value }))} className={INPUT} /></div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!form.title?.trim()}>Save Accomplishment</Button>
      </div>
    </div>
  )
}

