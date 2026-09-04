'use client'

import { useState } from 'react'
import { Building2, Users, ChevronDown, ChevronRight, Plus, Trash2, Crown, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useEmployees } from '@/lib/employee-store'
import { useOrganizations, useTeams, useOrganizationMutations } from '@/lib/organization-store'
import { ApiError } from '@/lib/api-client'

const INPUT = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500'
const LABEL = 'text-xs font-medium text-slate-700 mb-1 block'

/** Admin > Organizations tab: create organizations, assign an org-level leader
 * (director), then create teams within each org and assign a team lead (manager).
 * RBAC visibility (who can see which engineers) is driven entirely by these
 * leader/lead assignments — see backend/app/core/rbac.py. */
export default function OrganizationsPanel() {
  const { employees } = useEmployees()
  const { data: organizations = [] } = useOrganizations()
  const { createOrganization, updateOrganization, deleteOrganization, createTeam, updateTeam, deleteTeam } =
    useOrganizationMutations()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [newOrgName, setNewOrgName] = useState('')
  const [addingTeamFor, setAddingTeamFor] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const describeError = (err: unknown) =>
    err instanceof ApiError ? err.message || `Request failed (${err.status})` : 'Something went wrong — please try again.'

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) return
    setFormError(null)
    createOrganization.mutate(
      { name: newOrgName.trim() },
      {
        onSuccess: () => setNewOrgName(''),
        onError: err => setFormError(describeError(err)),
      },
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Organizations</h3>
        <p className="text-xs text-slate-500 mb-3">
          Each organization has one leader (a director) who sees every team and engineer inside it.
          Each team has one lead (a manager) who only sees engineers on that team.
        </p>
        <div className="flex gap-2">
          <input
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
            placeholder="New organization name"
            className={INPUT}
          />
          <Button size="sm" onClick={handleCreateOrg} disabled={!newOrgName.trim()} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Organization
          </Button>
        </div>
        {formError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {organizations.map(org => (
          <OrganizationCard
            key={org.id}
            orgId={org.id}
            name={org.name}
            leaderId={org.leaderId}
            leaderName={org.leaderName}
            teamCount={org.teamCount}
            employeeCount={org.employeeCount}
            expanded={expanded.has(org.id)}
            onToggle={() => toggle(org.id)}
            employees={employees}
            addingTeam={addingTeamFor === org.id}
            newTeamName={newTeamName}
            onNewTeamNameChange={setNewTeamName}
            onStartAddTeam={() => { setAddingTeamFor(org.id); setNewTeamName('') }}
            onCancelAddTeam={() => setAddingTeamFor(null)}
            onCreateTeam={() => {
              if (!newTeamName.trim()) return
              setFormError(null)
              createTeam.mutate(
                { organizationId: org.id, name: newTeamName.trim() },
                { onError: err => setFormError(describeError(err)) },
              )
              setAddingTeamFor(null)
            }}
            onSetLeader={leaderId => {
              setFormError(null)
              updateOrganization.mutate(
                { id: org.id, leaderId: leaderId || undefined },
                { onError: err => setFormError(describeError(err)) },
              )
            }}
            onDeleteOrg={() => {
              setFormError(null)
              deleteOrganization.mutate(org.id, { onError: err => setFormError(describeError(err)) })
            }}
            onSetTeamLead={(teamId, leadId) => {
              setFormError(null)
              updateTeam.mutate(
                { id: teamId, organizationId: org.id, leadId: leadId || undefined },
                { onError: err => setFormError(describeError(err)) },
              )
            }}
            onDeleteTeam={teamId => {
              setFormError(null)
              deleteTeam.mutate({ id: teamId, organizationId: org.id }, { onError: err => setFormError(describeError(err)) })
            }}
          />
        ))}
        {organizations.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No organizations yet — add one above to get started.</p>
        )}
      </div>
    </div>
  )
}

interface OrgCardProps {
  orgId: string
  name: string
  leaderId?: string
  leaderName?: string
  teamCount: number
  employeeCount: number
  expanded: boolean
  onToggle: () => void
  employees: { id: string; name: string; title: string }[]
  addingTeam: boolean
  newTeamName: string
  onNewTeamNameChange: (v: string) => void
  onStartAddTeam: () => void
  onCancelAddTeam: () => void
  onCreateTeam: () => void
  onSetLeader: (leaderId: string) => void
  onDeleteOrg: () => void
  onSetTeamLead: (teamId: string, leadId: string) => void
  onDeleteTeam: (teamId: string) => void
}

function OrganizationCard(props: OrgCardProps) {
  const { data: teams = [] } = useTeams(props.expanded ? props.orgId : undefined)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={props.onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        {props.expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <Building2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-900">{props.name}</p>
          <p className="text-[11px] text-slate-400">
            {props.teamCount} team{props.teamCount === 1 ? '' : 's'} · {props.employeeCount} engineer{props.employeeCount === 1 ? '' : 's'}
            {props.leaderName && <> · Led by {props.leaderName}</>}
          </p>
        </div>
      </button>

      {props.expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={LABEL}><Crown className="w-3 h-3 inline mr-1 text-amber-500" />Organization leader (director)</label>
              <select
                value={props.leaderId ?? ''}
                onChange={e => props.onSetLeader(e.target.value)}
                className={INPUT}
              >
                <option value="">— Unassigned —</option>
                {props.employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}
              </select>
            </div>
            <Button size="sm" variant="ghost" onClick={props.onDeleteOrg} icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}>
              Delete
            </Button>
          </div>

          <div className="space-y-2">
            {teams.map(team => (
              <div key={team.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-800 flex-1">{team.name}</p>
                  <span className="text-[10px] text-slate-400">{team.employeeCount} engineer{team.employeeCount === 1 ? '' : 's'}</span>
                  <button onClick={() => props.onDeleteTeam(team.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  value={team.leadId ?? ''}
                  onChange={e => props.onSetTeamLead(team.id, e.target.value)}
                  className={cn(INPUT, '!py-1.5 !text-xs')}
                >
                  <option value="">— Unassigned team lead (manager) —</option>
                  {props.employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.title}</option>)}
                </select>
              </div>
            ))}
          </div>

          {props.addingTeam ? (
            <div className="flex gap-2">
              <input
                value={props.newTeamName}
                onChange={e => props.onNewTeamNameChange(e.target.value)}
                placeholder="New team name"
                className={cn(INPUT, '!py-1.5 !text-xs')}
                autoFocus
              />
              <Button size="sm" onClick={props.onCreateTeam} disabled={!props.newTeamName.trim()}>Add</Button>
              <Button size="sm" variant="ghost" onClick={props.onCancelAddTeam}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={props.onStartAddTeam} icon={<Plus className="w-3.5 h-3.5" />}>
              Add Team
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
