'use client'

import { cn } from '@/lib/utils'
import type { Employee } from '@/lib/types'

const SKILLS = [
  'AIOps', 'GenAI/LLMs', 'MLOps', 'Python', 'Ansible',
  'Terraform', 'Kubernetes', 'CI/CD', 'Observability', 'ServiceNow',
  'TypeScript', 'Security',
]

const LEVEL_LABELS = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Expert']
const LEVEL_COLORS = [
  'bg-slate-100 text-slate-400',
  'bg-blue-100 text-blue-600',
  'bg-blue-300 text-blue-800',
  'bg-blue-500 text-white',
  'bg-blue-700 text-white',
]

function getSkillLevel(employee: Employee, skillName: string): number {
  const skill = employee.skills.find(s => s.name === skillName)
  return skill ? skill.score : 0
}

interface SkillsHeatmapProps {
  employees: Employee[]
  compact?: boolean
  filterCategory?: string
}

export default function SkillsHeatmap({ employees, compact = false, filterCategory }: SkillsHeatmapProps) {
  const skills = filterCategory
    ? SKILLS.filter(s => {
        const skill = employees[0]?.skills.find(sk => sk.name === s)
        return !filterCategory || skill?.category === filterCategory
      })
    : SKILLS

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header row */}
        <div className="flex items-center gap-1 mb-1">
          <div className={cn('flex-shrink-0 text-xs text-slate-400', compact ? 'w-20' : 'w-28')} />
          {employees.map(emp => (
            <div
              key={emp.id}
              className={cn('text-center text-xs font-medium text-slate-600 truncate', compact ? 'w-8' : 'w-14')}
              title={emp.name}
            >
              {emp.name.split(' ')[0]}
            </div>
          ))}
        </div>

        {/* Skill rows */}
        {skills.map(skill => (
          <div key={skill} className="flex items-center gap-1 mb-0.5">
            <div
              className={cn('flex-shrink-0 text-xs text-slate-600 font-medium truncate', compact ? 'w-20' : 'w-28')}
              title={skill}
            >
              {skill}
            </div>
            {employees.map(emp => {
              const level = getSkillLevel(emp, skill)
              return (
                <div
                  key={emp.id}
                  className={cn(
                    'rounded flex items-center justify-center text-xs font-medium cursor-default transition-all hover:ring-2 hover:ring-blue-400 hover:ring-offset-1',
                    compact ? 'w-8 h-8' : 'w-14 h-8',
                    LEVEL_COLORS[level]
                  )}
                  title={`${emp.name} – ${skill}: ${LEVEL_LABELS[level]}`}
                >
                  {!compact && (level > 0 ? LEVEL_LABELS[level].slice(0, 3) : '–')}
                  {compact && (level > 0 ? level : '–')}
                </div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-slate-400">Level:</span>
          {LEVEL_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn('w-5 h-5 rounded text-xs flex items-center justify-center font-medium', LEVEL_COLORS[i])}>
                {i}
              </div>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
