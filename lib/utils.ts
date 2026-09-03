import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PROFICIENCY_LABELS } from './types'
import type {
  ProficiencyLevel, SkillLevel, SkillPriority,
  GoalStatus, GoalPriority, PromotionReadiness,
} from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Every selectable rung, for level pickers. */
export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [0, 1, 2, 3, 4, 5]

/**
 * Fallback thresholds for surfaces with no access to the catalog store.
 * The configurable values live in `SkillThresholds` on the catalog store —
 * prefer those anywhere the store is reachable.
 */
export const COVERAGE_THRESHOLD: ProficiencyLevel = 3
export const DEPTH_THRESHOLD: ProficiencyLevel = 4
export const BREADTH_THRESHOLD: ProficiencyLevel = 2

export function proficiencyLabel(level: ProficiencyLevel | undefined): SkillLevel {
  return PROFICIENCY_LABELS[clampLevel(level ?? 0)]
}

/** Compact label for dense grids and heat-map cells. */
export function proficiencyShortLabel(level: ProficiencyLevel | undefined): string {
  return ['—', 'Aware', 'Guided', 'Indep.', 'Lead', 'Strat.'][clampLevel(level ?? 0)]
}

export function clampLevel(n: number): ProficiencyLevel {
  const i = Math.max(0, Math.min(5, Math.round(n)))
  return i as ProficiencyLevel
}

/**
 * Coerce a rating from any source into the 0-5 scale.
 * Accepts numbers, numeric strings, the current anchor labels, and the legacy
 * four-adjective scale (so spreadsheet imports and old localStorage both work).
 */
export function parseProficiency(input: unknown): ProficiencyLevel | undefined {
  if (input === null || input === undefined || input === '') return undefined
  if (typeof input === 'number' && Number.isFinite(input)) return clampLevel(input)

  const raw = String(input).trim()
  if (raw === '') return undefined
  if (/^-?\d+(\.\d+)?$/.test(raw)) return clampLevel(Number(raw))

  const key = raw.toLowerCase()
  const anchor = PROFICIENCY_LABELS.findIndex(l => l.toLowerCase() === key)
  if (anchor >= 0) return anchor as ProficiencyLevel

  const legacy: Record<string, ProficiencyLevel> = {
    none: 0, 'not exposed': 0,
    beginner: 1, novice: 1, aware: 1,
    intermediate: 2, basic: 2, guided: 2, 'guided practitioner': 2,
    advanced: 3, independent: 3, proficient: 3,
    expert: 4, lead: 4, 'advanced/lead': 4,
    strategic: 5, 'strategic expert': 5,
  }
  return legacy[key]
}

export function skillLevelColor(level: ProficiencyLevel | undefined): string {
  const map = [
    'bg-slate-100 text-slate-500',
    'bg-sky-100 text-sky-700',
    'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700',
    'bg-purple-200 text-purple-800',
  ]
  return map[clampLevel(level ?? 0)]
}

export function skillPriorityColor(priority: SkillPriority): string {
  const map: Record<SkillPriority, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-amber-100 text-amber-700',
    Low: 'bg-blue-100 text-blue-700',
    Maintain: 'bg-green-100 text-green-700',
  }
  return map[priority]
}

export function goalStatusColor(status: GoalStatus): string {
  const map: Record<GoalStatus, string> = {
    'Not Started': 'bg-slate-100 text-slate-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'At Risk': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
    'Deferred': 'bg-gray-100 text-gray-500',
  }
  return map[status]
}

export function goalPriorityColor(priority: GoalPriority): string {
  const map: Record<GoalPriority, string> = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  }
  return map[priority]
}

export function promotionReadinessColor(readiness: PromotionReadiness): string {
  const map: Record<PromotionReadiness, string> = {
    'Ready Now': 'bg-green-100 text-green-700',
    'Ready in 6 Months': 'bg-blue-100 text-blue-700',
    'Ready in 12 Months': 'bg-amber-100 text-amber-700',
    'Development Needed': 'bg-red-100 text-red-700',
  }
  return map[readiness]
}

export function scoreToColor(score: number): string {
  if (score >= 85) return 'text-green-600'
  if (score >= 70) return 'text-blue-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-red-600'
}

export function scoreToBgColor(score: number): string {
  if (score >= 85) return 'bg-green-500'
  if (score >= 70) return 'bg-blue-500'
  if (score >= 55) return 'bg-amber-500'
  return 'bg-red-500'
}

export function heatmapColor(level: number): string {
  // level 0-5
  const colors = [
    'bg-slate-100',
    'bg-blue-100',
    'bg-blue-300',
    'bg-blue-500',
    'bg-blue-700',
    'bg-indigo-900',
  ]
  return colors[clampLevel(level)]
}

export function heatmapTextColor(level: number): string {
  return level >= 3 ? 'text-white' : 'text-slate-700'
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * "sarah.chen@acme.com" -> "Sarah Chen". Entra ID and the dev-login provider don't
 * always hand back a display name, so fall back to the address for the avatar.
 */
export function nameFromEmail(email?: string | null): string {
  if (!email) return ''
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

export function avatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-violet-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function calculateOverallScore(scores: {
  goalAchievement: number
  projectContributions: number
  professionalDevelopment: number
  leadershipBehaviors: number
  collaboration: number
  innovation: number
}): number {
  return Math.round(
    scores.goalAchievement * 0.30 +
    scores.projectContributions * 0.25 +
    scores.professionalDevelopment * 0.15 +
    scores.leadershipBehaviors * 0.15 +
    scores.collaboration * 0.10 +
    scores.innovation * 0.05
  )
}
