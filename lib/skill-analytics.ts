import type {
  Employee, ProficiencyLevel, SkillAssessment, SkillPriority,
} from './types'
import type { RoleProfile, SkillDefinition, SkillThresholds } from './skill-catalog'
import { ROLE_PROFILES, DEFAULT_THRESHOLDS } from './skill-catalog'

/**
 * Pure derivations behind the Skill Matrix — a port of the reference workbook's
 * formulas. Nothing here reads state; every view computes from these so the page
 * cannot drift from the data the way the old hardcoded KPIs did.
 */

// ---------------------------------------------------------------------------
// Per-assessment
// ---------------------------------------------------------------------------

/** One rating resolved against its catalog definition. */
export interface ResolvedSkill {
  skillId: string
  definition: SkillDefinition
  self?: ProficiencyLevel
  reviewer?: ProficiencyLevel
  /** Reviewer rating wins when present, else self. Undefined means unassessed. */
  final?: ProficiencyLevel
  target: ProficiencyLevel
  /** Distance below target; 0 when at or above. Undefined while unassessed. */
  gap?: number
  priority?: SkillPriority
  evidence?: string
  evidenceUrl?: string
  assessedAt?: string
  assessedBy?: string
}

/** `Assessment!L`: the reviewer's rating supersedes self-assessment. */
export function finalRating(a: SkillAssessment): ProficiencyLevel | undefined {
  return a.reviewerRating ?? a.selfRating
}

export function effectiveTarget(
  a: SkillAssessment | undefined,
  def: SkillDefinition,
): ProficiencyLevel {
  return a?.targetOverride ?? def.targetLevel
}

/** `Assessment!O`: a two-level shortfall on a critical skill is the top of the queue. */
export function gapPriority(gap: number, critical: boolean): SkillPriority {
  if (critical && gap >= 2) return 'High'
  if (gap >= 2) return 'Medium'
  if (gap === 1) return 'Low'
  return 'Maintain'
}

export function resolveSkill(
  a: SkillAssessment | undefined,
  def: SkillDefinition,
): ResolvedSkill {
  const final = a ? finalRating(a) : undefined
  const target = effectiveTarget(a, def)
  const gap = final === undefined ? undefined : Math.max(0, target - final)
  return {
    skillId: def.id,
    definition: def,
    self: a?.selfRating,
    reviewer: a?.reviewerRating,
    final,
    target,
    gap,
    priority: gap === undefined ? undefined : gapPriority(gap, def.critical),
    evidence: a?.evidence,
    evidenceUrl: a?.evidenceUrl,
    assessedAt: a?.assessedAt,
    assessedBy: a?.assessedBy,
  }
}

/**
 * Every catalog skill for one person, assessed or not.
 * Ratings against skills no longer in the catalog are dropped rather than
 * rendered without context.
 */
export function resolveEmployeeSkills(
  employee: Employee,
  catalog: SkillDefinition[],
): ResolvedSkill[] {
  const byId = new Map((employee.skills ?? []).map(a => [a.skillId, a]))
  return catalog.map(def => resolveSkill(byId.get(def.id), def))
}

// ---------------------------------------------------------------------------
// Per-employee (the workbook's Team Summary sheet)
// ---------------------------------------------------------------------------

export interface RoleFit {
  profile: RoleProfile
  breadth: number
  breadthTarget: number
  depth: number
  depthTarget: number
  /** Depth-area skills from the profile that are already at level 4+. */
  depthAreasMet: string[]
  /** Depth-area skills still below level 4 — the role's real development list. */
  depthAreasMissing: string[]
}

export interface EmployeeSkillSummary {
  employeeId: string
  /** Rows carrying a rating. */
  assessed: number
  /** Catalog size, for judging how complete the assessment is. */
  catalogSize: number
  assessmentCompleteness: number
  breadth: number
  depth: number
  criticalBreadth: number
  avgLevel: number
  /** Share of assessed skills already at or above target. */
  targetAttainment: number
  highGaps: number
  breadthPct: number
  /**
   * Weighted share of *required* capability that is present:
   * Σ(min(final, target) × weight) / Σ(target × weight) across assessed skills.
   * Target-relative rather than out-of-5, so a skill targeted at 3 is not
   * penalised for sitting below 5.
   */
  capabilityIndex: number
  roleFit?: RoleFit
  lastAssessedAt?: string
}

