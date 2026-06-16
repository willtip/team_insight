import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconBg?: string
  trend?: { value: string; direction: 'up' | 'down' | 'stable'; positive?: boolean }
  highlight?: boolean
  className?: string
}

export default function StatCard({ title, value, subtitle, icon, iconBg = 'bg-brand-50', trend, highlight, className }: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus

  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-3',
      highlight && 'border-brand-200 ring-1 ring-brand-100',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.positive === false
              ? trend.direction === 'up' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              : trend.direction === 'up' ? 'bg-green-50 text-green-600' : trend.direction === 'down' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
          )}>
            <TrendIcon className="w-3 h-3" />
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
