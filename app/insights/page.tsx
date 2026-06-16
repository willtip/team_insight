'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Progress from '@/components/ui/Progress'
import { AI_INSIGHTS } from '@/lib/mock-data'
import { useEmployees } from '@/lib/employee-store'
import { cn, promotionReadinessColor, scoreToColor } from '@/lib/utils'
import {
  BrainCircuit, Send, Sparkles, AlertCircle, CheckCircle,
  Info, AlertTriangle, ChevronRight, RefreshCw, Flame,
  TrendingUp, Users, Target, MessageSquare, Zap
} from 'lucide-react'
import type { AIMessage } from '@/lib/types'

const QUICK_PROMPTS = [
  'Who needs coaching right now?',
  'Who is ready for promotion?',
  'What skills gaps exist on my team?',
  'Which goals are at risk?',
  'Who has the highest leadership potential?',
  'Who should lead the next major initiative?',
  'Give me a team health summary',
  'Which engineers should I recognize this month?',
]

const CANNED_RESPONSES: Record<string, string> = {
  'Who needs coaching right now?': `Based on current performance data, **2 engineers need coaching focus**:

**1. Alex Chen (Senior AI Solutions Engineer)** — Most urgent
• Collaboration score dropped from 74 → 55 over 6 months
• Unilateral ServiceNow AI changes caused a production incident (200 misrouted P2 tickets)
• Active territorial conflict with NOC team lead — 3 leads have escalated
• **Action:** Facilitate mediation session June 18. Enforce change management approval gates. Create 90-day behavioral improvement plan.

**2. Ryan O'Brien (Staff Automation Architect)** — Career path coaching
• 8 years at L6 with declining performance trend (70 overall, down)
• ASE 3-Year AI Automation Roadmap goal at risk (45% progress, due Jul 31)
• Evaluating EM vs Principal IC path — needs structured support and clarity
• **Action:** Schedule EM shadow program. Weekly 1:1s with explicit milestones. Joint 1:1 with skip-level to discuss options.

*Additionally, Marcus Johnson's telemetry pipeline P95 latency goal is at risk (due Jun 30) — needs technical unblocking via pairing with Sarah Chen.*`,

  'Who is ready for promotion?': `Analyzing goal achievement, contributions, leadership behaviors, and coaching notes — **2 engineers show strong promotion signals**:

**Sarah Chen (Staff AI/Automation Engineer → Principal)** — Ready in ~6 months
• Overall score: 92/100 | Promotion Readiness: 88
• Delivered AI Incident Correlation Engine: MTTR halved (42min → 18min), $3.1M annual impact
• Aligned 4 Global Infrastructure teams on shared data model — Principal-level influence
• Mentoring Aisha Thompson; AIOps World 2025 speaker
• **Gap:** Needs 1-2 more cross-org architecture opportunities before Principal calibration

**David Kim (Senior AI/ML Engineer → Staff)** — Ready in ~6 months
• Overall score: 90/100 | Promotion Readiness: 87
• 3 ML models in production relied on by 4+ data science teams ($1.8M avoidance)
• AIOps World 2026 speaker; leading LLM safety framework
• **Gap:** Document business impact more explicitly for the promotion packet

**Next steps:**
1. Schedule promotion calibration for both at Q3 review cycle
2. Identify sponsoring peers in Architecture Review Board for each
3. Create explicit "promotion case" documents with business impact stories`,

  'What skills gaps exist on my team?': `Team skills gap analysis based on ASE current inventory:

**Critical Gaps (Bus Factor Risk):**
• **GenAI/LLMs Expert** — David Kim is the only Expert. ASE has 4 LLM-powered products in production. If David is unavailable, no one can independently debug model behavior, tune system-level prompts, or manage LLM safety incidents.
• **MLOps** — Only David Kim at Expert. Automated retraining, drift detection, and model observability are owned by one person.

**High-Priority Gaps:**
• **AIOps depth** — Only Sarah Chen at Expert. Team is building AIOps products; 7 of 10 engineers are Intermediate or below.
• **Terraform/Ansible** — James Wilson and Ryan O'Brien carry Expert depth; rest of team is Beginner/Intermediate. Infrastructure-as-Code skills needed across the team as AI automation scales.

**Emerging Skill Investments Recommended:**
1. **GenAI/LLMs** — Designate Priya Patel as LLM backup lead (pair with David for 30 days). Structure upskilling plan for Emily, Zoe, and Aisha targeting Intermediate by Q4.
2. **AIOps** — Monthly AIOps office hours led by Sarah Chen for team knowledge transfer.
3. **AI adoption for James/Ryan** — Direct conversations about AI-augmented automation expectations at Staff level.

**Immediate Action:** David Kim to run monthly LLM/AI office hours. Explore hiring Senior AI/ML Engineer to reduce bus factor.`,

  'Which goals are at risk?': `**4 goals are currently At Risk or trending behind** — requiring manager attention:

**Immediate action needed:**
1. **Marcus Johnson** — "Reduce Telemetry Pipeline P95 Latency by 40%" (due Jun 30, 60% complete)
   • Root cause: Schema evolution bug causing serialization overhead
   • Fix: Pair with Sarah Chen for debugging session this week. Re-scope deadline if architectural change needed.

2. **Alex Chen** — "Resolve Ownership Conflict with NOC Team" (due Jun 30, 40% complete)
   • Root cause: Unilateral ServiceNow changes violated agreed change process; caused production incident
   • Fix: Mediation session June 18 — track progress closely. Enforce approval gates.

**Watch list (tracking behind):**
3. **Ryan O'Brien** — "Define ASE 3-Year AI Automation Roadmap" (due Jul 31, 45%)
   • Needs 55% more work in 6 weeks — consider scoping to 18-month roadmap or extending deadline

4. **Marcus Johnson** — "Build Real-Time AIOps Feature Store" (due Sep 30, 35%)
   • Normal pace but milestone tracking needed — break into 2-week checkpoints for visibility

**Team goal completion rate:** 68% vs 75% target for Q2. On track if at-risk goals recover.`,

  'Give me a team health summary': `**Team Health Score: 79/100** — Healthy with 2 active issues to manage.

**Strengths:**
✅ 2 engineers on strong promotion tracks (Sarah Chen, David Kim)
✅ Goal completion rate up 12% vs Q1 — team executing well on AIOps roadmap
✅ Skills growth score: 82/100 — active learning culture with conferences, training, certs
✅ 7 of 10 engineers trending stable or upward in performance

**Active Issues:**
⚠️ Alex Chen production incident + NOC conflict — mediation June 18, urgent
⚠️ Ryan O'Brien career path uncertainty — performance trending down, weekly coaching needed
⚠️ Marcus Johnson technical blocker on P95 telemetry goal — due in 3 weeks

**Team Dynamics:**
• High Potential Engineers: 6 of 10 (60%) — exceptional for an AIOps team of this size
• Mentoring: 2 active relationships (Sarah → Aisha, Priya ← Sarah)
• GenAI/LLM skill concentration risk: 1 Expert (David Kim) for 4 LLM products in production

**Risk Outlook:**
• Q2 goal completion target reachable if 2 at-risk goals recover
• GenAI/LLMs bus factor is the top structural risk for ASE going into H2
• James Wilson's AI adoption gap warrants a direct conversation before Q3 calibration`
}

