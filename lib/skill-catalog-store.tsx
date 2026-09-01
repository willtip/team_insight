'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, useApiToken } from './api-client'
import { AAP_SKILL_CATALOG, ROLE_PROFILES, DEFAULT_THRESHOLDS } from './skill-catalog'
import type { RoleProfile, SkillDefinition, SkillThresholds } from './skill-catalog'

const CATALOG_KEY = ['skill-catalog'] as const
const ROLES_KEY = ['role-profiles'] as const
const THRESHOLDS_KEY = ['skill-thresholds'] as const


interface SkillCatalogStore {
  catalog: SkillDefinition[]
  skillById: Map<string, SkillDefinition>
  domains: string[]
  roleProfiles: RoleProfile[]
  roleProfileById: Map<string, RoleProfile>

  addSkill: (data: Omit<SkillDefinition, 'id' | 'code'>) => void
  updateSkill: (id: string, updates: Partial<SkillDefinition>) => void
  /** Also strips the skill from every role profile's depth areas. */
  deleteSkill: (id: string) => void
  replaceCatalog: (next: SkillDefinition[]) => void

  addRoleProfile: (data: Omit<RoleProfile, 'id'>) => void
  updateRoleProfile: (id: string, updates: Partial<RoleProfile>) => void
  deleteRoleProfile: (id: string) => void

  /** The levels at which breadth, coverage and depth start counting. */
  thresholds: SkillThresholds
  updateThresholds: (updates: Partial<SkillThresholds>) => void

  /** Restores both the shipped catalog and the shipped role profiles. */
  resetToPreset: () => void
}

const SkillCatalogContext = createContext<SkillCatalogStore | null>(null)

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

