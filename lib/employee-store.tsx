'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { EMPLOYEES } from './mock-data'
import { EMPLOYEE_KEY, ensureMigrated } from './skill-migration'
import type { DevelopmentPlanItem, Employee, SkillAssessment } from './types'

const STORAGE_KEY = EMPLOYEE_KEY

/** One person's rating edits, keyed by catalog skill id. */
export type AssessmentPatch = Record<string, Partial<SkillAssessment>>

interface EmployeeStore {
  employees: Employee[]
  addEmployee: (data: Omit<Employee, 'id'>) => string
  updateEmployee: (id: string, updates: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  updateSkillAssessment: (
    employeeId: string,
    skillId: string,
    patch: Partial<SkillAssessment>,
  ) => void
  /**
   * Applies many ratings across many people in one commit. The per-skill editor
   * used to fire one update per employee, each reading `skills` from a stale
   * render closure; this writes from the previous state instead.
   */
  applyAssessments: (edits: Record<string, AssessmentPatch>) => void
  setDevelopmentPlan: (employeeId: string, items: DevelopmentPlanItem[]) => void
}

const EmployeeContext = createContext<EmployeeStore | null>(null)

function mergeAssessment(
  skills: SkillAssessment[],
  skillId: string,
  patch: Partial<SkillAssessment>,
): SkillAssessment[] {
  const existing = skills.find(s => s.skillId === skillId)
  const next: SkillAssessment = {
    ...(existing ?? { skillId }),
    ...patch,
    skillId,
    assessedAt: patch.assessedAt ?? new Date().toISOString(),
  }
  return existing
    ? skills.map(s => (s.skillId === skillId ? next : s))
    : [...skills, next]
}

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    ensureMigrated()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setEmployees(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(employees)) } catch {}
  }, [employees, hydrated])

  const addEmployee = useCallback((data: Omit<Employee, 'id'>): string => {
    const id = `emp-${Date.now()}`
    setEmployees(prev => [...prev, { ...data, id }])
    return id
  }, [])

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateSkillAssessment = useCallback((
    employeeId: string,
    skillId: string,
    patch: Partial<SkillAssessment>,
  ) => {
    setEmployees(prev => prev.map(e =>
      e.id === employeeId
        ? { ...e, skills: mergeAssessment(e.skills ?? [], skillId, patch) }
        : e,
    ))
  }, [])

  const applyAssessments = useCallback((edits: Record<string, AssessmentPatch>) => {
    setEmployees(prev => prev.map(e => {
      const bySkill = edits[e.id]
      if (!bySkill) return e
      let skills = e.skills ?? []
      for (const [skillId, patch] of Object.entries(bySkill)) {
        skills = mergeAssessment(skills, skillId, patch)
      }
      return { ...e, skills }
    }))
  }, [])

  const setDevelopmentPlan = useCallback((employeeId: string, items: DevelopmentPlanItem[]) => {
    setEmployees(prev => prev.map(e =>
      e.id === employeeId ? { ...e, developmentPlan: items } : e,
    ))
  }, [])

  return (
    <EmployeeContext.Provider value={{
      employees, addEmployee, updateEmployee, deleteEmployee,
      updateSkillAssessment, applyAssessments, setDevelopmentPlan,
    }}>
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployees must be used within EmployeeProvider')
  return ctx
}