function generateResponse(message: string): string {
  const lower = message.toLowerCase()
  const key = QUICK_PROMPTS.find(p => p.toLowerCase() === lower)
  if (key && CANNED_RESPONSES[key]) return CANNED_RESPONSES[key]

  if (lower.includes('coach') || lower.includes('coaching')) return CANNED_RESPONSES['Who needs coaching right now?']
  if (lower.includes('promot')) return CANNED_RESPONSES['Who is ready for promotion?']
  if (lower.includes('skill') || lower.includes('gap')) return CANNED_RESPONSES['What skills gaps exist on my team?']
  if (lower.includes('risk') || lower.includes('at risk')) return CANNED_RESPONSES['Which goals are at risk?']
  if (lower.includes('health') || lower.includes('summary')) return CANNED_RESPONSES['Give me a team health summary']

  return `I've analyzed your team data. Based on current performance metrics, goal completion rates, and skills inventory for your 10 Automation Solution Engineering (ASE) engineers:

**Key findings:**
• Team health: 79/100 — 2 active coaching situations (Alex Chen, Ryan O'Brien)
• Goal completion: 68% this quarter (12% improvement vs Q1)
• Promotions ready: 2 engineers (Sarah Chen — Staff AI/Automation, David Kim — Senior AI/ML)
• Skills gaps: GenAI/LLMs bus factor risk — 1 Expert for 4 LLM products in production

For more specific analysis, try asking about coaching, promotions, skill gaps, or at-risk goals. I can also generate a full team summary or individual AIOps capability analysis.`
}

