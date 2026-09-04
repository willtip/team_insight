'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useOrganizations, useTeams } from './organization-store'
import type { Organization, Team } from './types'

const STORAGE_KEY = 'team-insight:scope'

export interface Scope {
  organizationId?: string
  teamId?: string
}

interface ScopeStore extends Scope {
  organizations: Organization[]
  teams: Team[]
  organization?: Organization
  team?: Team
  /** False until the org list has resolved, so callers can hold off fetching. */
  ready: boolean
  setOrganization: (organizationId: string | undefined) => void
  setTeam: (teamId: string | undefined) => void
}

const ScopeContext = createContext<ScopeStore | null>(null)

function readStored(): Scope {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Scope) : {}
  } catch {
    // Private windows and cleared site data both throw here; a forgotten selection
    // is a much smaller problem than a crashed shell.
    return {}
  }
}

function writeStored(scope: Scope) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scope))
  } catch {
    /* non-fatal */
  }
}

/**
 * Holds the selected organization and team for the whole app.
 *
 * The selection is a *view* over what the API already decided this user may see:
 * the org list and the team list are both server-scoped, and every member query is
 * re-issued against the server with the selection attached. Nothing here is a
 * security boundary — asking for an org or team outside the user's scope returns a
 * 403 from the backend regardless of what this component is showing.
 *
 * A stored selection is validated against the current lists on every load, so a user
 * who loses access to a team (or whose team is deleted) falls back to something they
 * can still see rather than sitting on a scope that now 403s.
 */
export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope>({})
  const [restored, setRestored] = useState(false)
  // Set once the selection has been checked against the org list. Member queries
  // wait on this so they don't fire once unscoped and again a tick later.
  const [reconciled, setReconciled] = useState(false)

  // Restore after mount rather than in useState's initializer: reading localStorage
  // during render would diverge from the server-rendered HTML and hydrate-mismatch.
  useEffect(() => {
    setScope(readStored())
    setRestored(true)
  }, [])

  const orgsQuery = useOrganizations()
  const organizations = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data])
  const teamsQuery = useTeams(scope.organizationId)
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data])

  const orgsLoaded = orgsQuery.isSuccess

  // Reconcile the selection with what the user can actually see right now.
  useEffect(() => {
    if (!restored || !orgsLoaded) return
    const valid = scope.organizationId && organizations.some(o => o.id === scope.organizationId)
    if (!valid) {
      // Auto-select when there is exactly one option, which is the common case for a
      // team leader and saves them a click they have no real choice in.
      const next = organizations.length === 1 ? organizations[0].id : undefined
      setScope({ organizationId: next })
    }
    setReconciled(true)
  }, [restored, orgsLoaded, organizations, scope.organizationId])

  useEffect(() => {
    if (!scope.organizationId || !teamsQuery.isSuccess) return
    if (scope.teamId && !teams.some(t => t.id === scope.teamId)) {
      setScope(prev => ({ ...prev, teamId: undefined }))
    }
  }, [scope.organizationId, scope.teamId, teams, teamsQuery.isSuccess])

  useEffect(() => {
    if (restored) writeStored(scope)
  }, [scope, restored])

  const setOrganization = useCallback((organizationId: string | undefined) => {
    // Always clear the team: team ids are only meaningful inside one org, and
    // carrying one across would ask the server for a team the new org doesn't have.
    setScope({ organizationId, teamId: undefined })
  }, [])

  const setTeam = useCallback((teamId: string | undefined) => {
    setScope(prev => ({ ...prev, teamId }))
  }, [])

  const value = useMemo<ScopeStore>(() => ({
    ...scope,
    organizations,
    teams,
    organization: organizations.find(o => o.id === scope.organizationId),
    team: teams.find(t => t.id === scope.teamId),
    ready: restored && orgsLoaded && reconciled,
    setOrganization,
    setTeam,
  }), [scope, organizations, teams, restored, orgsLoaded, reconciled, setOrganization, setTeam])

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope(): ScopeStore {
  const ctx = useContext(ScopeContext)
  if (!ctx) throw new Error('useScope must be used within ScopeProvider')
  return ctx
}

/** Query-string fragment for the current scope, for member-data fetches. */
export function scopeQuery(scope: Scope): string {
  const params = new URLSearchParams()
  if (scope.organizationId) params.set('organization_id', scope.organizationId)
  if (scope.teamId) params.set('team_id', scope.teamId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
