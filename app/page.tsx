'use client'

import Header from '@/components/layout/Header'
import StatCard from '@/components/dashboard/StatCard'
import PromotionPipeline from '@/components/dashboard/PromotionPipeline'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card'
import GoalTrendChart from '@/components/charts/GoalTrendChart'
import PerformanceDistribution from '@/components/charts/PerformanceDistribution'
import SkillsHeatmap from '@/components/charts/SkillsHeatmap'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { TEAM_METRICS, AI_INSIGHTS } from '@/lib/mock-data'
import { useEmployees } from '@/lib/employee-store'
import { useSkillCatalog } from '@/lib/skill-catalog-store'
import { cn, scoreToColor } from '@/lib/utils'
import {
  Users, Heart, Target, TrendingUp, Award, AlertCircle,
  Briefcase, BookOpen, BrainCircuit, ArrowRight,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const { employees } = useEmployees()
  const { catalog } = useSkillCatalog()
  const urgentInsight = AI_INSIGHTS.find(i => i.severity === 'critical')
  const topEmployees = [...employees].sort((a, b) => b.performanceScore.overall - a.performanceScore.overall).slice(0, 3)

  const teamMetrics = {
    ...TEAM_METRICS,
    totalMembers: employees.length,
    promotionReadyCount: employees.filter(e => e.promotionReadiness === 'Ready Now' || e.promotionReadiness === 'Ready in 6 Months').length,
    needsCoachingCount: employees.filter(e => e.needsCoaching).length,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Team Dashboard"
        subtitle="Automation Solution Engineering (ASE) · Q2 2026 · 10 Engineers"
        actions={
          <Button size="sm" icon={<BrainCircuit className="w-3.5 h-3.5" />}>
            <Link href="/insights">AI Analysis</Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Urgent AI alert */}
        {urgentInsight && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">{urgentInsight.title}</p>
              <p className="text-xs text-red-600 mt-0.5">{urgentInsight.summary}</p>
            </div>
            <Link href="/insights">
              <Button size="sm" variant="danger" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                View
              </Button>
            </Link>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Team Members"
            value={teamMetrics.totalMembers}
            subtitle="ASE · Global Infrastructure"
            icon={<Users className="w-5 h-5 text-brand-600" />}
            iconBg="bg-brand-50"
            trend={{ value: '+1 this Q', direction: 'up' }}
          />
          <StatCard
            title="Team Health Score"
            value={`${teamMetrics.teamHealthScore}/100`}
            subtitle="Composite score"
            icon={<Heart className="w-5 h-5 text-rose-500" />}
            iconBg="bg-rose-50"
            trend={{ value: '+4 pts', direction: 'up' }}
            highlight
          />
          <StatCard
            title="Goal Completion"
            value={`${teamMetrics.goalCompletionRate}%`}
            subtitle="This quarter"
            icon={<Target className="w-5 h-5 text-green-600" />}
            iconBg="bg-green-50"
            trend={{ value: '+12% vs Q1', direction: 'up' }}
          />
          <StatCard
            title="Skills Growth"
            value={`${teamMetrics.skillsGrowthScore}/100`}
            subtitle="Team-wide average"
            icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
            iconBg="bg-indigo-50"
            trend={{ value: '+8 pts YoY', direction: 'up' }}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Promotion Ready"
            value={teamMetrics.promotionReadyCount}
            subtitle="Ready now or 6 months"
            icon={<Award className="w-5 h-5 text-amber-500" />}
            iconBg="bg-amber-50"
          />
          <StatCard
            title="Needs Coaching"
            value={teamMetrics.needsCoachingCount}
            subtitle="Active coaching plans"
            icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
            iconBg="bg-orange-50"
            trend={{ value: 'Action needed', direction: 'stable', positive: false }}
          />
          <StatCard
            title="Active Projects"
            value={teamMetrics.activeProjects}
            subtitle="Cross-team initiatives"
            icon={<Briefcase className="w-5 h-5 text-teal-600" />}
            iconBg="bg-teal-50"
          />
          <StatCard
            title="Trainings Done"
            value={teamMetrics.completedTrainings}
            subtitle="In 2026"
            icon={<BookOpen className="w-5 h-5 text-violet-600" />}
            iconBg="bg-violet-50"
            trend={{ value: '+6 this Q', direction: 'up' }}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              actions={
                <Link href="/goals" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              }
            >
              <CardTitle>Goal Completion Trends</CardTitle>
              <CardSubtitle>Goals by status — Jan to Jun 2026</CardSubtitle>
            </CardHeader>
            <GoalTrendChart />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Distribution</CardTitle>
              <CardSubtitle>Engineers by overall score range</CardSubtitle>
            </CardHeader>
            <div className="mb-2">
              <PerformanceDistribution />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Outstanding', color: 'bg-green-500', count: 2 },
                { label: 'Exceeds', color: 'bg-blue-500', count: 3 },
                { label: 'Meets', color: 'bg-indigo-500', count: 3 },
                { label: 'Developing', color: 'bg-amber-500', count: 2 },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', color)} />
                  <span className="text-xs text-slate-500">{label} ({count})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" padding="md">
            <CardHeader
              actions={
                <Link href="/skills" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  Full matrix <ChevronRight className="w-3 h-3" />
                </Link>
              }
            >
              <CardTitle>Skills Coverage Matrix</CardTitle>
              <CardSubtitle>
                Critical platform skills, rated 0-5 — open the full matrix for all domains
              </CardSubtitle>
            </CardHeader>
            <div className="overflow-x-auto">
              {/* Summary card: the critical head of the catalog, not all 69 rows. */}
              <SkillsHeatmap employees={employees} catalog={catalog} compact criticalOnly maxSkills={12} />
            </div>
          </Card>

          <div className="space-y-4">
            <Card padding="md">
              <CardHeader
                actions={
                  <Link href="/insights">
                    <Button size="sm" variant="ghost" icon={<BrainCircuit className="w-3.5 h-3.5 text-brand-500" />}>
                      View all
                    </Button>
                  </Link>
                }
              >
                <CardTitle>AI Insights</CardTitle>
                <CardSubtitle>{AI_INSIGHTS.length} active insights</CardSubtitle>
              </CardHeader>
              <div className="space-y-2">
                {AI_INSIGHTS.slice(0, 3).map(insight => (
                  <Link key={insight.id} href="/insights">
                    <div className={cn(
                      'p-2.5 rounded-lg border text-xs cursor-pointer hover:shadow-sm transition-all',
                      insight.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      insight.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                      insight.severity === 'success' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    )}>
                      <p className="font-semibold text-slate-800 leading-tight">{insight.title}</p>
                      <p className={cn(
                        'text-xs mt-0.5 line-clamp-2',
                        insight.severity === 'critical' ? 'text-red-600' :
                        insight.severity === 'warning' ? 'text-amber-700' :
                        insight.severity === 'success' ? 'text-green-700' :
                        'text-blue-700'
                      )}>
                        {insight.summary}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Promotion pipeline and recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              actions={
                <Link href="/employees" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  Team roster <ChevronRight className="w-3 h-3" />
                </Link>
              }
            >
              <CardTitle>Promotion Pipeline</CardTitle>
              <CardSubtitle>Readiness distribution across team</CardSubtitle>
            </CardHeader>
            <PromotionPipeline employees={employees} />

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2">Top Performers</p>
              <div className="space-y-2">
                {topEmployees.map((emp, i) => (
                  <Link key={emp.id} href={`/employees/${emp.id}`}>
                    <div className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                      <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                      <Avatar name={emp.name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.title}</p>
                      </div>
                      <span className={cn('text-xs font-bold', scoreToColor(emp.performanceScore.overall))}>
                        {emp.performanceScore.overall}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardSubtitle>Team updates from the last 7 days</CardSubtitle>
            </CardHeader>
            <RecentActivity />
          </Card>
        </div>
      </div>
    </div>
  )
}
