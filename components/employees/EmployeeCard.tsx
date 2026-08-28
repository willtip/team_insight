import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import ScoreRing from '@/components/ui/ScoreRing'
import { cn, promotionReadinessColor, scoreToColor, DEPTH_THRESHOLD } from '@/lib/utils'
import type { Employee } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus, Star, AlertCircle } from 'lucide-react'

interface EmployeeCardProps {
  employee: Employee
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />
  return <Minus className="w-3 h-3 text-slate-400" />
}

export default function EmployeeCard({ employee }: EmployeeCardProps) {
  const goalCompletion = employee.goals.length > 0
    ? Math.round(employee.goals.filter(g => g.status === 'Completed').length / employee.goals.length * 100)
    : 0

  return (
    <Link href={`/employees/${employee.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={employee.name} size="md" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                {employee.name}
              </h3>
              <p className="text-xs text-slate-500">{employee.title}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-medium text-slate-400">{employee.level}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{employee.location.split(',')[1]?.trim() ?? employee.location}</span>
              </div>
            </div>
          </div>
          <ScoreRing score={employee.performanceScore.overall} size="sm" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', promotionReadinessColor(employee.promotionReadiness))}>
            {employee.promotionReadiness}
          </span>
          {employee.isHighPotential && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 flex items-center gap-1">
              <Star className="w-2.5 h-2.5" />
              HiPo
            </span>
          )}
          {employee.needsCoaching && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              Coaching
            </span>
          )}
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {employee.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
              {tag}
            </span>
          ))}
        </div>

        {/* Goal progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Goal Completion</span>
            <div className="flex items-center gap-1">
              <TrendIcon trend={employee.performanceScore.trend} />
              <span className={cn('font-medium', scoreToColor(goalCompletion))}>{goalCompletion}%</span>
            </div>
          </div>
          <Progress value={goalCompletion} color="auto" />
        </div>

        {/* Score breakdown */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-800">{employee.performanceScore.growthScore}</p>
            <p className="text-[10px] text-slate-400">Growth</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-xs font-bold text-slate-800">{employee.performanceScore.leadershipReadiness}</p>
            <p className="text-[10px] text-slate-400">Leadership</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-800">
              {employee.skills.filter(s => (s.reviewerRating ?? s.selfRating ?? 0) >= DEPTH_THRESHOLD).length}
            </p>
            <p className="text-[10px] text-slate-400">Depth Skills</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
