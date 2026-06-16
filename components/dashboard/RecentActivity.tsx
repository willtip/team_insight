import Avatar from '@/components/ui/Avatar'
import { Target, Award, BookOpen, AlertTriangle, Star, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITIES = [
  { id: 1, type: 'goal', employee: 'Sarah Chen', action: 'completed goal', detail: 'Reduce MTTR via AIOps Alert Correlation — MTTR down to 18 min', time: '2 hours ago', color: 'bg-green-100 text-green-600' },
  { id: 2, type: 'cert', employee: 'Zoe Martinez', action: 'earned certification', detail: 'CISM - Certified Information Security Manager', time: '1 day ago', color: 'bg-purple-100 text-purple-600' },
  { id: 3, type: 'risk', employee: 'Alex Chen', action: 'goal flagged at risk', detail: 'Resolve Ownership Conflict with NOC Team', time: '1 day ago', color: 'bg-amber-100 text-amber-600' },
  { id: 4, type: 'training', employee: 'Priya Patel', action: 'completed training', detail: 'Building Production RAG Applications — deeplearning.ai', time: '2 days ago', color: 'bg-blue-100 text-blue-600' },
  { id: 5, type: 'note', employee: 'Aisha Thompson', action: 'coaching note added', detail: 'Early L4 Promotion Track — exceptional growth', time: '3 days ago', color: 'bg-indigo-100 text-indigo-600' },
  { id: 6, type: 'goal', employee: 'David Kim', action: 'goal progress updated', detail: 'LLM Evaluation & Safety Framework — 90% complete', time: '3 days ago', color: 'bg-green-100 text-green-600' },
]

const ICONS = {
  goal: Target,
  cert: Award,
  training: BookOpen,
  risk: AlertTriangle,
  note: MessageSquare,
  default: Star,
}

export default function RecentActivity() {
  return (
    <div className="space-y-3">
      {ACTIVITIES.map(activity => {
        const Icon = ICONS[activity.type as keyof typeof ICONS] || ICONS.default
        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', activity.color)}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-800">
                <span className="font-semibold">{activity.employee}</span>
                {' '}{activity.action}
              </p>
              <p className="text-xs text-slate-500 truncate">{activity.detail}</p>
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{activity.time}</span>
          </div>
        )
      })}
    </div>
  )
}
