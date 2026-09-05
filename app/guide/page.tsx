'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Rocket, Ruler, ClipboardList, LayoutGrid, Map, AlertTriangle,
  GraduationCap, Settings2, FileSpreadsheet, Sparkles, HelpCircle, Database,
  Building2, ShieldCheck,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import {
  Figure, Callout, Steps, Step, Section, P, Code, Pre, Table,
} from '@/components/guide/GuideParts'
import { PROFICIENCY_ANCHORS, ROLE_PROFILES, AAP_SKILL_CATALOG } from '@/lib/skill-catalog'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'start', label: 'Getting started', icon: Rocket },
  { id: 'orgs', label: 'Organizations & teams', icon: Building2 },
  { id: 'access', label: 'Who sees what', icon: ShieldCheck },
  { id: 'model', label: 'How it works', icon: BookOpen },
  { id: 'rubric', label: 'The 0–5 rubric', icon: Ruler },
  { id: 'assess', label: 'Running an assessment', icon: ClipboardList },
  { id: 'overview', label: 'Reading the Overview', icon: LayoutGrid },
  { id: 'heatmap', label: 'Heat map', icon: Map },
  { id: 'gaps', label: 'Gaps & risk', icon: AlertTriangle },
  { id: 'development', label: 'Development plans', icon: GraduationCap },
  { id: 'framework', label: 'Catalog & role profiles', icon: Settings2 },
  { id: 'excel', label: 'Excel round-trip', icon: FileSpreadsheet },
  { id: 'recipes', label: 'Worked examples', icon: Sparkles },
  { id: 'data', label: 'Where your data lives', icon: Database },
  { id: 'faq', label: 'FAQ & troubleshooting', icon: HelpCircle },
]

