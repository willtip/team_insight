'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/layout/Header'
import EmployeeCard from '@/components/employees/EmployeeCard'
import EmployeeFormModal from '@/components/employees/EmployeeFormModal'
import DeleteConfirmModal from '@/components/employees/DeleteConfirmModal'
import Button from '@/components/ui/Button'
import { useEmployees } from '@/lib/employee-store'
import { useScope } from '@/lib/scope-store'
import { useSkillCatalog } from '@/lib/skill-catalog-store'
import { Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import type { Employee, PromotionReadiness } from '@/lib/types'

const FILTERS = {
  promotionReadiness: ['All', 'Ready Now', 'Ready in 6 Months', 'Ready in 12 Months', 'Development Needed'] as const,
  status: ['All', 'High Potential', 'Needs Coaching'],
  level: ['All', 'L3', 'L4', 'L5', 'L6'],
}

export default function EmployeesPage() {
  const { employees, deleteEmployee } = useEmployees()
  const { organization, team } = useScope()
  const { skillById } = useSkillCatalog()
  const [search, setSearch] = useState('')
  const [readinessFilter, setReadinessFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [levelFilter, setLevelFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'growth'>('score')
  const [showCreate, setShowCreate] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)

  const filtered = useMemo(() => {
    let result = [...employees]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.skills.some(s => skillById.get(s.skillId)?.name.toLowerCase().includes(q))
      )
    }
    if (readinessFilter !== 'All') result = result.filter(e => e.promotionReadiness === readinessFilter)
    if (statusFilter === 'High Potential') result = result.filter(e => e.isHighPotential)
    if (statusFilter === 'Needs Coaching') result = result.filter(e => e.needsCoaching)
    if (levelFilter !== 'All') result = result.filter(e => e.level === levelFilter)
    result.sort((a, b) => {
      if (sortBy === 'score') return b.performanceScore.overall - a.performanceScore.overall
      if (sortBy === 'growth') return b.performanceScore.growthScore - a.performanceScore.growthScore
      return a.name.localeCompare(b.name)
    })
    return result
  }, [employees, search, readinessFilter, statusFilter, levelFilter, sortBy, skillById])

  // The roster is already limited to the selected org/team server-side, so this just
  // names what is on screen.
  const scopeLabel = [
    organization?.name ?? 'All organizations',
    team?.name,
    `${employees.length} engineer${employees.length === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')

  const stats = {
    total: employees.length,
    highPotential: employees.filter(e => e.isHighPotential).length,
    needsCoaching: employees.filter(e => e.needsCoaching).length,
    avgScore: employees.length ? Math.round(employees.reduce((acc, e) => acc + e.performanceScore.overall, 0) / employees.length) : 0,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Team Roster"
        subtitle={scopeLabel}
        actions={
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add Engineer
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Engineers', value: stats.total, color: 'text-slate-800' },
            { label: 'High Potential', value: stats.highPotential, color: 'text-amber-600' },
            { label: 'Needs Coaching', value: stats.needsCoaching, color: 'text-red-600' },
            { label: 'Avg Score', value: stats.avgScore, color: 'text-brand-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by name, title, skill, or tag..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Readiness:</span>
              <div className="flex gap-1">
                {FILTERS.promotionReadiness.map(f => (
                  <button key={f} onClick={() => setReadinessFilter(f)}
                    className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                      readinessFilter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}>
                    {f === 'Ready in 6 Months' ? '6 Mo' : f === 'Ready in 12 Months' ? '12 Mo' : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <div className="flex gap-1">
                {FILTERS.status.map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                      statusFilter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Level:</span>
              <div className="flex gap-1">
                {FILTERS.level.map(f => (
                  <button key={f} onClick={() => setLevelFilter(f)}
                    className={cn('text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                      levelFilter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 font-medium">Sort:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="score">Performance Score</option>
                <option value="growth">Growth Score</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {employees.length} engineers
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(employee => (
              <div key={employee.id} className="relative group">
                <EmployeeCard employee={employee} />
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 z-10">
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingEmployee(employee) }}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setDeletingEmployee(employee) }}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No engineers match your filters</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => {
              setSearch(''); setReadinessFilter('All'); setStatusFilter('All'); setLevelFilter('All')
            }}>Clear filters</Button>
          </div>
        )}
      </div>

      {(showCreate || editingEmployee) && (
        <EmployeeFormModal
          employee={editingEmployee ?? undefined}
          onClose={() => { setShowCreate(false); setEditingEmployee(null) }}
        />
      )}
      {deletingEmployee && (
        <DeleteConfirmModal
          name={deletingEmployee.name}
          onClose={() => setDeletingEmployee(null)}
          onConfirm={() => { deleteEmployee(deletingEmployee.id); setDeletingEmployee(null) }}
        />
      )}
    </div>
  )
}
