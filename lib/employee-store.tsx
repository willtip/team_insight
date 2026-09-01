'use client'

import { createContext, useCallback, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, useApiToken } from './api-client'
import type {
  Accomplishment, Certification, Conference, DevelopmentPlanItem, DirectorNote,
  Employee, Goal, MentoringRelation, OneOnOne, ProjectContribution, SkillAssessment, Training,
} from './types'

/** One person's rating edits, keyed by catalog skill id. */
export type AssessmentPatch = Record<string, Partial<SkillAssessment>>

interface EmployeeStore {
  employees: Employee[]
  hydrated: boolean
  addEmployee: (data: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, updates: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  updateSkillAssessment: (
    employeeId: string,
    skillId: string,
    patch: Partial<SkillAssessment>,
  ) => void
  applyAssessments: (edits: Record<string, AssessmentPatch>) => void
  setDevelopmentPlan: (employeeId: string, items: DevelopmentPlanItem[]) => void
}

const EmployeeContext = createContext<EmployeeStore | null>(null)

const EMPLOYEES_KEY = ['employees'] as const

/** Diffs an old vs new array (by id) into create/update/delete calls, run concurrently. */
async function diffCollection<T extends { id: string }>(
  oldItems: T[],
  newItems: T[],
  ops: {
    create: (item: T) => Promise<unknown>
    update: (id: string, item: T) => Promise<unknown>
    remove: (id: string) => Promise<unknown>
  },
): Promise<void> {
  const oldIds = new Set(oldItems.map((i) => i.id))
  const newIds = new Set(newItems.map((i) => i.id))
  const tasks: Promise<unknown>[] = []

  for (const item of newItems) {
    tasks.push(oldIds.has(item.id) ? ops.update(item.id, item) : ops.create(item))
  }
  for (const item of oldItems) {
    if (!newIds.has(item.id)) tasks.push(ops.remove(item.id))
  }
  await Promise.all(tasks)
}

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const token = useApiToken()
  const queryClient = useQueryClient()

