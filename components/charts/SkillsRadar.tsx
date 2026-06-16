'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { Employee } from '@/lib/types'

interface SkillsRadarProps {
  employee: Employee
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-2 text-xs">
      <p className="font-semibold text-slate-800">{d.skill}</p>
      <p className="text-slate-600">Level: {d.score} / 4</p>
    </div>
  )
}

export default function SkillsRadar({ employee }: SkillsRadarProps) {
  const data = employee.skills.slice(0, 8).map(s => ({
    skill: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
    score: s.score,
    fullName: s.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fontSize: 10, fill: '#64748b' }}
        />
        <Radar
          name="Current"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6' }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
