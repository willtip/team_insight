'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Progress from '@/components/ui/Progress'
import { useEmployees } from '@/lib/employee-store'
import { cn, formatDate, skillLevelColor, goalStatusColor } from '@/lib/utils'
import {
  MapPin, Calendar, Building2, Target, Award, BookOpen,
  CheckCircle, Clock, AlertTriangle, TrendingUp, Star,
  Trophy, Zap, ChevronRight, MessageSquare
} from 'lucide-react'

const TABS = ['Overview', 'Goals', 'Skills', 'Accomplishments', 'Development'] as const
type Tab = typeof TABS[number]

const ACCOM_COLORS: Record<string, string> = {
  Technical: 'bg-blue-100 text-blue-700',
  Leadership: 'bg-amber-100 text-amber-700',
  Collaboration: 'bg-teal-100 text-teal-700',
  Innovation: 'bg-purple-100 text-purple-700',
  Other: 'bg-slate-100 text-slate-600',
}

export default function EmployeeViewPage({ params }: { params: { id: string } }) {
  const { employees } = useEmployees()
  const employee = employees.find(e => e.id === params.id)
  if (!employee) return notFound()

  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const accomplishments = employee.accomplishments ?? []
  const publicNotes = employee.notes.filter(n => !n.isPrivate)
  const activeGoals = employee.goals.filter(g => g.status !== 'Completed')
  const completedGoals = employee.goals.filter(g => g.status === 'Completed')

  const GoalIcon = ({ status }: { status: string }) => {
    if (status === 'Completed') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'At Risk') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return <Clock className="w-4 h-4 text-blue-400" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-brand-600">Team Insight AI</span>
          <ChevronRight className="w-3 h-3" />
          <span>Automation Solution Engineering</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600 font-medium">{employee.name}</span>
        </div>
        <p className="text-xs text-slate-400">Shared profile · Read-only view</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar name={employee.name} size="xl" />
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{employee.name}</h1>
                  <p className="text-slate-600 font-medium mt-0.5">{employee.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <span className="font-semibold text-brand-600">{employee.level}</span>
                    <span className="text-slate-300">·</span>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{employee.department}</span>
                  </div>
                </div>
                {employee.isHighPotential && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">High Potential</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-6 mt-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />{employee.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />Joined {formatDate(employee.hireDate)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />Mgr: {employee.managerName}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {employee.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-600">{employee.goals.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Active Goals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{accomplishments.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Accomplishments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{employee.skills.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Skills</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-slate-200 mb-4 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === tab ? 'border-brand-600 text-brand-600' :
                'border-transparent text-slate-500 hover:text-slate-800'
              )}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'Overview' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">About Me</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{employee.bio}</p>
              <div className="mt-4 p-4 bg-brand-50 border border-brand-100 rounded-xl">
                <p className="text-xs font-semibold text-brand-700 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />Career Aspirations
                </p>
                <p className="text-sm text-brand-700 leading-relaxed">{employee.careerAspirations}</p>
              </div>
            </div>

            {/* Goal snapshot */}
            {activeGoals.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-600" />Current Focus
                  </h2>
                  <button onClick={() => setActiveTab('Goals')} className="text-xs text-brand-600 hover:underline">
                    View all →
                  </button>
                </div>
                <div className="space-y-3">
                  {activeGoals.slice(0, 3).map(goal => (
                    <div key={goal.id} className="flex items-center gap-3">
                      <GoalIcon status={goal.status} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{goal.title}</p>
                        <Progress value={goal.progress} size="sm" color="auto" className="mt-1.5" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 w-10 text-right">{goal.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top skills */}
            {employee.skills.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-purple-500" />Top Skills
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {employee.skills.slice(0, 6).map(skill => (
                    <div key={skill.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-700 font-medium">{skill.name}</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', skillLevelColor(skill.currentLevel))}>
                        {skill.currentLevel}
                      </span>
                    </div>
                  ))}
                </div>
                {employee.skills.length > 6 && (
                  <button onClick={() => setActiveTab('Skills')} className="mt-3 text-xs text-brand-600 hover:underline block">
                    +{employee.skills.length - 6} more skills →
                  </button>
                )}
              </div>
            )}

            {/* Director notes (non-private only) */}
            {publicNotes.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-teal-500" />Notes from Your Director
                </h2>
                <div className="space-y-3">
                  {publicNotes.map(note => (
                    <div key={note.id} className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold text-slate-800">{note.title}</h4>
                        <span className="text-[10px] text-slate-400">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals */}
        {activeTab === 'Goals' && (
          <div className="space-y-4">
            {completedGoals.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-sm font-semibold text-green-700">{completedGoals.length} goals completed</p>
              </div>
            )}
            {employee.goals.map(goal => (
              <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <GoalIcon status={goal.status} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{goal.title}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', goalStatusColor(goal.status))}>
                        {goal.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{goal.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Progress value={goal.progress} color="auto" className="flex-1" />
                  <span className="text-sm font-bold text-slate-600 w-10 text-right">{goal.progress}%</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>Due {formatDate(goal.dueDate)}</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{goal.category}</span>
                </div>
              </div>
            ))}
            {employee.goals.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No goals recorded yet</p>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {activeTab === 'Skills' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Skills & Proficiency</h2>
            <div className="space-y-3">
              {employee.skills.map(skill => (
                <div key={skill.id} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-800">{skill.name}</p>
                    <p className="text-[10px] text-slate-400">{skill.category}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <div key={level} className={cn('h-2.5 rounded-sm flex-1', level <= skill.score ? 'bg-brand-500' : 'bg-slate-100')} />
                      ))}
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded font-medium flex-shrink-0', skillLevelColor(skill.currentLevel))}>
                    {skill.currentLevel}
                  </span>
                </div>
              ))}
              {employee.skills.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No skills recorded yet</p>
              )}
            </div>
          </div>
        )}

        {/* Accomplishments */}
        {activeTab === 'Accomplishments' && (
          <div className="space-y-4">
            {[...accomplishments].reverse().map(accom => (
              <div key={accom.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-semibold text-slate-900">{accom.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ACCOM_COLORS[accom.category])}>
                      {accom.category}
                    </span>
                    {accom.date && <span className="text-xs text-slate-400">{formatDate(accom.date)}</span>}
                  </div>
                </div>
                {accom.description && <p className="text-xs text-slate-600 leading-relaxed mb-2">{accom.description}</p>}
                {accom.impact && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg mb-2">
                    <p className="text-[10px] font-semibold text-green-700 mb-0.5">IMPACT</p>
                    <p className="text-xs text-slate-700">{accom.impact}</p>
                  </div>
                )}
                {accom.recognizedBy && (
                  <p className="text-xs text-slate-400">Recognized by: <span className="text-slate-600">{accom.recognizedBy}</span></p>
                )}
              </div>
            ))}
            {accomplishments.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No accomplishments recorded yet</p>
              </div>
            )}
          </div>
        )}

        {/* Development */}
        {activeTab === 'Development' && (
          <div className="space-y-5">
            {employee.development.certifications.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-amber-500" />Certifications
                </h2>
                <div className="space-y-3">
                  {employee.development.certifications.map(cert => (
                    <div key={cert.id} className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-sm font-semibold text-slate-900">{cert.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cert.provider} · Earned {formatDate(cert.dateEarned)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {employee.development.training.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-blue-500" />Training & Courses
                </h2>
                <div className="space-y-3">
                  {employee.development.training.map(tr => (
                    <div key={tr.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{tr.courseName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{tr.platform}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        tr.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        tr.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      )}>{tr.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {employee.development.certifications.length === 0 && employee.development.training.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No development activities recorded yet</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Shared via Team Insight AI · Automation Solution Engineering · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