export function summarizeEmployee(
  employee: Employee,
  catalog: SkillDefinition[],
  profiles: RoleProfile[] = ROLE_PROFILES,
  thresholds: SkillThresholds = DEFAULT_THRESHOLDS,
): EmployeeSkillSummary {
  const rows = resolveEmployeeSkills(employee, catalog)
  const rated = rows.filter(r => r.final !== undefined)

  const breadth = rated.filter(r => r.final! >= thresholds.breadth).length
  const depth = rated.filter(r => r.final! >= thresholds.depth).length
  const criticalBreadth = rated.filter(
    r => r.final! >= thresholds.breadth && r.definition.critical,
  ).length

  const sum = rated.reduce((acc, r) => acc + r.final!, 0)
  const atTarget = rated.filter(r => r.gap === 0).length
  const highGaps = rated.filter(r => r.priority === 'High').length

  let have = 0
  let need = 0
  for (const r of rated) {
    have += Math.min(r.final!, r.target) * r.definition.weight
    need += r.target * r.definition.weight
  }

  const profile = employee.roleProfileId
    ? profiles.find(p => p.id === employee.roleProfileId)
    : undefined

  const dates = rated.map(r => r.assessedAt).filter(Boolean) as string[]

  return {
    employeeId: employee.id,
    assessed: rated.length,
    catalogSize: catalog.length,
    assessmentCompleteness: catalog.length ? rated.length / catalog.length : 0,
    breadth,
    depth,
    criticalBreadth,
    avgLevel: rated.length ? sum / rated.length : 0,
    targetAttainment: rated.length ? atTarget / rated.length : 0,
    highGaps,
    breadthPct: rated.length ? breadth / rated.length : 0,
    capabilityIndex: need ? have / need : 0,
    roleFit: profile ? buildRoleFit(profile, rows, thresholds) : undefined,
    lastAssessedAt: dates.length ? dates.sort().at(-1) : undefined,
  }
}

function buildRoleFit(
  profile: RoleProfile,
  rows: ResolvedSkill[],
  thresholds: SkillThresholds,
): RoleFit {
  const byId = new Map(rows.map(r => [r.skillId, r]))
  const met: string[] = []
  const missing: string[] = []

  for (const id of profile.depthSkillIds) {
    const row = byId.get(id)
    if (!row) continue
    ;(row.final !== undefined && row.final >= thresholds.depth ? met : missing).push(id)
  }

  const rated = rows.filter(r => r.final !== undefined)
  return {
    profile,
    breadth: rated.filter(r => r.final! >= thresholds.breadth).length,
    breadthTarget: profile.breadthTarget,
    depth: rated.filter(r => r.final! >= thresholds.depth).length,
    depthTarget: profile.depthTarget,
    depthAreasMet: met,
    depthAreasMissing: missing,
  }
}

// ---------------------------------------------------------------------------
// Per-skill, across the team
// ---------------------------------------------------------------------------

export interface SkillCoverage {
  definition: SkillDefinition
  /** People at level 3+ — "working proficiency" in the rubric. */
  coverage: number
  /** People at level 2+ — "breadth/backup". */
  backupCoverage: number
  /** People at level 4+ — "depth/primary owner". */
  depthCount: number
  /** A critical skill with at most one depth owner is a single point of failure. */
  busFactorRisk: boolean
  assessedCount: number
  teamAvg: number
  /** Shortfall of the strongest person on the team against target. */
  gapToTarget: number
  /** People exactly one level below target — the cheapest capability to buy. */
  upskillCandidates: { employeeId: string; name: string; level: ProficiencyLevel }[]
  levels: { employeeId: string; name: string; level: ProficiencyLevel }[]
}

export function summarizeSkill(
  def: SkillDefinition,
  employees: Employee[],
  thresholds: SkillThresholds = DEFAULT_THRESHOLDS,
): SkillCoverage {
  const levels: SkillCoverage['levels'] = []

  for (const emp of employees) {
    const a = (emp.skills ?? []).find(s => s.skillId === def.id)
    const final = a ? finalRating(a) : undefined
    if (final === undefined) continue
    levels.push({ employeeId: emp.id, name: emp.name, level: final })
  }

  const coverage = levels.filter(l => l.level >= thresholds.coverage).length
  const depthCount = levels.filter(l => l.level >= thresholds.depth).length
  const best = levels.reduce((m, l) => Math.max(m, l.level), 0)
  const sum = levels.reduce((acc, l) => acc + l.level, 0)

  return {
    definition: def,
    coverage,
    backupCoverage: levels.filter(l => l.level >= thresholds.breadth).length,
    depthCount,
    busFactorRisk: def.critical && depthCount <= 1,
    assessedCount: levels.length,
    teamAvg: levels.length ? sum / levels.length : 0,
    gapToTarget: Math.max(0, def.targetLevel - best),
    upskillCandidates: levels
      .filter(l => l.level === def.targetLevel - 1)
      .sort((a, b) => b.level - a.level),
    levels,
  }
}

export function summarizeAllSkills(
  employees: Employee[],
  catalog: SkillDefinition[],
  thresholds: SkillThresholds = DEFAULT_THRESHOLDS,
): SkillCoverage[] {
  return catalog.map(def => summarizeSkill(def, employees, thresholds))
}

// ---------------------------------------------------------------------------
// Team level
// ---------------------------------------------------------------------------

export interface DomainSummary {
  domain: string
  skillCount: number
  criticalCount: number
  teamAvg: number
  /** Share of the domain's skills with at least one person at level 3+. */
  coveragePct: number
  /**
   * Share of this domain's *rated cells* (person × skill) that are at or above
   * target. Skill-level measures saturate on a team this size — "somebody can do
   * it" is almost always true — so attainment is measured per person.
   */
  atTargetPct: number
  busFactorRisks: number
  highGaps: number
}