export function SkillCatalogProvider({ children }: { children: React.ReactNode }) {
  const token = useApiToken()
  const queryClient = useQueryClient()

  const catalogQuery = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: () => apiFetch<SkillDefinition[]>('/api/v1/skills/catalog', { token }),
    enabled: !!token,
  })
  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => apiFetch<RoleProfile[]>('/api/v1/skills/role-profiles', { token }),
    enabled: !!token,
  })
  const thresholdsQuery = useQuery({
    queryKey: THRESHOLDS_KEY,
    queryFn: () => apiFetch<SkillThresholds>('/api/v1/skills/thresholds', { token }),
    enabled: !!token,
  })

  const catalog = catalogQuery.data ?? []
  const roleProfiles = rolesQuery.data ?? []
  const thresholds = thresholdsQuery.data ?? DEFAULT_THRESHOLDS

  const invalidateCatalog = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CATALOG_KEY }),
    [queryClient],
  )
  const invalidateRoles = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
    [queryClient],
  )
  const invalidateThresholds = useCallback(
    () => queryClient.invalidateQueries({ queryKey: THRESHOLDS_KEY }),
    [queryClient],
  )

  // ---- Skills ----------------------------------------------------------

  const addSkillMutation = useMutation({
    mutationFn: (data: Omit<SkillDefinition, 'id' | 'code'>) =>
      apiFetch('/api/v1/skills/catalog', { method: 'POST', token, body: data }),
    onSuccess: invalidateCatalog,
  })

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SkillDefinition> }) =>
      apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'PATCH', token, body: updates }),
    onSuccess: invalidateCatalog,
  })

  const deleteSkillMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      invalidateCatalog()
      invalidateRoles()
    },
  })

  const replaceCatalogMutation = useMutation({
    mutationFn: (next: SkillDefinition[]) =>
      diffCollection<SkillDefinition>(catalog, next, {
        create: (s) => apiFetch('/api/v1/skills/catalog', { method: 'POST', token, body: s }),
        update: (id, s) => apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'PATCH', token, body: s }),
        remove: (id) => apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'DELETE', token }),
      }),
    onSuccess: invalidateCatalog,
  })

  // ---- Role profiles ---------------------------------------------------

  const addRoleProfileMutation = useMutation({
    mutationFn: (data: Omit<RoleProfile, 'id'>) =>
      apiFetch('/api/v1/skills/role-profiles', { method: 'POST', token, body: data }),
    onSuccess: invalidateRoles,
  })

  const updateRoleProfileMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RoleProfile> }) =>
      apiFetch(`/api/v1/skills/role-profiles/${id}`, { method: 'PATCH', token, body: updates }),
    onSuccess: invalidateRoles,
  })

  const deleteRoleProfileMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/skills/role-profiles/${id}`, { method: 'DELETE', token }),
    onSuccess: invalidateRoles,
  })

  const updateThresholdsMutation = useMutation({
    mutationFn: (updates: Partial<SkillThresholds>) =>
      apiFetch('/api/v1/skills/thresholds', { method: 'PATCH', token, body: updates }),
    onSuccess: invalidateThresholds,
  })

  const resetToPresetMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        diffCollection<SkillDefinition>(catalog, AAP_SKILL_CATALOG, {
          create: (s) => apiFetch('/api/v1/skills/catalog', { method: 'POST', token, body: s }),
          update: (id, s) => apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'PATCH', token, body: s }),
          remove: (id) => apiFetch(`/api/v1/skills/catalog/${id}`, { method: 'DELETE', token }),
        }),
        diffCollection<RoleProfile>(roleProfiles, ROLE_PROFILES, {
          create: (p) => apiFetch('/api/v1/skills/role-profiles', { method: 'POST', token, body: p }),
          update: (id, p) => apiFetch(`/api/v1/skills/role-profiles/${id}`, { method: 'PATCH', token, body: p }),
          remove: (id) => apiFetch(`/api/v1/skills/role-profiles/${id}`, { method: 'DELETE', token }),
        }),
        apiFetch('/api/v1/skills/thresholds', { method: 'PATCH', token, body: DEFAULT_THRESHOLDS }),
      ])
    },
    onSuccess: () => {
      invalidateCatalog()
      invalidateRoles()
      invalidateThresholds()
    },
  })

  const addSkill = useCallback((data: Omit<SkillDefinition, 'id' | 'code'>) => {
    addSkillMutation.mutate(data)
  }, [addSkillMutation])

  const updateSkill = useCallback((id: string, updates: Partial<SkillDefinition>) => {
    updateSkillMutation.mutate({ id, updates })
  }, [updateSkillMutation])

  const deleteSkill = useCallback((id: string) => {
    deleteSkillMutation.mutate(id)
  }, [deleteSkillMutation])

  const replaceCatalog = useCallback((next: SkillDefinition[]) => {
    replaceCatalogMutation.mutate(next)
  }, [replaceCatalogMutation])

  const addRoleProfile = useCallback((data: Omit<RoleProfile, 'id'>) => {
    addRoleProfileMutation.mutate(data)
  }, [addRoleProfileMutation])

  const updateRoleProfile = useCallback((id: string, updates: Partial<RoleProfile>) => {
    updateRoleProfileMutation.mutate({ id, updates })
  }, [updateRoleProfileMutation])

  const deleteRoleProfile = useCallback((id: string) => {
    deleteRoleProfileMutation.mutate(id)
  }, [deleteRoleProfileMutation])

  const updateThresholds = useCallback((updates: Partial<SkillThresholds>) => {
    updateThresholdsMutation.mutate(updates)
  }, [updateThresholdsMutation])

  const resetToPreset = useCallback(() => {
    resetToPresetMutation.mutate()
  }, [resetToPresetMutation])

  const value = useMemo<SkillCatalogStore>(() => {
    const domains: string[] = []
    for (const s of catalog) if (!domains.includes(s.domain)) domains.push(s.domain)
    return {
      catalog,
      skillById: new Map(catalog.map(s => [s.id, s])),
      domains,
      roleProfiles,
      roleProfileById: new Map(roleProfiles.map(p => [p.id, p])),
      addSkill, updateSkill, deleteSkill, replaceCatalog,
      addRoleProfile, updateRoleProfile, deleteRoleProfile,
      thresholds, updateThresholds,
      resetToPreset,
    }
  }, [
    catalog, roleProfiles, thresholds,
    addSkill, updateSkill, deleteSkill, replaceCatalog,
    addRoleProfile, updateRoleProfile, deleteRoleProfile,
    updateThresholds, resetToPreset,
  ])

  return (
    <SkillCatalogContext.Provider value={value}>{children}</SkillCatalogContext.Provider>
  )
}

export function useSkillCatalog() {
  const ctx = useContext(SkillCatalogContext)
  if (!ctx) throw new Error('useSkillCatalog must be used within SkillCatalogProvider')
  return ctx
}
