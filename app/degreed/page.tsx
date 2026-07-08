'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  BookOpen, BarChart3, Target, AlertCircle, CheckCircle2,
  RefreshCw, Loader2, Search, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Users, Star, Award, Zap,
  Settings, Link2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DegreedStatus {
  configured: boolean
  connected: boolean
  message: string
}

interface SkillRating {
  skill_name: string
  level: string
  level_value: number
  rating_date: string
  rating_id: string
}

interface TeamSkillInsight {
  total_unique_skills: number
  team_member_count: number
  avg_rating_by_skill: Record<string, number>
  top_skills: { name: string; avg_rating: number }[]
  gap_skills: { name: string; avg_rating: number }[]
}

interface SkillBreakdown {
  skill_name: string
  total_ratings: number
  breakdown: Record<string, number>
  distribution: Record<string, number>
}

interface Assignment {
  id: string
  attributes: {
    title?: string
    name?: string
    due_date?: string
    'completed-at'?: string
    status?: string
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Team Skills', 'Skill Ratings', 'Assignments', 'User Lookup'] as const
type Tab = typeof TABS[number]

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const LEVEL_COLORS: Record<string, string> = {
  Expert:       'bg-violet-100 text-violet-700',
  Advanced:     'bg-blue-100 text-blue-700',
  Intermediate: 'bg-green-100 text-green-700',
  Basic:        'bg-yellow-100 text-yellow-700',
  Novice:       'bg-slate-100 text-slate-600',
}

const LEVEL_BAR_COLORS: Record<string, string> = {
  Expert:       'bg-violet-500',
  Advanced:     'bg-blue-500',
  Intermediate: 'bg-green-500',
  Basic:        'bg-yellow-400',
  Novice:       'bg-slate-300',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

function RatingBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-slate-600 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-xs text-slate-500 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

function StatusBadge({ configured, connected }: { configured: boolean; connected: boolean }) {
  if (!configured) return (
    <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
      <AlertCircle className="w-3.5 h-3.5" /> Not Configured
    </span>
  )
  if (connected) return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
      <AlertCircle className="w-3.5 h-3.5" /> Connection Failed
    </span>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ status }: { status: DegreedStatus | null }) {
  const [insights, setInsights] = useState<TeamSkillInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo: use placeholder user IDs — in production these come from employee records
  const demoUserIds = ['user-1', 'user-2', 'user-3']

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<TeamSkillInsight>('/api/v1/degreed/team/insights', {
        method: 'POST',
        body: JSON.stringify({ user_ids: demoUserIds }),
      })
      setInsights(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  if (!status?.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Link2 className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-2">Degreed Not Connected</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          Configure your Degreed Client ID and Client Secret in Admin → Integrations → Degreed to start pulling skills data.
        </p>
        <Button size="sm" icon={<Settings className="w-3.5 h-3.5" />} onClick={() => window.location.href = '/admin'}>
          Go to Admin Settings
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Aggregated skill intelligence pulled directly from your Degreed LXP.
        </p>
        <Button size="sm" icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          onClick={fetchInsights} disabled={loading}>
          {loading ? 'Loading…' : 'Load Insights'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {insights && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Unique Skills', value: insights.total_unique_skills, icon: <Star className="w-4 h-4 text-violet-500" /> },
              { label: 'Team Members', value: insights.team_member_count, icon: <Users className="w-4 h-4 text-blue-500" /> },
              { label: 'Top-Rated Skill', value: insights.top_skills[0]?.name ?? '—', icon: <Award className="w-4 h-4 text-amber-500" /> },
            ].map(({ label, value, icon }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Top & Gap skills */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" /> Top Skills
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-2.5">
                {insights.top_skills.slice(0, 8).map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 truncate flex-1">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${(s.avg_rating / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{s.avg_rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-rose-500" /> Skill Gaps
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-2.5">
                {insights.gap_skills.slice(0, 8).map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 truncate flex-1">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(s.avg_rating / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{s.avg_rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill Ratings Tab
// ---------------------------------------------------------------------------

function SkillRatingsTab() {
  const [skillName, setSkillName] = useState('')
  const [breakdown, setBreakdown] = useState<SkillBreakdown | null>(null)
  const [allRatings, setAllRatings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllRatings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ count: number; data: any[] }>('/api/v1/degreed/team/skill-ratings')
      setAllRatings(data.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBreakdown = useCallback(async () => {
    if (!skillName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<SkillBreakdown>(
        `/api/v1/degreed/skills/${encodeURIComponent(skillName.trim())}/breakdown`
      )
      setBreakdown(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [skillName])

  const LEVELS = ['Expert', 'Advanced', 'Intermediate', 'Basic', 'Novice']

  return (
    <div className="space-y-6">
      {/* All ratings summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Skill Ratings</CardTitle>
        </CardHeader>
        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <Button size="sm" icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              onClick={fetchAllRatings} disabled={loading}>
              Fetch All Ratings
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {allRatings.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Skill</th>
                    <th className="text-left px-4 py-2.5">Level</th>
                    <th className="text-left px-4 py-2.5">User</th>
                    <th className="text-left px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allRatings.slice(0, 50).map((r, i) => {
                    const attrs = r.attributes ?? {}
                    const level = attrs['level-name'] ?? attrs.level ?? '—'
                    return (
                      <tr key={r.id ?? i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {attrs['skill-name'] ?? attrs['skill_name'] ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', LEVEL_COLORS[level] ?? 'bg-slate-100 text-slate-600')}>
                            {level}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{attrs['user-id'] ?? r.relationships?.user?.data?.id ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">
                          {attrs['date-updated'] ? new Date(attrs['date-updated']).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {allRatings.length > 50 && (
                <p className="text-xs text-slate-400 text-center py-2">Showing 50 of {allRatings.length} ratings</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Skill breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rating Level Breakdown by Skill</CardTitle>
        </CardHeader>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchBreakdown()}
                placeholder="Enter skill name (e.g. Python, Kubernetes)…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <Button size="sm" onClick={fetchBreakdown} disabled={loading || !skillName.trim()}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Look Up'}
            </Button>
          </div>

          {breakdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{breakdown.skill_name}</p>
                <span className="text-xs text-slate-500">{breakdown.total_ratings} ratings total</span>
              </div>
              {LEVELS.map(level => (
                <RatingBar
                  key={level}
                  label={level}
                  pct={breakdown.distribution[level] ?? 0}
                  color={LEVEL_BAR_COLORS[level]}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Assignments Tab
// ---------------------------------------------------------------------------

function AssignmentsTab() {
  const [data, setData] = useState<{ required_learning: any[]; skill_plans: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'required' | 'plans'>('required')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<{ required_learning: any[]; skill_plans: any[] }>('/api/v1/degreed/team/assignments')
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const items = data ? (view === 'required' ? data.required_learning : data.skill_plans) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['required', 'plans'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {v === 'required' ? `Required Learning (${data?.required_learning.length ?? 0})` : `Skill Plans (${data?.skill_plans.length ?? 0})`}
            </button>
          ))}
        </div>
        <Button size="sm" icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          onClick={fetch} disabled={loading}>
          {loading ? 'Loading…' : 'Fetch'}
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Due Date</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.slice(0, 50).map((item, i) => {
                const attrs = item.attributes ?? {}
                const title = attrs.title ?? attrs.name ?? attrs['content-title'] ?? '—'
                const dueDate = attrs['due-date'] ?? attrs.due_date
                const completed = attrs['completed-at'] ?? attrs['completion-date']
                return (
                  <tr key={item.id ?? i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700 max-w-xs truncate">{title}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {view === 'required' ? 'Required' : 'Skill Plan'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {dueDate ? new Date(dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {completed ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Pending</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length > 50 && (
            <p className="text-xs text-slate-400 text-center py-2">Showing 50 of {items.length}</p>
          )}
        </div>
      )}

      {data && items.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-10">No {view === 'required' ? 'required learning' : 'skill plans'} found.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// User Lookup Tab
// ---------------------------------------------------------------------------

function UserLookupTab() {
  const [userId, setUserId] = useState('')
  const [ratings, setRatings] = useState<SkillRating[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const lookup = useCallback(async () => {
    if (!userId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ ratings: SkillRating[] }>(
        `/api/v1/degreed/users/${encodeURIComponent(userId.trim())}/skill-ratings`
      )
      setRatings(data.ratings)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const filtered = ratings
    .filter(r => r.skill_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) =>
      sortDir === 'desc' ? b.level_value - a.level_value : a.level_value - b.level_value
    )

  return (
    <div className="space-y-4">
      {/* User ID input */}
      <Card>
        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-600">Enter a Degreed User ID to view their skill ratings breakdown.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="Degreed User ID (e.g. abc123…)"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button size="sm" onClick={lookup} disabled={loading || !userId.trim()}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Look Up'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Card>

      {/* Results */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{ratings.length} Skills Rated</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filter skills…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  {sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  Level
                </button>
              </div>
            </div>
          </CardHeader>
          <div className="p-4 space-y-2">
            {filtered.map((r) => (
              <div key={r.rating_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-700 flex-1 truncate">{r.skill_name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${(r.level_value / 5) * 100}%` }}
                    />
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', LEVEL_COLORS[r.level] ?? 'bg-slate-100 text-slate-600')}>
                    {r.level}
                  </span>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {r.rating_date ? new Date(r.rating_date).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No skills match your filter.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Team Skills Tab
// ---------------------------------------------------------------------------

function TeamSkillsTab() {
  const [skills, setSkills] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [focusSkills, setFocusSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFocus, setLoadingFocus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchAllSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ data: any[] }>('/api/v1/degreed/team/skills')
      setSkills(data.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFocusSkills = useCallback(async () => {
    if (!userId.trim()) return
    setLoadingFocus(true)
    try {
      const data = await apiFetch<{ data: any[] }>(
        `/api/v1/degreed/team/focus-skills?user_id=${encodeURIComponent(userId.trim())}`
      )
      setFocusSkills(data.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingFocus(false)
    }
  }, [userId])

  const filtered = skills.filter(s => {
    const name = s.attributes?.['skill-name'] ?? s.attributes?.name ?? ''
    return name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6">
      {/* All skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Organization User Skills</CardTitle>
            <Button size="sm" icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              onClick={fetchAllSkills} disabled={loading}>
              {loading ? 'Loading…' : 'Fetch Skills'}
            </Button>
          </div>
        </CardHeader>
        <div className="p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {skills.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filter by skill name…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Skill</th>
                      <th className="text-left px-4 py-2.5">User</th>
                      <th className="text-left px-4 py-2.5">Focus</th>
                      <th className="text-left px-4 py-2.5">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.slice(0, 50).map((s, i) => {
                      const attrs = s.attributes ?? {}
                      const name = attrs['skill-name'] ?? attrs.name ?? '—'
                      const isFocus = attrs.focus ?? false
                      const updated = attrs['date-updated']
                      return (
                        <tr key={s.id ?? i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{name}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{s.relationships?.user?.data?.id ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {isFocus && (
                              <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                <Star className="w-3 h-3" /> Focus
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {updated ? new Date(updated).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length > 50 && (
                  <p className="text-xs text-slate-400 text-center py-2">Showing 50 of {filtered.length}</p>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Focus skills for a user */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-violet-500" /> Focus Skills for User
          </CardTitle>
        </CardHeader>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchFocusSkills()}
              placeholder="Degreed User ID…"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button size="sm" onClick={fetchFocusSkills} disabled={loadingFocus || !userId.trim()}>
              {loadingFocus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Focus Skills'}
            </Button>
          </div>
          {focusSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {focusSkills.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 text-sm bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-full font-medium">
                  <Star className="w-3 h-3" />
                  {s.attributes?.['skill-name'] ?? s.attributes?.name ?? '—'}
                </span>
              ))}
            </div>
          ) : userId && !loadingFocus ? (
            <p className="text-sm text-slate-400">No focus skills found for this user.</p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DegreedPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [status, setStatus] = useState<DegreedStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any | null>(null)

  useEffect(() => {
    apiFetch<DegreedStatus>('/api/v1/degreed/status')
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false, message: 'Could not reach API' }))
  }, [])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await apiFetch<any>('/api/v1/degreed/sync', { method: 'POST' })
      setSyncResult(result)
    } catch (e: any) {
      setSyncResult({ error: e.message })
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Degreed Integration"
        subtitle="Live skills, ratings, and learning data from your Degreed LXP"
        actions={
          <div className="flex items-center gap-3">
            {status && <StatusBadge configured={status.configured} connected={status.connected} />}
            <Button
              size="sm"
              variant="secondary"
              icon={syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              onClick={triggerSync}
              disabled={syncing || !status?.connected}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Sync result */}
        {syncResult && (
          <div className={cn(
            'rounded-xl p-4 text-sm',
            syncResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
          )}>
            {syncResult.error ? (
              `Sync failed: ${syncResult.error}`
            ) : (
              <span>
                Sync complete — {syncResult.synced?.users} users, {syncResult.synced?.skill_ratings} ratings,{' '}
                {syncResult.synced?.assignments} assignments, {syncResult.synced?.organization_skills} skills synced.
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Overview' && <OverviewTab status={status} />}
        {activeTab === 'Team Skills' && <TeamSkillsTab />}
        {activeTab === 'Skill Ratings' && <SkillRatingsTab />}
        {activeTab === 'Assignments' && <AssignmentsTab />}
        {activeTab === 'User Lookup' && <UserLookupTab />}
      </div>
    </div>
  )
}