export interface TeamSkillSummary {
  catalogSize: number
  assessedPeople: number
  /** Share of all person × skill cells carrying a rating. */
  assessmentCompleteness: number
  /** Share of critical skills with at least one person at level 3+. */
  criticalCoverage: number
  criticalSkillCount: number
  criticalUncovered: SkillCoverage[]
  busFactorRisks: SkillCoverage[]
  highPriorityGaps: number
  /** Skills nobody on the team has rated at all. */
  unassessedSkills: number
  domains: DomainSummary[]
  strengths: SkillCoverage[]
  risks: SkillCoverage[]
  /** Oldest rating date on the team, for judging freshness. */
  oldestAssessment?: string
}

export function summarizeTeam(
  employees: Employee[],
  catalog: SkillDefinition[],
  thresholds: SkillThresholds = DEFAULT_THRESHOLDS,
): TeamSkillSummary {
  const skills = summarizeAllSkills(employees, catalog, thresholds)
  const critical = skills.filter(s => s.definition.critical)

  let ratedCells = 0
  let highPriorityGaps = 0
  const dates: string[] = []

  for (const emp of employees) {
    for (const row of resolveEmployeeSkills(emp, catalog)) {
      if (row.final === undefined) continue
      ratedCells++
      if (row.priority === 'High') highPriorityGaps++
      if (row.assessedAt) dates.push(row.assessedAt)
    }
  }

  const domains: DomainSummary[] = []
  for (const s of skills) {
    let d = domains.find(x => x.domain === s.definition.domain)
    if (!d) {
      d = {
        domain: s.definition.domain,
        skillCount: 0, criticalCount: 0, teamAvg: 0,
        coveragePct: 0, atTargetPct: 0, busFactorRisks: 0, highGaps: 0,
      }
      domains.push(d)
    }
    d.skillCount++
    if (s.definition.critical) d.criticalCount++
    if (s.busFactorRisk) d.busFactorRisks++
    d.teamAvg += s.teamAvg
    if (s.coverage > 0) d.coveragePct++
  }
  for (const d of domains) {
    d.teamAvg = d.skillCount ? d.teamAvg / d.skillCount : 0
    d.coveragePct = d.skillCount ? d.coveragePct / d.skillCount : 0
  }

  // Second pass for the per-person domain measures.
  const domainCells = new Map<string, { rated: number; atTarget: number }>()
  for (const emp of employees) {
    for (const row of resolveEmployeeSkills(emp, catalog)) {
      const d = domains.find(x => x.domain === row.definition.domain)
      if (row.priority === 'High' && d) d.highGaps++
      if (row.final === undefined) continue
      const c = domainCells.get(row.definition.domain) ?? { rated: 0, atTarget: 0 }
      c.rated++
      if (row.gap === 0) c.atTarget++
      domainCells.set(row.definition.domain, c)
    }
  }
  for (const d of domains) {
    const c = domainCells.get(d.domain)
    d.atTargetPct = c && c.rated ? c.atTarget / c.rated : 0
  }

  const cells = employees.length * catalog.length

  return {
    catalogSize: catalog.length,
    assessedPeople: employees.filter(e => (e.skills ?? []).length > 0).length,
    assessmentCompleteness: cells ? ratedCells / cells : 0,
    criticalCoverage: critical.length
      ? critical.filter(s => s.coverage > 0).length / critical.length
      : 0,
    criticalSkillCount: critical.length,
    criticalUncovered: critical.filter(s => s.coverage === 0),
    busFactorRisks: skills.filter(s => s.busFactorRisk),
    highPriorityGaps,
    unassessedSkills: skills.filter(s => s.assessedCount === 0).length,
    domains,
    strengths: [...skills]
      .filter(s => s.assessedCount > 0)
      .sort((a, b) => b.teamAvg - a.teamAvg || b.coverage - a.coverage)
      .slice(0, 5),
    risks: [...skills]
      .filter(s => s.definition.critical)
      .sort(
        (a, b) =>
          a.depthCount - b.depthCount ||
          a.coverage - b.coverage ||
          b.gapToTarget - a.gapToTarget ||
          b.definition.weight - a.definition.weight,
      )
      .slice(0, 5),
    oldestAssessment: dates.length ? dates.sort()[0] : undefined,
  }
}

/** Every High/Medium gap on the team, worst first — drives Gaps & Risk and the plan seeder. */
export interface TeamGap {
  employeeId: string
  employeeName: string
  row: ResolvedSkill
}

export function collectGaps(
  employees: Employee[],
  catalog: SkillDefinition[],
  minGap = 1,
): TeamGap[] {
  const out: TeamGap[] = []
  for (const emp of employees) {
    for (const row of resolveEmployeeSkills(emp, catalog)) {
      if (row.gap === undefined || row.gap < minGap) continue
      out.push({ employeeId: emp.id, employeeName: emp.name, row })
    }
  }
  const rank: Record<SkillPriority, number> = { High: 0, Medium: 1, Low: 2, Maintain: 3 }
  return out.sort(
    (a, b) =>
      rank[a.row.priority!] - rank[b.row.priority!] ||
      b.row.gap! - a.row.gap! ||
      b.row.definition.weight - a.row.definition.weight,
  )
}
