'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, useApiToken } from './api-client'
import type { Organization, Team } from './types'

const organizationsKey = (token: string | undefined) => ['organizations', token] as const
const teamsKey = (token: string | undefined, organizationId: string) =>
  ['organizations', token, organizationId, 'teams'] as const

/** Organizations visible to the current user (RBAC-scoped server-side). */
export function useOrganizations() {
  const token = useApiToken()
  return useQuery({
    queryKey: organizationsKey(token),
    queryFn: () => apiFetch<Organization[]>('/api/v1/organizations/', { token }),
    enabled: !!token,
  })
}

/** Teams within one organization, visible to the current user. */
export function useTeams(organizationId: string | undefined) {
  const token = useApiToken()
  return useQuery({
    queryKey: organizationId ? teamsKey(token, organizationId) : ['organizations', token, 'none', 'teams'],
    queryFn: () => apiFetch<Team[]>(`/api/v1/organizations/${organizationId}/teams`, { token }),
    enabled: !!token && !!organizationId,
  })
}

export function useOrganizationMutations() {
  const token = useApiToken()
  const queryClient = useQueryClient()
  const invalidateOrgs = () => queryClient.invalidateQueries({ queryKey: organizationsKey(token) })

  const createOrganization = useMutation({
    mutationFn: (data: { name: string; description?: string; leaderId?: string }) =>
      apiFetch<Organization>('/api/v1/organizations/', { method: 'POST', token, body: data }),
    onSuccess: invalidateOrgs,
  })

  const updateOrganization = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; leaderId?: string }) =>
      apiFetch<Organization>(`/api/v1/organizations/${id}`, { method: 'PATCH', token, body: data }),
    onSuccess: invalidateOrgs,
  })

  const deleteOrganization = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/organizations/${id}`, { method: 'DELETE', token }),
    onSuccess: invalidateOrgs,
  })

  const createTeam = useMutation({
    mutationFn: ({ organizationId, ...data }: { organizationId: string; name: string; description?: string; leadId?: string }) =>
      apiFetch<Team>(`/api/v1/organizations/${organizationId}/teams`, {
        method: 'POST', token, body: { ...data, organizationId },
      }),
    onSuccess: (_res, vars) => {
      invalidateOrgs()
      queryClient.invalidateQueries({ queryKey: teamsKey(token, vars.organizationId) })
    },
  })

  const updateTeam = useMutation({
    mutationFn: ({ id, organizationId, ...data }: { id: string; organizationId: string; name?: string; description?: string; leadId?: string }) =>
      apiFetch<Team>(`/api/v1/organizations/teams/${id}`, { method: 'PATCH', token, body: data }),
    onSuccess: (_res, vars) => queryClient.invalidateQueries({ queryKey: teamsKey(token, vars.organizationId) }),
  })

  const deleteTeam = useMutation({
    mutationFn: ({ id, organizationId }: { id: string; organizationId: string }) =>
      apiFetch(`/api/v1/organizations/teams/${id}`, { method: 'DELETE', token }),
    onSuccess: (_res, vars) => queryClient.invalidateQueries({ queryKey: teamsKey(token, vars.organizationId) }),
  })

  return { createOrganization, updateOrganization, deleteOrganization, createTeam, updateTeam, deleteTeam }
}
