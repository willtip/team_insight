'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/layout/Header'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { useEmployees } from '@/lib/employee-store'
import { cn, formatDate } from '@/lib/utils'
import {
  Lock, Plus, Search, Clock, AlertCircle,
  Star, TrendingUp, MessageSquare, Heart, Flag,
  Pencil, Trash2, X, Check
} from 'lucide-react'
import Link from 'next/link'
import type { NoteCategory, DirectorNote } from '@/lib/types'

const CATEGORY_CONFIG: Record<NoteCategory, { color: string; bg: string; icon: React.ElementType }> = {
  'Coaching': { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: MessageSquare },
  'Recognition': { color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: Star },
  'Leadership Potential': { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: TrendingUp },
  'Performance Observation': { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Flag },
  'Career Aspirations': { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Heart },
  'Succession Planning': { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: TrendingUp },
  'Concerns': { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertCircle },
  'Follow-Up Actions': { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Clock },
}

const CATEGORIES: NoteCategory[] = [
  'Coaching', 'Recognition', 'Leadership Potential', 'Performance Observation',
  'Career Aspirations', 'Succession Planning', 'Concerns', 'Follow-Up Actions'
]

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

function NoteForm({
  form, setForm, tags, setTags, empId, setEmpId, employees, showEmpSelect, onSave, onCancel, saveLabel,
}: {
  form: Partial<DirectorNote>
  setForm: React.Dispatch<React.SetStateAction<Partial<DirectorNote>>>
  tags: string
  setTags: (v: string) => void
  empId?: string
  setEmpId?: (v: string) => void
  employees: { id: string; name: string }[]
  showEmpSelect: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  return (
    <div className="space-y-3">
      {showEmpSelect && setEmpId && (
        <div>
          <label className={labelCls}>Engineer *</label>
          <select value={empId || ''} onChange={e => setEmpId(e.target.value)} className={inputCls}>
            <option value="">Select engineer...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Note title..." />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select value={form.category || 'Coaching'} onChange={e => setForm(f => ({ ...f, category: e.target.value as NoteCategory }))} className={inputCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Content</label>
        <textarea value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className={cn(inputCls, 'resize-none h-24')} placeholder="Note content..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Follow-Up Date</label>
          <input type="date" value={form.followUpDate || ''} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value || undefined }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tags (comma-separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} className={inputCls} placeholder="coaching, q2, ..." />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="note-private" checked={form.isPrivate ?? true} onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))} className="w-3.5 h-3.5 accent-brand-600" />
        <label htmlFor="note-private" className="text-xs text-slate-600">Private note</label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <Check className="w-3.5 h-3.5" /> {saveLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const { employees: EMPLOYEES, updateEmployee } = useEmployees()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'All'>('All')
  const [employeeFilter, setEmployeeFilter] = useState('all')

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DirectorNote>>({})
  const [editTags, setEditTags] = useState('')

  const [addingNote, setAddingNote] = useState(false)
  const [addEmpId, setAddEmpId] = useState('')
  const [addForm, setAddForm] = useState<Partial<DirectorNote>>({ category: 'Coaching', isPrivate: true })
  const [addTags, setAddTags] = useState('')

  const allNotes = EMPLOYEES.flatMap(e => e.notes.map(n => ({ ...n, employeeId: e.id })))

  const filtered = useMemo(() => {
    return allNotes.filter(note => {
      if (categoryFilter !== 'All' && note.category !== categoryFilter) return false
      if (employeeFilter !== 'all' && note.employeeId !== employeeFilter) return false
      if (search && !note.title.toLowerCase().includes(search.toLowerCase()) &&
          !note.content.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allNotes, categoryFilter, employeeFilter, search])

  const followUps = allNotes.filter(n => n.followUpDate)
  const getEmployee = (id: string) => EMPLOYEES.find(e => e.id === id)

  const startEdit = (note: DirectorNote) => {
    setEditingNoteId(note.id)
    setEditForm({ ...note })
    setEditTags(note.tags.join(', '))
    setAddingNote(false)
  }

  const cancelEdit = () => { setEditingNoteId(null); setEditForm({}) }

  const saveEdit = () => {
    if (!editForm.title?.trim()) return
    const note = allNotes.find(n => n.id === editingNoteId)
    if (!note) return
    const emp = EMPLOYEES.find(e => e.id === note.employeeId)
    if (!emp) return
    updateEmployee(emp.id, {
      notes: emp.notes.map(n => n.id === editingNoteId
        ? { ...n, ...editForm, tags: editTags.split(',').map(t => t.trim()).filter(Boolean), updatedAt: new Date().toISOString() }
        : n
      )
    })
    cancelEdit()
  }

  const deleteNote = (noteId: string, empId: string) => {
    const emp = EMPLOYEES.find(e => e.id === empId)
    if (!emp) return
    updateEmployee(emp.id, { notes: emp.notes.filter(n => n.id !== noteId) })
    setDeletingNoteId(null)
  }

  const saveNewNote = () => {
    if (!addForm.title?.trim() || !addEmpId) return
    const emp = EMPLOYEES.find(e => e.id === addEmpId)
    if (!emp) return
    const now = new Date().toISOString()
    const newNote: DirectorNote = {
      id: `note-${Date.now()}`,
      employeeId: addEmpId,
      authorId: 'director',
      authorName: 'William Tipton',
      category: (addForm.category as NoteCategory) || 'Coaching',
      title: addForm.title || '',
      content: addForm.content || '',
      createdAt: now,
      updatedAt: now,
      followUpDate: addForm.followUpDate,
      isPrivate: addForm.isPrivate ?? true,
      tags: addTags.split(',').map(t => t.trim()).filter(Boolean),
    }
    updateEmployee(addEmpId, { notes: [...emp.notes, newNote] })
    setAddingNote(false)
    setAddForm({ category: 'Coaching', isPrivate: true })
    setAddTags('')
    setAddEmpId('')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Director Notes"
        subtitle="Private coaching notes — visible to authorized managers only"
        actions={
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAddingNote(true); setEditingNoteId(null) }}>
            New Note
          </Button>
        }
      />

      <div className="flex-1 p-6 flex gap-5">
        <div className="flex-1 space-y-4 min-w-0">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategoryFilter('All')} className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all', categoryFilter === 'All' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>All</button>
              {CATEGORIES.map(cat => {
                const config = CATEGORY_CONFIG[cat]
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all border', categoryFilter === cat ? 'bg-brand-600 text-white border-brand-600' : `${config.bg} ${config.color} hover:opacity-80`)}>
                    {cat}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Engineer:</span>
              <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="all">All Engineers</option>
                {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <span className="text-xs text-slate-400 ml-2">{filtered.length} notes</span>
            </div>
          </div>

          {/* Add note form */}
          {addingNote && (
            <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <h4 className="text-sm font-semibold text-slate-800">New Note</h4>
                <button onClick={() => { setAddingNote(false); setAddForm({ category: 'Coaching', isPrivate: true }); setAddTags(''); setAddEmpId('') }} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <NoteForm
                form={addForm} setForm={setAddForm}
                tags={addTags} setTags={setAddTags}
                empId={addEmpId} setEmpId={setAddEmpId}
                employees={EMPLOYEES}
                showEmpSelect
                onSave={saveNewNote}
                onCancel={() => { setAddingNote(false); setAddForm({ category: 'Coaching', isPrivate: true }); setAddTags(''); setAddEmpId('') }}
                saveLabel="Save Note"
              />
            </div>
          )}

          {/* Notes list */}
          <div className="space-y-3">
            {filtered.map(note => {
              const emp = getEmployee(note.employeeId)
              const config = CATEGORY_CONFIG[note.category]
              const Icon = config.icon

              if (editingNoteId === note.id) {
                return (
                  <div key={note.id} className="bg-white rounded-xl border-2 border-brand-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-4 h-4 text-brand-600" />
                      <h4 className="text-sm font-semibold text-slate-800">Edit Note</h4>
                      {emp && <span className="text-xs text-slate-400">· {emp.name}</span>}
                      <button onClick={cancelEdit} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                    <NoteForm
                      form={editForm} setForm={setEditForm}
                      tags={editTags} setTags={setEditTags}
                      employees={EMPLOYEES}
                      showEmpSelect={false}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      saveLabel="Save Note"
                    />
                  </div>
                )
              }

              return (
                <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-card-hover transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {emp && (
                        <Link href={`/employees/${note.employeeId}`}>
                          <Avatar name={emp.name} size="sm" />
                        </Link>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/employees/${note.employeeId}`}>
                            <span className="text-xs font-semibold text-brand-600 hover:underline">{emp?.name}</span>
                          </Link>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border', config.bg, config.color)}>
                            <Icon className="inline w-2.5 h-2.5 mr-1" />
                            {note.category}
                          </span>
                          {note.isPrivate && <Lock className="w-3 h-3 text-slate-300" />}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">{note.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-start gap-1 ml-4 flex-shrink-0">
                      <div className="text-right mr-2">
                        <p className="text-[10px] text-slate-400">{formatDate(note.createdAt)}</p>
                        <p className="text-[10px] text-slate-400">{note.authorName}</p>
                      </div>
                      <button onClick={() => startEdit(note)} className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deletingNoteId === note.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button onClick={() => deleteNote(note.id, note.employeeId)} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md">Yes</button>
                          <button onClick={() => setDeletingNoteId(null)} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingNoteId(note.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{note.content}</p>

                  {note.followUpDate && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-700 font-medium">Follow-up: {formatDate(note.followUpDate)}</span>
                    </div>
                  )}

                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No notes match your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Pending Follow-Ups
            </h3>
            {followUps.length > 0 ? (
              <div className="space-y-2">
                {followUps.map(note => {
                  const emp = getEmployee(note.employeeId)
                  const daysLeft = note.followUpDate
                    ? Math.ceil((new Date(note.followUpDate).getTime() - Date.now()) / 86400000)
                    : 0
                  return (
                    <div key={note.id} className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {emp && <Avatar name={emp.name} size="xs" />}
                        <span className="text-xs font-medium text-slate-800">{emp?.name.split(' ')[0]}</span>
                        <span className={cn('ml-auto text-[10px] font-bold', daysLeft <= 3 ? 'text-red-600' : 'text-amber-600')}>
                          {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600">{note.title}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-3">No pending follow-ups</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Notes by Category</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const count = allNotes.filter(n => n.category === cat).length
                if (count === 0) return null
                const config = CATEGORY_CONFIG[cat]
                const Icon = config.icon
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <Icon className={cn('w-3 h-3', config.color)} />
                    <span className="text-xs text-slate-600 flex-1">{cat}</span>
                    <span className="text-xs font-bold text-slate-700">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
