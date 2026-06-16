'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import type { ProjectContribution } from '@/lib/types'

interface ContributionRadarProps {
  contributions: ProjectContribution[]
}

export default function ContributionRadar({ contributions }: ContributionRadarProps) {
  if (!contributions.length) return (
    <div className="flex items-center justify-center h-40 text-sm text-slate-400">
      No contributions recorded
    </div>
  )

  const avg = (key: keyof ProjectContribution) => {
    const values = contributions.map(c => Number(c[key]) || 0)
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  }

  const data = [
    { dimension: 'Leadership', value: avg('leadershipScore') },
    { dimension: 'Collaboration', value: avg('collaborationScore') },
    { dimension: 'Innovation', value: avg('innovationScore') },
    { dimension: 'Business', value: 4 },
    { dimension: 'Technical', value: 4.5 },
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#64748b' }} />
        <Radar
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
