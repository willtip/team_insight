'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { AAP_SKILL_CATALOG, ROLE_PROFILES, DEFAULT_THRESHOLDS } from './skill-catalog'
import type { RoleProfile, SkillDefinition, SkillThresholds } from './skill-catalog'

const CATALOG_KEY = 'asi-skill-catalog'
const ROLES_KEY = 'asi-role-profiles'
const THRESHOLDS_KEY = 'asi-skill-thresholds'

interface SkillCatalogStore {
  catalog: SkillDefinition[]
  skillById: Map<string, SkillDefinition>
  domains: string[]
  roleProfiles: RoleProfile[]
  roleProfileById: Map<string, RoleProfile>

  addSkill: (data: Omit<SkillDefinition, 'id' | 'code'>) => string
  updateSkill: (id: string, updates: Partial<SkillDefinition>) => void
  /** Also strips the skill from every role profile's depth areas. */
  deleteSkill: (id: string) => void
  replaceCatalog: (next: SkillDefinition[]) => void

  addRoleProfile: (data: Omit<RoleProfile, 'id'>) => string
  updateRoleProfile: (id: string, updates: Partial<RoleProfile>) => void
  deleteRoleProfile: (id: string) => void

  /** The levels at which breadth, coverage and depth start counting. */
  thresholds: SkillThresholds
  updateThresholds: (updates: Partial<SkillThresholds>) => void

  /** Restores both the shipped catalog and the shipped role profiles. */
  resetToPreset: () => void
}

const SkillCatalogContext = createContext<SkillCatalogStore | null>(null)

/** Slug from a name, kept unique against what already exists. */
function slugify(name: string, taken: string[]): string {
  const base =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'role'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function SkillCatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<SkillDefinition[]>(AAP_SKILL_CATALOG)
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>(ROLE_PROFILES)
  const [thresholds, setThresholds] = useState<SkillThresholds>(DEFAULT_THRESHOLDS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedCatalog = localStorage.getItem(CATALOG_KEY)
      if (storedCatalog) {
        const parsed = JSON.parse(storedCatalog)
        if (Array.isArray(parsed) && parsed.length) setCatalog(parsed)
      }
      const storedRoles = localStorage.getItem(ROLES_KEY)
      if (storedRoles) {
        const parsed = JSON.parse(storedRoles)
        // An empty array is a legitimate state — the user deleted every profile.
        if (Array.isArray(parsed)) setRoleProfiles(parsed)
      }
      const storedThresholds = localStorage.getItem(THRESHOLDS_KEY)
      if (storedThresholds) {
        const parsed = JSON.parse(storedThresholds)
        if (parsed && typeof parsed === 'object') {
          setThresholds({ ...DEFAULT_THRESHOLDS, ...parsed })
        }
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)) } catch {}
  }, [catalog, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(ROLES_KEY, JSON.stringify(roleProfiles)) } catch {}
  }, [roleProfiles, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds)) } catch {}
  }, [thresholds, hydrated])

  // ---- Skills ----------------------------------------------------------

  const addSkill = useCallback((data: Omit<SkillDefinition, 'id' | 'code'>): string => {
    const id = `custom-${Date.now()}`
    setCatalog(prev => [
      ...prev,
      { ...data, id, code: prev.reduce((m, s) => Math.max(m, s.code), 0) + 1, custom: true },
    ])
    return id
  }, [])

  const updateSkill = useCallback((id: string, updates: Partial<SkillDefinition>) => {
    setCatalog(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
  }, [])

  const deleteSkill = useCallback((id: string) => {
    setCatalog(prev => prev.filter(s => s.id !== id))
    // A depth area pointing at a deleted skill can never be met, so drop it.
    setRoleProfiles(prev =>
      prev.map(p =>
        p.depthSkillIds.includes(id)
          ? { ...p, depthSkillIds: p.depthSkillIds.filter(x => x !== id) }
          : p,
      ),
    )
  }, [])

  const replaceCatalog = useCallback((next: SkillDefinition[]) => setCatalog(next), [])

  // ---- Role profiles ---------------------------------------------------

  const addRoleProfile = useCallback((data: Omit<RoleProfile, 'id'>): string => {
    let id = ''
    setRoleProfiles(prev => {
      id = slugify(data.name, prev.map(p => p.id))
      return [...prev, { ...data, id }]
    })
    return id
  }, [])

  const updateRoleProfile = useCallback((id: string, updates: Partial<RoleProfile>) => {
    // The id is the FK employees hold, so renaming must not change it.
    setRoleProfiles(prev => prev.map(p => (p.id === id ? { ...p, ...updates, id } : p)))
  }, [])

  const deleteRoleProfile = useCallback((id: string) => {
    setRoleProfiles(prev => prev.filter(p => p.id !== id))
  }, [])

  const updateThresholds = useCallback((updates: Partial<SkillThresholds>) => {
    setThresholds(prev => ({ ...prev, ...updates }))
  }, [])

  const resetToPreset = useCallback(() => {
    setCatalog(AAP_SKILL_CATALOG)
    setRoleProfiles(ROLE_PROFILES)
    setThresholds(DEFAULT_THRESHOLDS)
  }, [])

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