export default function GuidePage() {
  const [active, setActive] = useState('start')

  // Highlight the section currently in view in the sidebar.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const criticalCount = AAP_SKILL_CATALOG.filter(s => s.critical).length
  const domainCount = new Set(AAP_SKILL_CATALOG.map(s => s.domain)).size

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="User Guide"
        subtitle="Scoping your organization, assessing capability, and developing your engineers"
      />

      <div className="flex-1 flex gap-8 p-6 max-w-[1400px]">
        {/* Table of contents */}
        <nav className="hidden xl:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-2 px-2">
              On this page
            </p>
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors',
                      active === id
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 px-2">
              <Link
                href="/skills"
                className="block text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Open the Skills Matrix →
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-20">
          {/* ── Hero ───────────────────────────────────────────── */}
          <Card padding="lg" className="mb-2">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">
                  Assess capability, not job titles
                </h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-3xl">
                  Team Insight tracks goals, skills, projects, development, accomplishments,
                  notes, 1:1s and performance for every engineer you are responsible for — and
                  only for the engineers you are responsible for. Capability is measured
                  against a catalog of {AAP_SKILL_CATALOG.length} observable capabilities
                  spanning {domainCount} domains, {criticalCount} of them flagged critical,
                  each anchored to a published 0–5 rubric and backed by evidence, so the
                  resulting gaps, risks and development plans hold up in a room full of
                  engineers.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-brand-50 text-brand-700">Multi-organization</Badge>
                  <Badge className="bg-brand-50 text-brand-700">
                    {AAP_SKILL_CATALOG.length} skills
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-600">{domainCount} domains</Badge>
                  <Badge className="bg-red-50 text-red-600">{criticalCount} critical</Badge>
                  <Badge className="bg-slate-100 text-slate-600">
                    {ROLE_PROFILES.length} role profiles
                  </Badge>
                  <Badge className="bg-green-50 text-green-700">Excel round-trip</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Figure
            src="/docs/capabilities.svg"
            alt="Overview of Team Insight: scoped access above member profiles, the skills framework, analytics, AI assistance and data exchange"
            caption="Everything below the blue band is filtered by the organization and team you lead. Click to enlarge."
          />

          {/* ── Getting started ────────────────────────────────── */}
          <Section
            id="start"
            title="Getting started"
            lead="From a clean checkout to your first assessment in about ten minutes."
          >
            <h3 className="text-sm font-semibold text-slate-800 mt-4 mb-1">Run the app</h3>
            <P>
              The Skills Matrix runs entirely in the browser — no database or backend
              required. Node.js 20 or newer is all you need.
            </P>
            <Pre>{`git clone https://github.com/willtip/team_insight.git
cd team_insight
npm install
npm run dev`}</Pre>
            <P>
              Open <Code>http://localhost:3000</Code>. The app loads with a demo team of ten
              engineers already assessed against the catalog, so every screen has something
              to show before you enter any data of your own.
            </P>

            <Callout kind="tip" title="Prefer Docker?">
              <p>
                <Code>docker compose up --build</Code> brings up the full stack — Postgres,
                Redis, the FastAPI backend and the frontend. You only need it for the Degreed
                integration and AI insights; the Skills Matrix works without it.
              </p>
            </Callout>

            <h3 className="text-sm font-semibold text-slate-800 mt-6 mb-1">Your first hour</h3>
            <Steps>
              <Step n={1} title="Read the rubric before you rate anything">
                <p>
                  Open <strong>Skills Matrix → Scoring guide</strong>. Calibration is the whole
                  ballgame: if two managers mean different things by &ldquo;level 3&rdquo;, none of
                  the downstream numbers mean anything.
                </p>
              </Step>
              <Step n={2} title="Tailor the catalog to your team">
                <p>
                  On the <strong>Framework</strong> tab, adjust which skills are critical, set
                  target levels, and remove anything that doesn&apos;t apply. Targets drive every
                  gap calculation, so this is the highest-leverage ten minutes you will spend.
                </p>
              </Step>
              <Step n={3} title="Assign a role profile to each engineer">
                <p>
                  <strong>Framework → Role profiles</strong>. This sets the breadth and depth
                  targets each person is measured against.
                </p>
              </Step>
              <Step n={4} title="Assess one person end to end">
                <p>
                  Use the <strong>Assessment</strong> tab. Do a single engineer completely before
                  starting the rest — you will discover your own calibration drift on the first pass.
                </p>
              </Step>
              <Step n={5} title="Review the team picture">
                <p>
                  <strong>Overview</strong> and <strong>Gaps &amp; Risk</strong> only become
                  meaningful once several people are rated. Watch the &ldquo;Assessment complete&rdquo;
                  tile — below roughly 60%, treat every other number as provisional.
                </p>
              </Step>
            </Steps>
          </Section>

          {/* ── Organizations & teams ──────────────────────────── */}
          <Section
            id="orgs"
            title="Organizations and teams"
            lead="Everything in the app hangs off a three-level hierarchy. Set it up once and the rest of the product scopes itself."
          >
            <P>
              Team Insight is built for more than one organization. An{' '}
              <strong>Organization</strong> holds one or more <strong>Teams</strong>, and every{' '}
              <strong>Member</strong> belongs to exactly one team — and, through it, to exactly
              one organization. Each level has a leader, and those leader assignments are what
              grant access. There are no permission checkboxes to maintain.
            </P>

            <Figure
              src="/docs/access-model.svg"
              alt="Two organizations, each containing teams with leads and members, separated by a boundary that returns 403"
              caption="An org leader sees every team beneath them. A team lead sees one team. Nothing crosses the boundary between organizations."
            />

            <h3 className="text-sm font-semibold text-slate-800 mt-6 mb-1">Setting one up</h3>
            <Steps>
              <Step n={1} title="Create the organization">
                <p>
                  <strong>Admin → Organizations → Add Organization</strong>. Whoever creates it
                  becomes its leader by default, so you are never locked out of something you
                  just made.
                </p>
              </Step>
              <Step n={2} title="Add teams to it">
                <p>
                  Expand the organization card and use <strong>Add Team</strong>. Team names
                  need only be unique inside their own organization — two organizations can
                  both have a &ldquo;Platform&rdquo; team.
                </p>
              </Step>
              <Step n={3} title="Assign a leader at each level">
                <p>
                  Pick an <em>organization leader</em> on the org card and a{' '}
                  <em>team lead</em> on each team. This is the step that grants visibility —
                  an organization with no leader is visible to administrators only.
                </p>
              </Step>
              <Step n={4} title="Put engineers on teams">
                <p>
                  Set a member&apos;s team from their profile or when adding them. The
                  organization is derived from the team automatically, so the two can never
                  disagree.
                </p>
              </Step>
            </Steps>

            <Callout kind="tip" title="The scope selector">
              <p>
                Once you belong to more than one organization or team, the sidebar shows an{' '}
                <strong>Organization</strong> picker and, beneath it, a <strong>Team</strong>{' '}
                picker limited to that organization. Your choice applies to every page —
                roster, goals, skills, projects, insights, notes and reports all re-query the
                server for the selected scope. It is remembered between visits.
              </p>
              <p>
                With exactly one organization available it is selected for you, since there is
                no choice to make.
              </p>
            </Callout>

            <Callout kind="warn" title="Names are unique company-wide">
              <p>
                Organization names must be unique across the whole install, even though the
                list you can see is limited to what you lead. If you are told a name is taken
                but cannot find it, it belongs to an organization outside your scope — ask an
                administrator rather than hunting for it.
              </p>
            </Callout>
          </Section>

          {/* ── Who sees what ──────────────────────────────────── */}
          <Section
            id="access"
            title="Who sees what"
            lead="Access is worked out by walking the hierarchy, not by reading a role label off your account."
          >
            <Table
              head={['You are', 'You can see', 'You cannot see']}
              rows={[
                [
                  <strong key="a">An organization leader</strong>,
                  'Every team in your organization, every member on those teams, and their full profiles.',
                  'Any other organization.',
                ],
                [
                  <strong key="b">A team lead</strong>,
                  'The members of the team you lead, and their full profiles.',
                  'Other teams, including ones in your own organization.',
                ],
                [
                  <strong key="c">Both at once</strong>,
                  <>The <em>union</em> of both grants. Leading a team inside an organization
                  you already lead adds nothing; leading a team in a different organization
                  adds exactly that team.</>,
                  'Anything neither grant covers.',
                ],
                [
                  <strong key="d">Everyone else</strong>,
                  'Your own record.',
                  // A plain string, not JSX — an HTML entity would render literally here.
                  'Everyone else’s.',
                ],
              ]}
            />

            <P>
              The important consequence: a job title has no bearing on what you can open. A
              director who leads nothing sees nothing, and an engineer who has been made a
              team lead sees their team. Change who leads what and access changes with it,
              immediately.
            </P>

            <h3 className="text-sm font-semibold text-slate-800 mt-6 mb-1">
              The selector is a convenience, not the lock
            </h3>
            <P>
              Hiding things in the interface is not security, so the interface is not where
              this is enforced. Every request is checked on the server against the scope it
              resolves for your account, and a request for someone outside it is refused
              outright.
            </P>

            <Figure
              src="/docs/request-scoping.svg"
              alt="A request flowing from the browser through scope resolution to either scoped rows or a 403 refusal"
              caption="Scope is resolved per request. Asking for a member outside it returns 403 — deliberately not an empty result, which would still reveal whether that person exists."
            />

            <Callout kind="note" title="Where this applies">
              <p>
                Every surface that carries member data: the roster and profiles, goals,
                skills, projects, development plans, accomplishments, notes, 1:1s,
                performance, AI insights, bulk imports and reports. Reference data that
                belongs to no one — the skill catalog, the rubric, role profiles and
                thresholds — is shared and needs only a sign-in.
              </p>
            </Callout>

            <Callout kind="warn" title="Administrators are exempt">
              <p>
                An account with the <Code>admin</Code> role bypasses scoping entirely and can
                see and manage every organization. Grant it sparingly.
              </p>
            </Callout>
          </Section>

          {/* ── Model ──────────────────────────────────────────── */}
          <Section
            id="model"
            title="How it works"
            lead="Four ideas hold the whole feature together."
          >
            <Table
              head={['Concept', 'What it means']}
              rows={[
                [
                  <strong key="a">Catalog</strong>,
                  <>A shared list of assessable capabilities. Each carries an <em>observable
                  capability</em> (what doing it looks like), an <em>evidence standard</em>, a{' '}
                  <em>criticality</em> flag, a <em>target level</em> and a <em>weight</em>.
                  Skills exist in the catalog, never as free text on a person.</>,
                ],
                [
                  <strong key="b">Rubric</strong>,
                  <>One 0–5 scale used everywhere, anchored on independence, scope, evidence
                  and what the level contributes to team coverage.</>,
                ],
                [
                  <strong key="c">Assessment</strong>,
                  <>A person × skill rating. Self and reviewer ratings are captured separately;
                  the reviewer&apos;s rating wins where both exist. Gap and priority are calculated,
                  never typed.</>,
                ],
                [
                  <strong key="d">Role profile</strong>,
                  <>Numeric breadth and depth targets, plus the specific skills that make up
                  that role&apos;s depth areas — so &ldquo;is this person doing their job&rdquo; is a
                  measurement rather than an opinion.</>,
                ],
              ]}
            />

            <Callout kind="note" title="Why ratings are never typed as a gap">
              <p>
                You record two things — what the person can do, and what the role requires.
                Everything else (gap, priority, coverage, bus factor, capability index) is
                derived. That means changing a target instantly re-scores the whole team,
                and no number on the page can go stale.
              </p>
            </Callout>
          </Section>

          {/* ── Rubric ─────────────────────────────────────────── */}
          <Section
            id="rubric"
            title="The 0–5 rubric"
            lead="Rate on recent demonstrated evidence, not on familiarity, enthusiasm or job title."
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200 my-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Level', 'Label', 'Independence', 'Scope', 'Evidence', 'Counts as'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROFICIENCY_ANCHORS.map(a => (
                    <tr key={a.level} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                          {a.level}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{a.label}</td>
                      <td className="px-3 py-2 text-slate-600">{a.independence}</td>
                      <td className="px-3 py-2 text-slate-600">{a.scope}</td>
                      <td className="px-3 py-2 text-slate-600">{a.evidence}</td>
                      <td className="px-3 py-2 text-slate-500">{a.coverageMeaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <P>
              Three thresholds do the analytical work throughout the app:
            </P>
            <Table
              head={['Threshold', 'Level', 'Used for']}
              rows={[
                [<strong key="1">Breadth</strong>, '2 or above', 'Can work the skill with review — counts toward role breadth targets'],
                [<strong key="2">Coverage</strong>, '3 or above', 'Working proficiency — the team is genuinely covered for this skill'],
                [<strong key="3">Depth</strong>, '4 or above', 'A primary owner. Fewer than two on a critical skill is a bus-factor risk'],
              ]}
            />

            <Figure
              src="/docs/scoring-guide.png"
              alt="The scoring guide slide-over showing all six proficiency anchors"
              caption="The Scoring guide is reachable from the header and from the Assessment tab — raters need the anchor text at the moment they rate, not on a separate page."
            />

            <Callout kind="warn" title="Level 4 is not the top">
              <p>
                Level 4 (Advanced/lead) is the expected ceiling for most skills. Level 5
                (Strategic expert) means setting enterprise direction and developing other
                experts — reserve it, or it stops carrying information.
              </p>
            </Callout>
          </Section>

          {/* ── Assessment ─────────────────────────────────────── */}
          <Section
            id="assess"
            title="Running an assessment"
            lead="The Assessment tab is the workbook's assessment sheet, made editable and self-calculating."
          >
            <Figure
              src="/docs/skills-assessment.png"
              alt="The Assessment tab showing one engineer's ratings grouped by domain"
              caption="One engineer at a time. Skills group under collapsible domains; the summary strip at the top updates live as you rate."
            />

            <Steps>
              <Step n={1} title="Pick the engineer">
                <p>Use the dropdown at the top left. Their summary strip shows assessed count,
                breadth, depth, average level, target attainment and High-priority gaps.</p>
              </Step>
              <Step n={2} title="Narrow the list">
                <p>
                  <Code>Unrated</Code> shows only what is still missing — the fastest way to finish
                  a pass. <Code>Critical</Code> and <Code>Below target</Code> are useful for review
                  conversations.
                </p>
              </Step>
              <Step n={3} title="Enter Self and Reviewer ratings">
                <p>
                  Both are optional. If only <strong>Self</strong> is filled, that becomes the
                  final rating and the row is flagged as awaiting review. Entering{' '}
                  <strong>Reviewer</strong> supersedes it.
                </p>
              </Step>
              <Step n={4} title="Record the evidence">
                <p>
                  The Evidence field is prefilled with a placeholder showing what proof at target
                  looks like for that skill. A rating of 3 or above without evidence is an opinion,
                  not an assessment.
                </p>
              </Step>
              <Step n={5} title="Save">
                <p>
                  Edits are held as a draft (rows tint blue) until you press <strong>Save</strong>,
                  so you can work through a whole domain and commit once.
                </p>
              </Step>
            </Steps>

            <P>
              The three right-hand columns are calculated and cannot be edited:
            </P>
            <Table
              head={['Column', 'Rule']}
              rows={[
                [<strong key="f">Final</strong>, <>Reviewer rating, falling back to Self.</>],
                [<strong key="g">Gap</strong>, <><Code>max(0, target − final)</Code>. Shown as a negative number because it is a shortfall.</>],
                [
                  <strong key="p">Priority</strong>,
                  <><strong>High</strong> when a critical skill is 2+ below target ·{' '}
                  <strong>Medium</strong> when any skill is 2+ below · <strong>Low</strong> at
                  1 below · <strong>Maintain</strong> when at or above target.</>,
                ],
              ]}
            />

            <Callout kind="tip" title="Override a target for one person">
              <p>
                The Target column is editable per row. Use it when someone&apos;s role
                legitimately needs more or less of a skill than the catalog default — a
                specialist carrying deep security expectations, for example. The catalog
                default stays untouched for everyone else.
              </p>
            </Callout>

            <h3 className="text-sm font-semibold text-slate-800 mt-8 mb-1">
              On the engineer&apos;s own profile
            </h3>
            <P>
              Every engineer&apos;s <strong>Skills</strong> tab carries the same picture scoped
              to them — useful in a one-to-one, where the full matrix is too much.
            </P>
            <Figure
              src="/docs/employee-skills.png"
              alt="An engineer's Skills tab showing the domain radar, assessment summary and rated skills"
              caption="The radar plots capability by domain against the domain's average target, so strengths and shortfalls read at a glance. Click any level badge to cycle the reviewer rating without leaving the page."
            />

            <P>
              To edit ratings alongside the rest of someone&apos;s profile, open{' '}
              <strong>Team → edit</strong> and switch to the <strong>Skills</strong> tab. It is
              the same grid as the Assessment tab — grouped by domain, searchable, filterable to
              &ldquo;below target&rdquo; or &ldquo;awaiting review&rdquo; — with the rubric
              printed above it and live breadth/depth totals against the assigned role profile.
              Changes there are held until you press <strong>Save Changes</strong>.
            </P>
          </Section>

          {/* ── Overview ───────────────────────────────────────── */}
          <Section
            id="overview"
            title="Reading the Overview"
            lead="Four headline numbers, then where the capability actually sits."
          >
            <Figure
              src="/docs/skills-overview.png"
              alt="The Overview tab with four KPI tiles, domain breakdown and per-person capability index"
              caption="Every figure here is derived from ratings. Change one rating on the Assessment tab and each of these moves."
            />

            <Table
              head={['Tile', 'Definition', 'What to do about it']}
              rows={[
                [
                  <strong key="a">Critical coverage</strong>,
                  'Share of critical skills with at least one engineer at level 3+.',
                  'Anything below 100% is a capability you cannot currently deliver.',
                ],
                [
                  <strong key="b">High-priority gaps</strong>,
                  'Person × skill rows where a critical skill is 2+ levels below target.',
                  'This is your development backlog. Work it from the Gaps & Risk tab.',
                ],
                [
                  <strong key="c">Bus-factor risks</strong>,
                  'Critical skills with one depth owner (level 4+) or none.',
                  'Cross-train a second owner. This is a staffing risk, not a training nicety.',
                ],
                [
                  <strong key="d">Assessment complete</strong>,
                  'Share of all engineer × skill cells carrying a rating.',
                  'Below ~60%, treat the other three tiles as provisional.',
                ],
              ]}
            />

            <P>
              <strong>Capability by domain</strong> shows the team average level per domain and
              the share of ratings that have reached their target — the bar is attainment, not
              coverage, because coverage saturates on a team of this size and stops telling you
              anything.
            </P>
            <P>
              <strong>Team capability index</strong> is the weighted share of required capability
              each person holds:
            </P>
            <Pre>{`Σ(min(level, target) × weight) ÷ Σ(target × weight)`}</Pre>
            <P>
              It is measured against what the role requires, not against a theoretical maximum —
              so someone fully meeting a set of level-3 targets scores 100%, not 60%. Click any
              name to jump straight into their assessment.
            </P>
          </Section>

          {/* ── Heatmap ────────────────────────────────────────── */}
          <Section
            id="heatmap"
            title="Heat map"
            lead="The whole team against the whole catalog, grouped by domain."
          >
            <Figure
              src="/docs/skills-heatmap.png"
              alt="The heat map showing every engineer's level for every catalog skill, grouped by domain"
              caption="Darker means higher. A dashed outline means the skill has not been assessed for that person — distinct from a rating of 0 (Not exposed)."
            />

            <Table
              head={['Signal', 'Meaning']}
              rows={[
                [<span key="1" className="font-mono text-xs">0–5</span>, 'The final rating for that engineer and skill.'],
                [<span key="2" className="inline-block w-3 h-3 rounded-full bg-amber-400" />, 'Amber dot: this rating is below the skill’s target.'],
                [<span key="3" className="inline-block w-2 h-2 rounded-full bg-red-500" />, 'Red dot beside a skill name: the skill is flagged critical.'],
                [<span key="4" className="font-mono text-xs">·</span>, 'Not assessed yet.'],
                [<span key="5" className="font-mono text-xs">→4</span>, 'The target level for that skill, shown at the end of the row.'],
              ]}
            />

            <P>
              Use <strong>Critical only</strong> plus <strong>Below target only</strong> together
              to reduce 69 rows to just the cells that need action. Domain headers collapse, so
              you can focus on one area during a review.
            </P>
          </Section>

          {/* ── Gaps ───────────────────────────────────────────── */}
          <Section
            id="gaps"
            title="Gaps & risk"
            lead="Where the team is exposed, and who is cheapest to move."
          >
            <Figure
              src="/docs/skills-gaps.png"
              alt="The Gaps and Risk tab showing single points of failure and the highest-priority development gaps"
              caption="Single points of failure name the sole depth owner, so the risk is concrete rather than statistical."
            />

            <P>
              <strong>Single points of failure</strong> lists every critical skill with at most one
              engineer at level 4. &ldquo;Only James Wilson&rdquo; means exactly that — if James is
              unavailable, that capability leaves with him. &ldquo;No depth owner&rdquo; is worse:
              nobody on the team owns it at all.
            </P>
            <P>
              <strong>Highest-priority development gaps</strong> ranks every person × skill
              shortfall by priority, then gap size, then skill weight. Hover a row and click the
              person-plus icon to send it straight to that engineer&apos;s development plan.
            </P>
            <P>
              <strong>Upskilling candidates</strong> shows who sits exactly one level below target
              on the selected skill. These are your cheapest capability wins — one level of
              movement closes the gap. Click any skill name anywhere on the tab to focus this panel.
            </P>

            <Callout kind="tip" title="A bus-factor risk is not always a training problem">
              <p>
                If a critical skill has one owner because it is genuinely niche, the fix may be
                documentation, a runbook, or a vendor contract rather than getting a second
                person to level 4. The tab tells you where the exposure is; the remedy is
                still a judgement call.
              </p>
            </Callout>
          </Section>

          {/* ── Development ────────────────────────────────────── */}
          <Section
            id="development"
            title="Development plans"
            lead="Turning a gap into an assignment with a coach, a due date and an evidence bar."
          >
            <Figure
              src="/docs/skills-development.png"
              alt="The Development tab with pre-filled assignments for one engineer"
              caption="Seeded assignments arrive pre-filled: the objective comes from the skill's observable capability, and success evidence from its evidence standard."
            />

            <P>
              <strong>Seed top 4 per engineer</strong> creates assignments from each person&apos;s
              highest-priority gaps. It is capped deliberately — a plan containing every gap is
              not a plan. Run it again later to pull in the next batch.
            </P>
            <P>Each assignment carries the columns that make development actually happen:</P>
            <Table
              head={['Field', 'Purpose']}
              rows={[
                ['Objective', 'The capability being built, prefilled from the skill definition.'],
                ['Experience assignment', 'The real work that will build it. This is the part that matters most.'],
                ['Coach / reviewer', 'Who confirms the level was reached.'],
                ['Course / lab', 'Supporting training, if any. Optional by design — courses alone rarely move a level.'],
                ['Due date', 'Defaults to 90 days out.'],
                ['Success evidence', 'What must exist to call it done, prefilled from the skill’s evidence standard.'],
              ]}
            />
          </Section>

          {/* ── Framework ──────────────────────────────────────── */}
          <Section
            id="framework"
            title="Catalog & role profiles"
            lead="The framework is yours to edit — the shipped catalog is a starting point, not a constraint."
          >
            <Figure
              src="/docs/skills-framework.png"
              alt="The Framework tab showing the editable skill catalog"
              caption="Every field is editable inline. 'Rated by' shows how many engineers have been assessed on each skill."
            />

            <P>
              Criticality, target level and weight are the three fields that change your numbers:
            </P>
            <Table
              head={['Field', 'Effect']}
              rows={[
                ['Critical', 'Feeds critical coverage, bus-factor risk, and whether a 2-level gap is High or Medium priority.'],
                ['Target', 'The bar every rating is measured against. Drives gap, priority and the capability index.'],
                ['Weight (1.1–1.6)', 'Relative importance in the weighted capability index and in gap ranking.'],
              ]}
            />

            <h4 className="text-xs font-semibold text-slate-700 mt-5 mb-1">
              Creating, editing and deleting skills
            </h4>
            <Steps>
              <Step n={1} title="Add a skill">
                <p>
                  <strong>Add skill</strong> opens the editor. Every field is available, including
                  a <strong>+ New domain…</strong> option if the skill does not belong in any
                  existing domain. Describe the observable behaviour, not the tool — that is what
                  raters judge against.
                </p>
              </Step>
              <Step n={2} title="Edit a skill">
                <p>
                  Click the pencil at the end of a row, or the skill name itself, to open the full
                  editor. The three fields you tune most — critical, target and weight — are also
                  editable inline in the table for quick bulk passes.
                </p>
              </Step>
              <Step n={3} title="Delete a skill">
                <p>
                  Delete lives inside the editor, behind a confirmation that tells you how many
                  ratings will be hidden. The skill is also removed from any role profile that
                  named it as a depth area.
                </p>
              </Step>
            </Steps>

            <Callout kind="note" title="Editing is safe while people are already rated">
              <p>
                The editor tells you how many engineers hold a rating and which role profiles
                depend on the skill before you change anything. Ratings key on the skill&apos;s
                id, not its name — so renaming a skill keeps every rating attached.
              </p>
            </Callout>

            <P>
              <strong>Reset to preset</strong> restores both the shipped{' '}
              {AAP_SKILL_CATALOG.length}-skill catalog and the shipped role profiles, discarding
              your edits to either. Assessments are untouched.
            </P>

            <h3 className="text-sm font-semibold text-slate-800 mt-8 mb-1">
              Breadth and depth — what they actually mean
            </h3>
            <P>
              These are the two numbers that describe the <em>shape</em> of a role, and they are
              the most consequential settings in the framework. Both are <strong>counts of
              skills</strong>, not percentages and not scores.
            </P>

            <Table
              head={['', 'Breadth', 'Depth']}
              rows={[
                [
                  <strong key="q">The question it answers</strong>,
                  'How wide does this role reach?',
                  'How far down does this role go?',
                ],
                [
                  <strong key="m">What it counts</strong>,
                  <>Skills the engineer can <em>work</em> — rated at the breadth threshold
                  (level 2, Guided practitioner) or above.</>,
                  <>Skills the engineer <em>owns</em> — rated at the depth threshold
                  (level 4, Advanced/lead) or above.</>,
                ],
                [
                  <strong key="l">A low number means</strong>,
                  'A specialist. Narrow surface area, deliberately.',
                  'A contributor rather than an owner. Fine early-career; a risk in a senior role.',
                ],
                [
                  <strong key="h">A high number means</strong>,
                  'A generalist who can pick up most work with review.',
                  'A primary owner across many areas. This is what protects you from bus-factor risk.',
                ],
                [
                  <strong key="w">Why you would raise it</strong>,
                  'The role is expected to cover for others, or work across many systems.',
                  'The role is accountable for outcomes nobody else can deliver.',
                ],
              ]}
            />

            <Callout kind="tip" title="A worked example">
              <p>
                The shipped <strong>Automation Architect / Technical Lead</strong> profile sets
                breadth <strong>45</strong> and depth <strong>17</strong> against a 69-skill
                catalog. That says: this person should be able to work in roughly two-thirds of
                everything the team does, and personally own about a quarter of it. The{' '}
                <strong>AAP Platform Engineer</strong> sits at 34 / 11 — narrower and less deep,
                because it is a focused operational role rather than a cross-cutting one.
              </p>
              <p>
                A profile with high breadth and low depth is a generalist. Low breadth and high
                depth is a specialist. Both are legitimate; what matters is that the profile
                matches what you actually expect of the person.
              </p>
            </Callout>

            <Figure
              src="/docs/role-targets.png"
              alt="The role profile editor showing the breadth and depth capability targets with explanations"
              caption="The editor spells out what each target means as you set it, including the share of the catalog it represents."
            />

            <h3 className="text-sm font-semibold text-slate-800 mt-8 mb-1">
              Measurement thresholds
            </h3>
            <P>
              &ldquo;Level 2 or above&rdquo; and &ldquo;level 4 or above&rdquo; are defaults, not
              laws. The three levels at which breadth, coverage and depth begin counting are
              configurable on <strong>Framework → Role profiles</strong>, and changing one
              re-scores the entire team immediately.
            </P>

            <Table
              head={['Threshold', 'Default', 'What it decides', 'What it drives']}
              rows={[
                [
                  <strong key="b">Breadth</strong>,
                  <Code key="bd">2 · Guided practitioner</Code>,
                  'When an engineer counts as having a skill at all',
                  'Per-engineer breadth counts; every role profile’s breadth target',
                ],
                [
                  <strong key="c">Coverage</strong>,
                  <Code key="cd">3 · Independent</Code>,
                  'When the team as a whole is covered for a skill',
                  'Critical coverage on the Overview; the “nobody at working proficiency” list',
                ],
                [
                  <strong key="d">Depth</strong>,
                  <Code key="dd">4 · Advanced/lead</Code>,
                  'When an engineer genuinely owns a skill',
                  'Per-engineer depth counts; role depth targets; bus-factor risk',
                ],
              ]}
            />

            <Figure
              src="/docs/measurement-thresholds.png"
              alt="The measurement thresholds panel with live impact figures under each control"
              caption="Each control shows the effect of the current setting on live data, so you can see what a change costs before you commit to it."
            />

            <Callout kind="warn" title="Raising a threshold makes the team look worse — on purpose">
              <p>
                Moving depth from level 4 to level 5 does not change anyone&apos;s capability; it
                changes what you are willing to call ownership. Expect depth counts to fall and
                bus-factor risks to rise. Lowering it has the opposite effect. Pick the levels
                that match how your organisation actually talks about ownership, then leave them
                alone — comparisons across quarters are only meaningful if the thresholds held
                still.
              </p>
              <p>
                Keep them in order: breadth ≤ coverage ≤ depth. The app warns you if they are not.
              </p>
            </Callout>

            <h3 className="text-sm font-semibold text-slate-800 mt-8 mb-1">Role profiles</h3>
            <P>
              Each profile sets a breadth target, a depth target, and the specific catalog skills
              that count as that role&apos;s depth areas. The shipped profiles:
            </P>
            <Table
              head={['Profile', 'Primary outcome', 'Breadth', 'Depth']}
              rows={ROLE_PROFILES.map(p => [
                <strong key={p.id}>{p.name}</strong>,
                <span key={`${p.id}-o`} className="text-slate-600">{p.primaryOutcome}</span>,
                <span key={`${p.id}-b`} className="font-mono text-xs">{p.breadthTarget}</span>,
                <span key={`${p.id}-d`} className="font-mono text-xs">{p.depthTarget}</span>,
              ])}
            />
            <P>
              Assign profiles on <strong>Framework → Role profiles</strong>. The
              &ldquo;N depth areas short&rdquo; note tells you which of the role&apos;s named depth
              skills are still below level 4 — hover it for the list.
            </P>

            <h4 className="text-xs font-semibold text-slate-700 mt-5 mb-1">
              Creating, editing and deleting role profiles
            </h4>
            <P>
              The shipped six are a starting point. <strong>New role profile</strong> creates your
              own; the pencil on any card edits it; delete lives inside the editor.
            </P>
            <Table
              head={['Field', 'What it controls']}
              rows={[
                ['Profile name', 'Display only. Renaming is safe — engineers stay assigned, because assignments key on a stable id.'],
                ['Primary outcome, depth areas, working breadth, AI-era expectation, evidence', 'Descriptive prose shown on the profile card. Useful for calibration conversations; not used in any calculation.'],
                ['Breadth target', 'How many skills this role should hold at level 2+.'],
                ['Depth target', 'How many skills this role should hold at level 4+.'],
                [
                  <strong key="ds">Depth-area skills</strong>,
                  <>The specific catalog skills this role must own at level 4+. Pick them from the
                  searchable list on the right of the editor. These produce the
                  &ldquo;N depth areas short&rdquo; list — the role&apos;s concrete development
                  backlog.</>,
                ],
              ]}
            />

            <Callout kind="warn" title="Deleting a profile unassigns everyone on it">
              <p>
                The confirmation names how many engineers are assigned. They are not deleted —
                they simply revert to having no profile, and their breadth and depth stop being
                measured against a target until you assign a new one.
              </p>
            </Callout>
          </Section>

          {/* ── Excel ──────────────────────────────────────────── */}
          <Section
            id="excel"
            title="Excel round-trip"
            lead="Assess in the app or in the spreadsheet — the two stay in sync."
          >
            <P>
              <strong>Export</strong> produces an eight-sheet workbook: Read Me, Skill Catalog,
              Assessment, Team Summary, Role Profiles, Scoring Guide, Development Plan and
              Sources. It carries both live values and working formulas, so it doubles as a
              standalone offline template — hand it to a manager with no app access and their
              edits still calculate.
            </P>

            <Steps>
              <Step n={1} title="Export the workbook">
                <p>Header → <strong>Export</strong>. The file downloads as{' '}
                <Code>Team_Skills_Assessment_Matrix_YYYY-MM-DD.xlsx</Code>.</p>
              </Step>
              <Step n={2} title="Edit offline">
                <p>
                  On the <strong>Assessment</strong> sheet, fill in <em>Self rating</em>,{' '}
                  <em>Reviewer rating</em> and <em>Evidence</em>. Final, Gap and Priority
                  recalculate themselves. You can also adjust criticality, target and weight on
                  the <strong>Skill Catalog</strong> sheet.
                </p>
              </Step>
              <Step n={3} title="Import it back">
                <p>
                  Skills Matrix → <strong>Assessment</strong> tab → <strong>Upload file</strong>,
                  or drop the file on the import panel. It accepts <Code>.xlsx</Code>,{' '}
                  <Code>.csv</Code> and <Code>.tsv</Code>, so a plain spreadsheet with
                  Email, Skill ID, Target, Self, Reviewer and Evidence columns works too.
                  Catalog and role-profile changes still go through the header{' '}
                  <strong>Import</strong> button.
                </p>
              </Step>
              <Step n={4} title="Review the diff before anything is written">
                <p>
                  Import never writes silently. You get an itemised list of every rating that
                  would change, plus warnings for employee names and skill IDs that could not
                  be matched.
                </p>
              </Step>
            </Steps>

            <Figure
              src="/docs/import-review.png"
              alt="The import review dialog listing each rating change before it is applied"
              caption="Rows are matched on email, then employee ID, then name. Rows that need attention are listed separately from the ones that will apply, and nothing is written until you apply."
            />

            <Callout kind="warn" title="Do not edit the match keys">
              <p>
                <strong>Skill ID</strong> and the columns identifying the person — Email,
                Employee ID or Employee — are how rows are matched on the way back in. Changing
                them means the row is skipped and reported. Everything else is fair game.
              </p>
            </Callout>

            <P>
              The <strong>Reports</strong> page also exports a flat{' '}
              <Code>skills-readiness</Code> CSV with domain, criticality, target, self, reviewer,
              final, gap, priority and evidence per row — handy for pivot tables or feeding
              another system.
            </P>
          </Section>

          {/* ── Recipes ────────────────────────────────────────── */}
          <Section
            id="recipes"
            title="Worked examples"
            lead="Four things managers actually need to do, start to finish."
          >
            <div className="space-y-4">
              {[
                {
                  title: 'Run a quarterly assessment cycle',
                  steps: [
                    'Export the workbook and send each engineer the Assessment sheet filtered to their rows, asking for Self ratings and evidence.',
                    'Import the returned files. Review each diff — you will see exactly what each person claimed.',
                    'Work through the Assessment tab adding your Reviewer ratings. Where you disagree with a self-rating, the evidence field is the conversation.',
                    'Check the Overview. Compare "Assessment complete" against last quarter before drawing conclusions.',
                    'Seed development plans from the resulting High-priority gaps.',
                  ],
                },
                {
                  title: 'Close a bus-factor risk',
                  steps: [
                    'Gaps & Risk → Single points of failure. Pick a critical skill with one owner.',
                    'Click it. The Upskilling candidates panel shows who is one level below target.',
                    'Click the person-plus icon on the strongest candidate to create an assignment.',
                    'On the Development tab, set the experience assignment to real work — shadowing the current owner through an actual production task — and name that owner as coach.',
                    'When the evidence exists, raise their reviewer rating to 4. The risk clears automatically.',
                  ],
                },
                {
                  title: 'Justify a headcount request',
                  steps: [
                    'Framework → confirm criticality and targets reflect what the platform genuinely requires.',
                    'Overview → note critical coverage and the bus-factor count.',
                    'Gaps & Risk → screenshot the single points of failure list. Naming the sole owner of six critical capabilities is a stronger argument than any ratio.',
                    'Export the workbook as the supporting appendix — it shows your method, not just your conclusion.',
                  ],
                },
                {
                  title: 'Onboard a new engineer',
                  steps: [
                    'Team → add the engineer, then assign a role profile on their Skills tab.',
                    'Assessment tab → filter to Critical and rate only those first. You will have a usable picture in twenty minutes.',
                    'Their capability index and role fit appear immediately on the Overview and on their profile.',
                    'Seed a development plan from their gaps — it doubles as a 90-day ramp plan.',
                  ],
                },
              ].map(recipe => (
                <Card key={recipe.title} padding="md">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">{recipe.title}</h3>
                  <ol className="space-y-2">
                    {recipe.steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </Section>

          {/* ── Data ───────────────────────────────────────────── */}
          <Section
            id="data"
            title="Where your data lives"
            lead="Everything is local to your browser until you export it."
          >
            <Table
              head={['Key', 'Contents']}
              rows={[
                [<Code key="a">asi-employees-v2</Code>, 'Engineers, their skill assessments and development plans.'],
                [<Code key="b">asi-skill-catalog</Code>, 'Your edited catalog. Absent until you change something.'],
                [<Code key="c">asi-skill-migration-v2</Code>, 'A marker showing the one-time upgrade from the pre-catalog format has run.'],
              ]}
            />

            <Callout kind="warn" title="Local storage is per browser">
              <p>
                Your assessments are not synced to a server. They live in the browser profile
                you entered them in, and clearing site data deletes them. Export the workbook
                at the end of each cycle — that file is your record of truth and your backup.
              </p>
            </Callout>

            <P>
              Upgrading from an earlier version? Ratings on the old four-level scale migrate
              automatically the first time you load the app. Beginner → 1, Intermediate → 2,
              Advanced → 3, Expert → 4, leaving level 5 as new headroom nobody is
              auto-promoted into. Skills with no catalog equivalent are preserved as custom
              catalog entries rather than dropped.
            </P>
          </Section>

          {/* ── FAQ ────────────────────────────────────────────── */}
          <Section id="faq" title="FAQ & troubleshooting">
            <div className="space-y-3">
              {[
                {
                  q: 'I signed in and the roster is empty.',
                  a: 'Visibility comes from leader assignments, not from your role. If you do not lead an organization or a team, there is nothing for you to see beyond your own record. Ask an administrator to make you an organization leader or a team lead in Admin → Organizations.',
                },
                {
                  q: 'I can only see one team, but I manage two.',
                  a: 'You are the lead on one of them and not the other. Team access is granted per team, so leading two means being named on both — or being made the leader of the organization that contains them, which covers every team inside it at once.',
                },
                {
                  q: 'I am told an organization name is taken, but I cannot find it.',
                  a: 'Organization names are unique across the whole install, while the list you see is limited to what you lead. The clash belongs to an organization outside your scope. Ask an administrator to give you access to it, or pick a different name.',
                },
                {
                  q: 'Why does the API return 403 instead of an empty list?',
                  a: 'Because an empty list is still an answer. If out-of-scope requests came back empty, a caller could try ids one after another and learn which ones exist by watching which responses had a different shape. Refusing outright gives nothing away.',
                },
                {
                  q: 'Our engineers vanished after upgrading.',
                  a: 'They predate the organization hierarchy and have no team, so no leader chain reaches them. Run the database migrations — the backfill moves them into an "Unassigned" organization and team with a leader attached, and you can then move them onto real teams.',
                },
                {
                  q: 'A skill shows a gap even though the engineer is strong at it.',
                  a: 'Check the target on the Framework tab. Gaps are measured against target, not against the top of the scale — a target of 4 on a skill they hold at 3 is a real one-level gap. If the target is wrong for your team, change it there, or override it for that one person in the Target column of the Assessment tab.',
                },
                {
                  q: 'The Overview numbers look alarming.',
                  a: 'Check "Assessment complete" first. Unrated skills are excluded from averages but not from coverage and bus-factor counts, so a partly-assessed team looks worse than it is. Finish a full pass before acting on the headline figures.',
                },
                {
                  q: 'Someone has a Final rating but I never entered a Reviewer rating.',
                  a: 'That is their self-rating standing in. Hover the Final badge — it tells you which source it came from. Self-only rows are exactly the ones to work through in a review.',
                },
                {
                  q: 'Import says my employees are unmatched.',
                  a: 'Rows are matched on Email first, then Employee ID, then name. Name matching is the fallback and is the fragile one — a rename, an added middle initial or two people sharing a name will all fail to match, and a shared name is reported as ambiguous rather than guessed at. Add an Email or Employee ID column to make matching exact. The review dialog lists every unmatched row under "Needs attention".',
                },
                {
                  q: 'I deleted a catalog skill — what happened to the ratings?',
                  a: 'They are retained in storage but hidden, because a rating with no definition cannot be interpreted. Re-adding a skill with the same ID brings them back. The delete confirmation warns you how many ratings are affected.',
                },
                {
                  q: 'Can I use this for a team that is not automation-focused?',
                  a: 'Yes. The catalog is fully editable — replace the shipped skills with your own, or clear them and build from scratch. The rubric, analytics and Excel round-trip are domain-agnostic; only the default catalog content is automation-specific.',
                },
                {
                  q: 'Should I use this for performance ratings?',
                  a: 'No. It is built for capability planning and growth, not forced ranking or compensation. Levels describe demonstrated capability against role requirements — they are not a judgement of the person, and treating them as one will corrupt your data as people learn to rate strategically.',
                },
                {
                  q: 'What does the "L3 / L4 / L5 / L6" level on an employee\'s profile mean?',
                  a: 'That is their career/seniority level in your organization\'s job ladder (e.g. L3 = Engineer, L4 = Senior-track, L5 = Senior, L6 = Staff/Principal) — it is set on the Edit Profile form and is independent of the 0–5 skill rubric. Skill levels measure demonstrated capability per skill; the career level is just the person\'s title tier and plays no part in gap, coverage or bus-factor calculations.',
                },
              ].map(item => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-slate-800 list-none">
                    <span className="flex-1">{item.q}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-3.5 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>

            <Callout kind="note" title="Still stuck?">
              <p>
                The rubric, thresholds and every derived formula are documented in the
                project README, and the calculations themselves live in one file —{' '}
                <Code>lib/skill-analytics.ts</Code> — as plain functions you can read.
              </p>
            </Callout>
          </Section>
        </div>
      </div>
    </div>
  )
}