  const employeesQuery = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: () => apiFetch<Employee[]>('/api/v1/employees/', { token }),
    enabled: !!token,
  })
  const employees = employeesQuery.data ?? []

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    [queryClient],
  )

  const addEmployeeMutation = useMutation({
    mutationFn: async (data: Omit<Employee, 'id'>) => {
      const created = await apiFetch<Employee>('/api/v1/employees/', {
        method: 'POST',
        token,
        body: data,
      })
      if (data.skills?.length) {
        await Promise.all(
          data.skills.map((s) =>
            apiFetch(`/api/v1/skills/${created.id}`, { method: 'POST', token, body: s }),
          ),
        )
      }
    },
    onSuccess: invalidate,
  })

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/employees/${id}`, { method: 'DELETE', token }),
    onSuccess: invalidate,
  })

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      const {
        goals, projectContributions, notes, development, accomplishments, oneOnOnes,
        skills, developmentPlan, performanceScore, managerName, ...scalarUpdates
      } = updates
      const employee = employees.find((e) => e.id === id)
      const tasks: Promise<unknown>[] = []

      if (Object.keys(scalarUpdates).length > 0) {
        tasks.push(apiFetch(`/api/v1/employees/${id}`, { method: 'PATCH', token, body: scalarUpdates }))
      }

      if (goals) {
        tasks.push(
          diffCollection<Goal>(employee?.goals ?? [], goals, {
            create: (g) => apiFetch('/api/v1/goals/', { method: 'POST', token, body: { ...g, employeeId: id } }),
            update: (gid, g) => apiFetch(`/api/v1/goals/${gid}`, { method: 'PATCH', token, body: g }),
            remove: (gid) => apiFetch(`/api/v1/goals/${gid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (projectContributions) {
        tasks.push(
          diffCollection<ProjectContribution>(employee?.projectContributions ?? [], projectContributions, {
            create: (p) => apiFetch('/api/v1/projects/', { method: 'POST', token, body: { ...p, employeeId: id } }),
            update: (pid, p) => apiFetch(`/api/v1/projects/${pid}`, { method: 'PATCH', token, body: p }),
            remove: (pid) => apiFetch(`/api/v1/projects/${pid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (notes) {
        tasks.push(
          diffCollection<DirectorNote>(employee?.notes ?? [], notes, {
            create: (n) => apiFetch('/api/v1/notes/', { method: 'POST', token, body: { ...n, employeeId: id } }),
            update: (nid, n) => apiFetch(`/api/v1/notes/${nid}`, { method: 'PATCH', token, body: n }),
            remove: (nid) => apiFetch(`/api/v1/notes/${nid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (accomplishments) {
        tasks.push(
          diffCollection<Accomplishment>(employee?.accomplishments ?? [], accomplishments, {
            create: (a) => apiFetch(`/api/v1/employees/${id}/accomplishments`, { method: 'POST', token, body: a }),
            update: (aid, a) =>
              apiFetch(`/api/v1/employees/${id}/accomplishments/${aid}`, { method: 'PATCH', token, body: a }),
            remove: (aid) =>
              apiFetch(`/api/v1/employees/${id}/accomplishments/${aid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (oneOnOnes) {
        tasks.push(
          diffCollection<OneOnOne>(employee?.oneOnOnes ?? [], oneOnOnes, {
            create: (o) => apiFetch('/api/v1/one-on-ones/', { method: 'POST', token, body: { ...o, employeeId: id } }),
            update: (oid, o) => apiFetch(`/api/v1/one-on-ones/${oid}`, { method: 'PATCH', token, body: o }),
            remove: (oid) => apiFetch(`/api/v1/one-on-ones/${oid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (development) {
        const dev = employee?.development
        tasks.push(
          diffCollection<Certification>(dev?.certifications ?? [], development.certifications, {
            create: (c) => apiFetch(`/api/v1/employees/${id}/certifications`, { method: 'POST', token, body: c }),
            update: (cid, c) =>
              apiFetch(`/api/v1/employees/${id}/certifications/${cid}`, { method: 'PATCH', token, body: c }),
            remove: (cid) => apiFetch(`/api/v1/employees/${id}/certifications/${cid}`, { method: 'DELETE', token }),
          }),
        )
        tasks.push(
          diffCollection<Training>(dev?.training ?? [], development.training, {
            create: (t) => apiFetch(`/api/v1/employees/${id}/training`, { method: 'POST', token, body: t }),
            update: (tid, t) =>
              apiFetch(`/api/v1/employees/${id}/training/${tid}`, { method: 'PATCH', token, body: t }),
            remove: (tid) => apiFetch(`/api/v1/employees/${id}/training/${tid}`, { method: 'DELETE', token }),
          }),
        )
        tasks.push(
          diffCollection<Conference>(dev?.conferences ?? [], development.conferences, {
            create: (c) => apiFetch(`/api/v1/employees/${id}/conferences`, { method: 'POST', token, body: c }),
            update: (cid, c) =>
              apiFetch(`/api/v1/employees/${id}/conferences/${cid}`, { method: 'PATCH', token, body: c }),
            remove: (cid) => apiFetch(`/api/v1/employees/${id}/conferences/${cid}`, { method: 'DELETE', token }),
          }),
        )
        tasks.push(
          diffCollection<MentoringRelation>(dev?.mentoring ?? [], development.mentoring, {
            create: (m) => apiFetch(`/api/v1/employees/${id}/mentoring`, { method: 'POST', token, body: m }),
            update: (mid, m) =>
              apiFetch(`/api/v1/employees/${id}/mentoring/${mid}`, { method: 'PATCH', token, body: m }),
            remove: (mid) => apiFetch(`/api/v1/employees/${id}/mentoring/${mid}`, { method: 'DELETE', token }),
          }),
        )
      }

      if (skills) {
        tasks.push(
          ...skills.map((s) => apiFetch(`/api/v1/skills/${id}`, { method: 'POST', token, body: s })),
        )
      }

      if (developmentPlan) {
        tasks.push(
          diffCollection<DevelopmentPlanItem>(employee?.developmentPlan ?? [], developmentPlan, {
            create: (item) =>
              apiFetch(`/api/v1/employees/${id}/development-plan`, { method: 'POST', token, body: item }),
            // No PATCH for development plan items yet; recreate on change (delete + create) instead.
            update: async (itemId, item) => {
              await apiFetch(`/api/v1/employees/${id}/development-plan/${itemId}`, { method: 'DELETE', token })
              await apiFetch(`/api/v1/employees/${id}/development-plan`, { method: 'POST', token, body: item })
            },
            remove: (itemId) =>
              apiFetch(`/api/v1/employees/${id}/development-plan/${itemId}`, { method: 'DELETE', token }),
          }),
        )
      }

      await Promise.all(tasks)
    },
    onSuccess: invalidate,
  })

  const updateSkillAssessmentMutation = useMutation({
    mutationFn: ({ employeeId, skillId, patch }: { employeeId: string; skillId: string; patch: Partial<SkillAssessment> }) =>
      apiFetch(`/api/v1/skills/${employeeId}`, { method: 'POST', token, body: { skillId, ...patch } }),
    onSuccess: invalidate,
  })

  const applyAssessmentsMutation = useMutation({
    mutationFn: async (edits: Record<string, AssessmentPatch>) => {
      const tasks: Promise<unknown>[] = []
      for (const [employeeId, bySkill] of Object.entries(edits)) {
        for (const [skillId, patch] of Object.entries(bySkill)) {
          tasks.push(apiFetch(`/api/v1/skills/${employeeId}`, { method: 'POST', token, body: { skillId, ...patch } }))
        }
      }
      await Promise.all(tasks)
    },
    onSuccess: invalidate,
  })

  const setDevelopmentPlanMutation = useMutation({
    mutationFn: async ({ employeeId, items }: { employeeId: string; items: DevelopmentPlanItem[] }) => {
      const employee = employees.find((e) => e.id === employeeId)
      const existing = employee?.developmentPlan ?? []
      await Promise.all(existing.map((item) =>
        apiFetch(`/api/v1/employees/${employeeId}/development-plan/${item.id}`, { method: 'DELETE', token }),
      ))
      await Promise.all(items.map((item) =>
        apiFetch(`/api/v1/employees/${employeeId}/development-plan`, { method: 'POST', token, body: item }),
      ))
    },
    onSuccess: invalidate,
  })

  const addEmployee = useCallback((data: Omit<Employee, 'id'>) => {
    addEmployeeMutation.mutate(data)
  }, [addEmployeeMutation])

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    updateEmployeeMutation.mutate({ id, updates })
  }, [updateEmployeeMutation])

  const deleteEmployee = useCallback((id: string) => {
    deleteEmployeeMutation.mutate(id)
  }, [deleteEmployeeMutation])

  const updateSkillAssessment = useCallback((employeeId: string, skillId: string, patch: Partial<SkillAssessment>) => {
    updateSkillAssessmentMutation.mutate({ employeeId, skillId, patch })
  }, [updateSkillAssessmentMutation])

  const applyAssessments = useCallback((edits: Record<string, AssessmentPatch>) => {
    applyAssessmentsMutation.mutate(edits)
  }, [applyAssessmentsMutation])

  const setDevelopmentPlan = useCallback((employeeId: string, items: DevelopmentPlanItem[]) => {
    setDevelopmentPlanMutation.mutate({ employeeId, items })
  }, [setDevelopmentPlanMutation])

  return (
    <EmployeeContext.Provider value={{
      employees, hydrated: !employeesQuery.isLoading, addEmployee, updateEmployee, deleteEmployee,
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

