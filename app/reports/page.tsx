'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import ScoreRing from '@/components/ui/ScoreRing'
import Avatar from '@/components/ui/Avatar'
import { TEAM_METRICS } from '@/lib/mock-data'
import { useEmployees } from '@/lib/employee-store'
import { cn, scoreToColor, promotionReadinessColor, formatDate } from '@/lib/utils'
import {
  FileText, Download, Users, Target, TrendingUp, Shield,
  BarChart3, Award, BookOpen, Printer, Table, Presentation,
  ChevronRight, CheckCircle, AlertTriangle, Briefcase, Calendar
} from 'lucide-react'

const REPORT_TYPES = [
  {
    id: 'team-health',
    title: 'Team Health Report',
    description: 'Comprehensive overview of team performance, scores, and health indicators',
    icon: Users,
    category: 'Executive',
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    sections: ['Team Metrics', 'Performance Distribution', 'Goal Completion', 'Skills Overview'],
  },
  {
    id: 'goal-status',
    title: 'Goal Status Report',
    description: 'All goals across the team with status, progress, and at-risk flags',
    icon: Target,
    category: 'Manager',
    color: 'text-green-600',
    bg: 'bg-green-50',
    sections: ['Goal Summary', 'By Employee', 'At-Risk Goals', 'Completion Trends'],
  },
  {
    id: 'promotion-pipeline',
    title: 'Promotion Pipeline',
    description: 'Readiness assessment and promotion candidates with evidence',
    icon: TrendingUp,
    category: 'Executive',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    sections: ['Readiness Summary', 'Candidate Profiles', 'Evidence Matrix', 'Timeline'],
  },
  {
    id: 'skills-readiness',
    title: 'Skills Readiness Report',
    description: 'Team skill coverage, gaps, and upskilling investment recommendations',
    icon: BarChart3,
    category: 'Executive',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    sections: ['Skills Matrix', 'Gap Analysis', 'Upskilling Plan', 'Benchmarks'],
  },
  {
    id: 'coaching-summary',
    title: 'Coaching Summary',
    description: 'Active coaching situations, progress, and follow-up actions',
    icon: MessageSquare,
    category: 'Manager',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    sections: ['Coaching Overview', 'Individual Plans', 'Follow-Up Items'],
  },
  {
    id: 'succession-planning',
    title: 'Succession Plan',
    description: 'Key role coverage, bench strength, and leadership pipeline',
    icon: Shield,
    category: 'Executive',
    color: 'text-red-600',
    bg: 'bg-red-50',
    sections: ['Role Coverage', 'Key Person Risk', 'Leadership Bench', 'Development Paths'],
  },
]

import { MessageSquare } from 'lucide-react'

const FORMAT_OPTIONS = [
  { id: 'PDF', label: 'PDF', icon: FileText },
  { id: 'Excel', label: 'Excel', icon: Table },
  { id: 'PowerPoint', label: 'PowerPoint', icon: Presentation },
]

