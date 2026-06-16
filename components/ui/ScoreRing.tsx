'use client'

import { cn } from '@/lib/utils'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

function scoreToStroke(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#3b82f6'
  if (score >= 55) return '#f59e0b'
  return '#ef4444'
}

export default function ScoreRing({ score, size = 'md', label, className }: ScoreRingProps) {
  const dimensions = { sm: 56, md: 80, lg: 100 }[size]
  const stroke = { sm: 5, md: 7, lg: 8 }[size]
  const fontSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size]

  const radius = (dimensions - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreToStroke(score)

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg width={dimensions} height={dimensions} className="-rotate-90">
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={stroke}
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold text-slate-900', fontSize)}>{score}</span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  )
}
