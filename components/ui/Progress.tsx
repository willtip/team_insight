import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
  size?: 'sm' | 'md'
  color?: 'blue' | 'green' | 'amber' | 'red' | 'auto'
  showLabel?: boolean
  label?: string
}

function autoColor(value: number): string {
  if (value >= 80) return 'bg-green-500'
  if (value >= 60) return 'bg-blue-500'
  if (value >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function Progress({ value, className, size = 'sm', color = 'blue', showLabel = false, label }: ProgressProps) {
  const barColor = color === 'auto'
    ? autoColor(value)
    : {
        blue: 'bg-brand-500',
        green: 'bg-green-500',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
      }[color]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-1 bg-slate-100 rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2.5'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 min-w-[32px] text-right">
          {label ?? `${value}%`}
        </span>
      )}
    </div>
  )
}