export default function ReportsPage() {
  const { employees: EMPLOYEES } = useEmployees()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState('PDF')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ reportId: string; format: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleGenerate = (reportId: string) => {
    setGenerating(true)
    setGenerated(null)
    const format = selectedFormat
    setTimeout(() => {
      setGenerating(false)
      setGenerated({ reportId, format })
    }, 1500)
  }

  const generateCSV = (reportId: string): string => {
    switch (reportId) {
      case 'team-health':
        return [
          ['Name', 'Level', 'Title', 'Department', 'Overall', 'Goals', 'Growth', 'Leadership', 'Promotion Readiness', 'Trend'].join(','),
          ...EMPLOYEES.map(e => [
            `"${e.name}"`, e.level, `"${e.title}"`, `"${e.department}"`,
            e.performanceScore.overall, e.performanceScore.goalAchievement,
            e.performanceScore.growthScore, e.performanceScore.leadershipReadiness,
            `"${e.promotionReadiness}"`, e.performanceScore.trend,
          ].join(',')),
        ].join('\n')

      case 'goal-status':
        return [
          ['Employee', 'Goal Title', 'Status', 'Priority', 'Category', 'Progress %', 'Due Date', 'Strategic Alignment'].join(','),
          ...EMPLOYEES.flatMap(e => e.goals.map(g => [
            `"${e.name}"`, `"${g.title}"`, `"${g.status}"`, g.priority,
            g.category, g.progress, g.dueDate, `"${g.strategicAlignment}"`,
          ].join(','))),
        ].join('\n')

      case 'promotion-pipeline':
        return [
          ['Name', 'Level', 'Title', 'Promotion Readiness', 'High Potential', 'Overall Score', 'Goal Achievement', 'Leadership Score'].join(','),
          ...EMPLOYEES
            .slice()
            .sort((a, b) => {
              const order = ['Ready Now', 'Ready in 6 Months', 'Ready in 12 Months', 'Development Needed']
              return order.indexOf(a.promotionReadiness) - order.indexOf(b.promotionReadiness)
            })
            .map(e => [
              `"${e.name}"`, e.level, `"${e.title}"`, `"${e.promotionReadiness}"`,
              e.isHighPotential ? 'Yes' : 'No',
              e.performanceScore.overall, e.performanceScore.goalAchievement,
              e.performanceScore.leadershipReadiness,
            ].join(',')),
        ].join('\n')

      case 'skills-readiness':
        return [
          ['Employee', 'Skill', 'Category', 'Current Level', 'Target Level', 'Score'].join(','),
          ...EMPLOYEES.flatMap(e => e.skills.map(s => [
            `"${e.name}"`, `"${s.name}"`, s.category, s.currentLevel, s.targetLevel, s.score,
          ].join(','))),
        ].join('\n')

      case 'coaching-summary':
        return [
          ['Employee', 'Note Title', 'Category', 'Date', 'Follow-Up Date', 'Author', 'Content'].join(','),
          ...EMPLOYEES.flatMap(e => e.notes.map(n => [
            `"${e.name}"`, `"${n.title}"`, `"${n.category}"`, n.createdAt.split('T')[0],
            n.followUpDate || '', `"${n.authorName}"`, `"${n.content.replace(/"/g, '""')}"`,
          ].join(','))),
        ].join('\n')

      case 'succession-planning':
        return [
          ['Name', 'Level', 'Title', 'Location', 'Promotion Readiness', 'High Potential', 'Needs Coaching', 'Skills Count', 'Overall Score'].join(','),
          ...EMPLOYEES
            .slice()
            .sort((a, b) => b.performanceScore.leadershipReadiness - a.performanceScore.leadershipReadiness)
            .map(e => [
              `"${e.name}"`, e.level, `"${e.title}"`, `"${e.location}"`,
              `"${e.promotionReadiness}"`,
              e.isHighPotential ? 'Yes' : 'No', e.needsCoaching ? 'Yes' : 'No',
              e.skills.length, e.performanceScore.overall,
            ].join(',')),
        ].join('\n')

      default:
        return ''
    }
  }

  const downloadReport = (reportId: string, format: string) => {
    const report = REPORT_TYPES.find(r => r.id === reportId)
    if (!report) return

    if (format === 'PDF') {
      const pw = window.open('', '_blank')
      if (!pw) { alert('Allow pop-ups to download PDF reports.'); return }
      const csv = generateCSV(reportId)
      const tableHTML = csv.split('\n').map((row, i) => {
        const cols = row.split(',').map(c => c.replace(/^"|"$/g, ''))
        const tag = i === 0 ? 'th' : 'td'
        return `<tr>${cols.map(c => `<${tag} style="${i === 0 ? 'background:#f8fafc;font-weight:600;color:#475569;' : 'color:#334155;'}">${c}</${tag}>`).join('')}</tr>`
      }).join('')
      pw.document.write(`<!DOCTYPE html><html><head><title>${report.title}</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1e293b;margin:0}
        h1{font-size:20px;margin-bottom:4px}.meta{font-size:11px;color:#64748b;margin-bottom:24px}
        table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}
        tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:24px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between}
        @media print{body{padding:20px}}</style>
        </head><body>
        <h1>${report.title}</h1>
        <div class="meta">Automation Solution Engineering · Q2 2026 · Prepared by William Tipton · ${new Date().toLocaleDateString()}</div>
        <table>${tableHTML}</table>
        <div class="footer"><span>Team Insight AI · Automation Solution Engineering · Confidential</span><span>Generated ${new Date().toLocaleDateString()}</span></div>
        <script>window.onload=()=>{window.print()}</script>
        </body></html>`)
      pw.document.close()
      return
    }

    // Excel / PowerPoint → CSV download
    const csv = generateCSV(reportId)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.replace(/\s+/g, '-')}-Q2-2026.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const promotionCandidates = EMPLOYEES.filter(e =>
    e.promotionReadiness === 'Ready Now' || e.promotionReadiness === 'Ready in 6 Months'
  )

  const atRiskGoals = EMPLOYEES.flatMap(e =>
    e.goals.filter(g => g.status === 'At Risk').map(g => ({ ...g, employeeName: e.name }))
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Reports & Analytics"
        subtitle="Generate manager and executive reports for Automation Solution Engineering (ASE)"
        actions={
          <Button size="sm" variant="secondary" icon={<Printer className="w-3.5 h-3.5" />}>
            Print View
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Report templates grid */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map(report => {
              const Icon = report.icon
              const isSelected = selectedReport === report.id
              const isGenerated = generated?.reportId === report.id
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(isSelected ? null : report.id)}
                  className={cn(
                    'bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-card-hover',
                    isSelected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('p-2 rounded-lg', report.bg)}>
                      <Icon className={cn('w-5 h-5', report.color)} />
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      report.category === 'Executive' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {report.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{report.title}</h3>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{report.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {report.sections.slice(0, 3).map(section => (
                      <span key={section} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {section}
                      </span>
                    ))}
                    {report.sections.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                        +{report.sections.length - 3} more
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="space-y-2">
                      {/* Format selection */}
                      <div className="flex gap-1">
                        {FORMAT_OPTIONS.map(({ id, label, icon: FIcon }) => (
                          <button
                            key={id}
                            onClick={e => { e.stopPropagation(); setSelectedFormat(id) }}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center',
                              selectedFormat === id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                          >
                            <FIcon className="w-3 h-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={e => { e.stopPropagation(); handleGenerate(report.id) }}
                        loading={generating && selectedReport === report.id}
                        icon={<Download className="w-3.5 h-3.5" />}
                        className="w-full justify-center"
                        size="sm"
                      >
                        Generate {selectedFormat}
                      </Button>
                      {isGenerated && (
                        <button
                          onClick={e => { e.stopPropagation(); downloadReport(report.id, generated!.format) }}
                          className="flex items-center gap-2 text-xs text-green-600 font-medium hover:text-green-700 hover:underline w-full"
                        >
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Report ready — click to download
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Live preview: Team Health */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Live Report Preview — Team Health Q2 2026</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Report header */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-200 mb-5">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Automation Solution Engineering (ASE) · Q2 2026</p>
                <h3 className="text-xl font-bold text-slate-900">Team Health & Performance Report</h3>
                <p className="text-xs text-slate-500 mt-1" suppressHydrationWarning>Prepared by William Tipton, Director of AIOps, Automation Solution Engineering · {formatDate(new Date().toISOString())}</p>
              </div>
              <div className="flex items-center gap-4">
                <ScoreRing score={TEAM_METRICS.teamHealthScore} size="lg" label="Team Health" />
              </div>
            </div>

            {/* Executive summary */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Engineers', value: TEAM_METRICS.totalMembers, subtext: 'ASE · Global Infrastructure' },
                { label: 'Goal Completion', value: `${TEAM_METRICS.goalCompletionRate}%`, subtext: '+12% vs Q1' },
                { label: 'Promotion Ready', value: `${promotionCandidates.length}`, subtext: 'Ready now or 6mo' },
                { label: 'Skills Growth', value: `${TEAM_METRICS.skillsGrowthScore}/100`, subtext: 'Team average' },
              ].map(({ label, value, subtext }) => (
                <div key={label} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
                  <p className="text-[10px] text-slate-400">{subtext}</p>
                </div>
              ))}
            </div>

            {/* Performance table */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">Individual Performance Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-500 font-semibold">Engineer</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Level</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Overall</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Goals</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Growth</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Promotion</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mounted && [...EMPLOYEES].sort((a, b) => b.performanceScore.overall - a.performanceScore.overall).map(emp => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={emp.name} size="xs" />
                            <div>
                              <p className="font-medium text-slate-800">{emp.name}</p>
                              <p className="text-[10px] text-slate-400">{emp.title.replace('Software Engineer', 'SWE')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-2.5 px-3 font-medium text-slate-600">{emp.level}</td>
                        <td className="text-center py-2.5 px-3">
                          <span className={cn('font-bold', scoreToColor(emp.performanceScore.overall))}>
                            {emp.performanceScore.overall}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3 text-slate-600">{emp.performanceScore.goalAchievement}</td>
                        <td className="text-center py-2.5 px-3 text-slate-600">{emp.performanceScore.growthScore}</td>
                        <td className="text-center py-2.5 px-3">
                          <span className={cn('px-1.5 py-0.5 rounded-full font-medium text-[10px]', promotionReadinessColor(emp.promotionReadiness))}>
                            {emp.promotionReadiness === 'Development Needed' ? 'Dev Needed' :
                             emp.promotionReadiness === 'Ready in 12 Months' ? 'Ready 12mo' :
                             emp.promotionReadiness === 'Ready in 6 Months' ? 'Ready 6mo' : 'Ready Now'}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className={cn(
                            'text-xs font-bold',
                            emp.performanceScore.trend === 'up' ? 'text-green-600' :
                            emp.performanceScore.trend === 'down' ? 'text-red-600' : 'text-slate-400'
                          )}>
                            {emp.performanceScore.trend === 'up' ? '↑' : emp.performanceScore.trend === 'down' ? '↓' : '→'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* At-risk items — mounted guard prevents SSR/client order mismatch */}
            {mounted && atRiskGoals.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-semibold text-amber-800">Goals Requiring Attention ({atRiskGoals.length})</h4>
                </div>
                {atRiskGoals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-2 text-xs text-amber-700 mt-1">
                    <span className="font-medium">{goal.employeeName}:</span>
                    <span>{goal.title}</span>
                    <span className="text-amber-500">· Due {formatDate(goal.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between text-[10px] text-slate-400 pt-4 border-t border-slate-200">
              <span>Team Insight AI · Automation Solution Engineering · Confidential</span>
              <span suppressHydrationWarning>Generated {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
