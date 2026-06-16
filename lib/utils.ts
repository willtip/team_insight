import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SkillLevel, GoalStatus, GoalPriority, PromotionReadiness } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function skillLevelToScore(level: SkillLevel): number {
  const map: Record<SkillLevel, number> = {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 3,
    Expert: 4,
  }
  return map[level]
}

export function scoreToSkillLevel(score: number): SkillLevel {
  if (score <= 1) return 'Beginner'
  if (score <= 2) return 'Intermediate'
  if (score <= 3) return 'Advanced'
  return 'Expert'
}

export function skillLevelColor(level: SkillLevel): string {
  const map: Record<SkillLevel, string> = {
    Beginner: 'bg-slate-200 text-slate-700',
    Intermediate: 'bg-blue-100 text-blue-700',
    Advanced: 'bg-indigo-100 text-indigo-700',
    Expert: 'bg-purple-100 text-purple-700',
  }
  return map[level]
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
  // level 0-4
  const colors = [
    'bg-slate-100',
    'bg-blue-200',
    'bg-blue-400',
    'bg-blue-600',
    'bg-blue-800',
  ]
  return colors[Math.min(level, 4)]
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