const severityConfig = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle, iconColor: 'text-red-500', titleColor: 'text-red-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', titleColor: 'text-amber-800' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-500', titleColor: 'text-green-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500', titleColor: 'text-blue-800' },
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-bold text-slate-900 mt-2">{line.slice(2, -2)}</p>
    }
    if (line.startsWith('• ')) {
      return <li key={i} className="ml-4 text-slate-700">{formatInline(line.slice(2))}</li>
    }
    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
      return <li key={i} className="ml-4 text-slate-700 list-decimal">{formatInline(line.slice(3))}</li>
    }
    if (line.startsWith('✅') || line.startsWith('⚠️')) {
      return <p key={i} className="text-slate-700 mt-0.5">{line}</p>
    }
    if (line === '') return <br key={i} />
    return <p key={i} className="text-slate-700 mt-0.5">{formatInline(line)}</p>
  })
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part
  )
}

export default function InsightsPage() {
  const { employees: EMPLOYEES } = useEmployees()
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello, **William**. I've analyzed your Automation Solution Engineering (ASE) team's performance data for Q2 2026.

**Quick summary:** 2 engineers need coaching attention (Alex Chen — production incident; Ryan O'Brien — career path), 2 are ready for promotion (Sarah Chen, David Kim), and GenAI/LLM bus factor is your critical skill risk. Team health score is 79/100.

What would you like to explore? You can ask me anything about your team, or use the quick prompts below.`,
      timestamp: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeInsight, setActiveInsight] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    setTimeout(() => {
      const response = generateResponse(text)
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setIsLoading(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="AI Insights"
        subtitle="Powered by team performance data — AI-driven analysis for Automation Solution Engineering (ASE)"
        actions={
          <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh Analysis
          </Button>
        }
      />

      <div className="flex-1 p-6 flex gap-5 min-h-0">
        {/* Left: Insights panel */}
        <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Insights</p>
          {AI_INSIGHTS.map(insight => {
            const config = severityConfig[insight.severity]
            const Icon = config.icon
            const isActive = activeInsight === insight.id
            return (
              <div
                key={insight.id}
                onClick={() => setActiveInsight(isActive ? null : insight.id)}
                className={cn(
                  'rounded-xl border p-4 cursor-pointer transition-all',
                  config.bg, config.border,
                  isActive ? 'ring-2 ring-brand-500 ring-offset-1' : 'hover:shadow-sm'
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.iconColor)} />
                  <p className={cn('text-xs font-semibold leading-tight', config.titleColor)}>
                    {insight.title}
                  </p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{insight.summary}</p>

                {isActive && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500 leading-relaxed">{insight.details}</p>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Action Items</p>
                      {insight.actionItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <CheckCircle className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.employees.map(empId => {
                        const emp = EMPLOYEES.find(e => e.id === empId)
                        return emp ? (
                          <span key={empId} className="text-[10px] px-1.5 py-0.5 bg-white/80 border border-slate-200 rounded text-slate-600">
                            {emp.name.split(' ')[0]}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Chat interface */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-brand-50 to-indigo-50">
            <div className="p-1.5 bg-brand-600 rounded-lg">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Team Coaching Assistant</p>
              <p className="text-xs text-slate-500">AI-powered insights based on real-time performance data</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {msg.role === 'assistant' ? (
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <Avatar name="William Tipton" size="xs" />
                )}
                <div className={cn(
                  'max-w-[75%] rounded-xl p-3.5 text-xs leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-slate-50 border border-slate-200 text-slate-700'
                    : 'bg-brand-600 text-white'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-4 py-2 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.slice(0, 4).map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-[11px] px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full hover:bg-brand-100 transition-colors font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask anything about your team..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              icon={<Send className="w-4 h-4" />}
              size="md"
            >
              Ask
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
