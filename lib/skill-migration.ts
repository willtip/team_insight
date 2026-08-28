import { AAP_SKILL_CATALOG } from './skill-catalog'
import type { SkillDefinition } from './skill-catalog'
import { parseProficiency } from './utils'
import type { Employee, SkillAssessment } from './types'

/**
 * One-time conversion of the pre-catalog skill model.
 *
 * Old shape: skills denormalized onto each employee as
 * `{ id, name, category, currentLevel: 'Expert', targetLevel, score }`.
 * New shape: `{ skillId, selfRating, reviewerRating, ... }` referencing the catalog.
 */

export const LEGACY_EMPLOYEE_KEY = 'asi-employees'
export const EMPLOYEE_KEY = 'asi-employees-v2'
export const CATALOG_KEY = 'asi-skill-catalog'
const MIGRATION_FLAG = 'asi-skill-migration-v2'

/** Legacy skill names that have an honest equivalent in the AAP catalog. */
export const LEGACY_SKILL_MAP: Record<string, string> = {
  'AIOps': 'ai-10',            // AIOps and intelligent remediation
  'Ansible': 'aap-07',         // Playbook and role engineering
  'Python': 'swe-01',          // Python engineering
  'Kubernetes': 'plat-03',     // Kubernetes and OpenShift
  'Terraform': 'plat-05',      // Terraform and infrastructure as code
  'CI/CD': 'plat-04',          // CI/CD pipeline engineering
  'Observability': 'plat-09',  // Platform observability
  'ServiceNow': 'int-01',      // ServiceNow and ITSM integration
  'GenAI/LLMs': 'ai-01',       // AI-assisted automation development
}

/**
 * Legacy skills with no honest match in the catalog. Appended as custom entries
 * rather than dropped, so no existing rating disappears silently.
 */
export const LEGACY_EXTRA_SKILLS: SkillDefinition[] = [
  {
    id: 'custom-mlops', code: 900,
    domain: 'AI and agentic automation', subdomain: 'MLOps',
    name: 'MLOps and model operations',
    observableCapability:
      'Train, version, deploy, monitor and retrain models with reproducible pipelines and drift detection.',
    exampleEvidence: 'Production model pipeline with monitoring',
    critical: false, targetLevel: 3, weight: 1.3, custom: true,
  },
  {
    id: 'custom-typescript', code: 901,
    domain: 'Software engineering', subdomain: 'TypeScript',
    name: 'TypeScript and frontend engineering',
    observableCapability:
      'Build typed application code, component interfaces and tooling for automation portals and consoles.',
    exampleEvidence: 'Reviewed production repository',
    critical: false, targetLevel: 3, weight: 1.1, custom: true,
  },
]

interface LegacySkill {
  name?: string
  currentLevel?: string
  targetLevel?: string
  score?: number
  lastUpdated?: string
}

export function isLegacySkill(s: unknown): s is LegacySkill {
  return (
    !!s && typeof s === 'object' &&
    'name' in (s as object) && !('skillId' in (s as object))
  )
}

export function isLegacyEmployeeArray(data: unknown): boolean {
  return (
    Array.isArray(data) &&
    data.some(e => Array.isArray(e?.skills) && e.skills.some(isLegacySkill))
  )
}

/** Maps a legacy skill name to a catalog id, including the two custom fallbacks. */
export function legacySkillId(name: string): string | undefined {
  if (LEGACY_SKILL_MAP[name]) return LEGACY_SKILL_MAP[name]
  const extra = LEGACY_EXTRA_SKILLS.find(
    s => s.name.toLowerCase().startsWith(name.toLowerCase()),
  )
  return extra?.id
}

export function migrateEmployees(data: Employee[]): Employee[] {
  return data.map(emp => {
    if (!Array.isArray(emp.skills)) return { ...emp, skills: [] }

    const skills: SkillAssessment[] = []
    for (const s of emp.skills as unknown[]) {
      if (!isLegacySkill(s)) {
        skills.push(s as SkillAssessment)
        continue
      }
      const skillId = s.name ? legacySkillId(s.name) : undefined
      if (!skillId) continue

      // Legacy levels were 1-4 adjectives; parseProficiency lands Expert on 4,
      // leaving 5 (Strategic expert) as new headroom nobody is auto-promoted into.
      const reviewerRating = parseProficiency(s.currentLevel ?? s.score)
      const targetOverride = parseProficiency(s.targetLevel)

      skills.push({
        skillId,
        reviewerRating,
        targetOverride,
        assessedAt: s.lastUpdated,
        assessedBy: 'Migrated',
      })
    }
    return { ...emp, skills }
  })
}

/**
 * Idempotent. Safe to call from any provider's hydrate effect regardless of order:
 * it converts the legacy employee payload and makes sure the catalog carries the
 * custom entries those ratings depend on.
 */
export function ensureMigrated(): void {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return

    const legacyRaw = localStorage.getItem(LEGACY_EMPLOYEE_KEY)
    const alreadyMigrated = localStorage.getItem(EMPLOYEE_KEY)

    if (legacyRaw && !alreadyMigrated) {
      const parsed = JSON.parse(legacyRaw)
      if (isLegacyEmployeeArray(parsed)) {
        localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(migrateEmployees(parsed)))

        const catalogRaw = localStorage.getItem(CATALOG_KEY)
        const base: SkillDefinition[] = catalogRaw ? JSON.parse(catalogRaw) : AAP_SKILL_CATALOG
        const missing = LEGACY_EXTRA_SKILLS.filter(x => !base.some(s => s.id === x.id))
        if (missing.length) {
          localStorage.setItem(CATALOG_KEY, JSON.stringify([...base, ...missing]))
        }
      }
    }
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
  } catch {}
}
