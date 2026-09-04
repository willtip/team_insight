'use client'

import { Building2, Users } from 'lucide-react'
import { useScope } from '@/lib/scope-store'

const SELECT =
  'w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1.5 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-40 disabled:cursor-not-allowed'

/**
 * Organization picker, then a team picker scoped to that organization.
 *
 * Both lists come from RBAC-scoped endpoints, so a user only ever sees the orgs and
 * teams they hold a grant on. This is a convenience — the server rejects any request
 * for a scope the caller isn't entitled to, whatever this widget offers.
 */
export default function ScopeSelector() {
  const { organizations, teams, organizationId, teamId, setOrganization, setTeam, ready } = useScope()

  if (ready && organizations.length === 0) {
    return (
      <div className="px-4 py-3 mx-4 mb-1 rounded-lg bg-slate-800/40 border border-slate-700/50">
        <p className="text-[11px] text-slate-400 leading-snug">
          You&apos;re not assigned to an organization yet. Ask an administrator to add you to a team.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 mb-2 space-y-2">
      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 mb-1">
          <Building2 className="w-3 h-3" />
          Organization
        </label>
        <select
          value={organizationId ?? ''}
          onChange={e => setOrganization(e.target.value || undefined)}
          className={SELECT}
          disabled={!ready}
          aria-label="Organization"
        >
          <option value="">All organizations</option>
          {organizations.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 mb-1">
          <Users className="w-3 h-3" />
          Team
        </label>
        <select
          value={teamId ?? ''}
          onChange={e => setTeam(e.target.value || undefined)}
          className={SELECT}
          // A team only means something inside an organization, so this stays inert
          // until one is chosen.
          disabled={!organizationId}
          aria-label="Team"
        >
          <option value="">{organizationId ? 'All teams' : 'Select an organization first'}</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
