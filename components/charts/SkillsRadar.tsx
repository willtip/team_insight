'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { AAP_SKILL_CATALOG } from '@/lib/skill-catalog'
import type { SkillDefinition } from '@/lib/skill-catalog'
import { resolveEmployeeSkills } from '@/lib/skill-analytics'
import type { Employee } from '@/lib/types'

interface SkillsRadarProps {
  employee: Employee
  catalog?: SkillDefinition[]
}

/** Short axis labels — full domain names are far too long for a radar. */
const SHORT: Record<string, string> = {
  'AAP platform engineering': 'AAP',
  'Software engineering': 'Software',
  'Platform engineering and DevOps': 'Platform',
  'Enterprise integration': 'Integration',
  'AI and agentic automation': 'AI',
  'Reliability engineering': 'Reliability',
  'Security and governance': 'Security',
  'Product and leadership': 'Product',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-2 text-xs">
      <p className="font-semibold text-slate-800">{d.fullName}</p>
      <p className="text-slate-600">Average level: {d.score} / 5</p>
      <p className="text-slate-400">Target: {d.target} · {d.rated} of {d.total} rated</p>
    </div>
  )
}

/**
 * Domain-level capability rather than an arbitrary first-eight-skills slice —
 * with the domain's target average overlaid so the shortfall is visible.
 */
export default function SkillsRadar({ employee, catalog = AAP_SKILL_CATALOG }: SkillsRadarProps) {
  // Memoised: a fresh array identity on every render restarts recharts'
  // enter animation, which leaves the polygon stuck collapsed at the centre.
  const data = useMemo(() => {
    const byDomain = new Map<string, { sum: number; rated: number; target: number; total: number }>()
    for (const r of resolveEmployeeSkills(employee, catalog)) {
      const d = byDomain.get(r.definition.domain) ?? { sum: 0, rated: 0, target: 0, total: 0 }
      d.total++
      d.target += r.target
      if (r.final !== undefined) { d.sum += r.final; d.rated++ }
      byDomain.set(r.definition.domain, d)
    }
    return Array.from(byDomain.entries()).map(([domain, d]) => ({
      axis: SHORT[domain] ?? domain.split(' ')[0],
      fullName: domain,
      score: d.rated ? Math.round((d.sum / d.rated) * 10) / 10 : 0,
      target: d.total ? Math.round((d.target / d.total) * 10) / 10 : 0,
      rated: d.rated,
      total: d.total,
    }))
  }, [employee, catalog])

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-xs text-slate-400">No skills in the catalog.</p>
      </div>
    )
  }

  return (
    <>
      {/* ResponsiveContainer clones a *single* element child to inject the
          measured width/height — never give it a comment or a second child. */}
      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#64748b' }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 9, fill: '#cbd5e1' }}
            axisLine={false}
          />
          <Radar
            name="Target"
            dataKey="target"
            stroke="#cbd5e1"
            fill="#cbd5e1"
            fillOpacity={0.12}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
          <Radar
            name="Current"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            isAnimationActive={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      {/* Rendered outside the chart: a recharts <Legend> inside RadarChart
          mis-measures and collapses the plot radius to zero. */}
      <div className="flex items-center justify-center gap-4 -mt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-3 h-0.5 rounded-full bg-brand-500" />Current
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-3 border-t border-dashed border-slate-400" />Target
        </span>
      </div>
    </>
  )
}
