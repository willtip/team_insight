import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { promotionReadinessColor } from '@/lib/utils'
import { Flame, Clock } from 'lucide-react'
import type { Employee } from '@/lib/types'

const PIPELINE_STAGES = [
  { key: 'Ready Now', label: 'Ready Now', icon: Flame, color: 'text-green-600' },
  { key: 'Ready in 6 Months', label: '6 Months', icon: Clock, color: 'text-blue-600' },
  { key: 'Ready in 12 Months', label: '12 Months', icon: Clock, color: 'text-amber-600' },
] as const

interface Props {
  employees: Employee[]
}

export default function PromotionPipeline({ employees }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PIPELINE_STAGES.map(({ key, label, icon: Icon, color }) => {
        const candidates = employees.filter(e => e.promotionReadiness === key)
        return (
          <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{label}</span>
              <span className="ml-auto text-xs font-bold text-slate-700">{candidates.length}</span>
            </div>
            <div className="space-y-2">
              {candidates.map(emp => (
                <Link key={emp.id} href={`/employees/${emp.id}`} className="flex items-center gap-2 group">
                  <Avatar name={emp.name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate group-hover:text-brand-600">
                      {emp.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{emp.level}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{emp.performanceScore.promotionReadiness}</span>
                </Link>
              ))}
              {candidates.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">None</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
