import type { Workbook, Worksheet } from 'exceljs'
import {
  CATALOG_SOURCES, PROFICIENCY_ANCHORS, ROLE_PROFILES, DEFAULT_THRESHOLDS,
} from './skill-catalog'
import type { RoleProfile, SkillDefinition, SkillThresholds } from './skill-catalog'
import {
  collectGaps, resolveEmployeeSkills, summarizeEmployee,
} from './skill-analytics'
import type { Employee, ProficiencyLevel, SkillAssessment } from './types'
import { parseProficiency } from './utils'

/**
 * Round-trip with `Automation_Team_Skills_Assessment_Matrix.xlsx`.
 *
 * Export writes live values *and* re-emits the reference workbook's formulas for
 * the derived columns, so the downloaded file keeps working as a standalone
 * offline template. Import reads a filled Assessment sheet back in.
 */

/** First data row in every sheet of the reference workbook. */
const FIRST_ROW = 5
/** The reference workbook's Assessment range. Kept as a floor for familiarity. */
const REFERENCE_LAST_ROW = 704

async function loadExcel() {
  // Kept out of the initial bundle; ~1MB only loads when someone imports/exports.
  const mod = await import('exceljs')
  return (mod as unknown as { default?: typeof import('exceljs') }).default ?? mod
}

function titleRows(ws: Worksheet, title: string, subtitle: string, headers: string[]) {
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = subtitle
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } }

  const header = ws.getRow(4)
  header.values = headers
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  header.height = 28
  ws.views = [{ state: 'frozen', ySplit: 4 }]
}

function widths(ws: Worksheet, cols: number[]) {
  cols.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function buildWorkbook(
  employees: Employee[],
  catalog: SkillDefinition[],
  roleProfiles: RoleProfile[] = ROLE_PROFILES,
  thresholds: SkillThresholds = DEFAULT_THRESHOLDS,
): Promise<Blob> {
  const ExcelJS = await loadExcel()
  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = 'Team Insight'
  wb.created = new Date()

  // --- Read Me -------------------------------------------------------------
  const readme = wb.addWorksheet('Read Me')
  titleRows(
    readme,
    'Automation Team Skills Assessment Matrix',
    'Exported from Team Insight. Measures platform capability and the broader engineering skills required for success.',
    ['Topic', 'Guidance'],
  )
  const guidance: [string, string][] = [
    ['Purpose', 'Measure platform capability and the broader software, DevOps, integration, reliability, security, product and AI skills required for success.'],
    ['Breadth', `Count skills at level ${thresholds.breadth} or above — the person can work the skill.`],
    ['Depth', `Count skills at level ${thresholds.depth} or above — the person owns the skill.`],
    ['Coverage', `Count people at level ${thresholds.coverage} or above — the team is covered for the skill.`],
    ['Usage', 'Tailor targets, assess with evidence, calibrate ratings, review team coverage, then convert gaps into work-based development plans.'],
    ['Guardrail', 'Use for capability planning and growth, not forced ranking.'],
    ['Round-trip', 'Edit the Self rating, Reviewer rating and Evidence columns on the Assessment sheet, then import this file back into Team Insight. Skill ID and Employee are the match keys — do not edit them.'],
  ]
  guidance.forEach((row, i) => { readme.getRow(FIRST_ROW + i).values = row })
  widths(readme, [16, 120])
  readme.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  // --- Skill Catalog -------------------------------------------------------
  const cat = wb.addWorksheet('Skill Catalog')
  titleRows(cat, 'Skill Catalog', 'Adjust criticality, target levels and weights.', [
    'Skill ID', 'Domain', 'Subdomain', 'Skill', 'Observable capability',
    'Example evidence', 'Critical?', 'Target level', 'Weight',
  ])
  catalog.forEach((s, i) => {
    cat.getRow(FIRST_ROW + i).values = [
      s.code, s.domain, s.subdomain, s.name, s.observableCapability,
      s.exampleEvidence, s.critical ? 'Yes' : 'No', s.targetLevel, s.weight,
    ]
  })
  widths(cat, [9, 26, 16, 34, 62, 34, 10, 12, 9])

  // --- Assessment ----------------------------------------------------------
  const asmt = wb.addWorksheet('Assessment')
  titleRows(
    asmt,
    'Individual Assessment',
    'Reviewer rating supersedes self rating. Gap and Priority are calculated.',
    [
      'Employee', 'Role', 'Manager', 'Assessment date', 'Skill ID', 'Domain', 'Skill',
      'Critical?', 'Target', 'Self rating', 'Reviewer rating', 'Final rating', 'Gap',
      'Evidence / link', 'Priority',
    ],
  )

  let r = FIRST_ROW
  for (const emp of employees) {
    for (const row of resolveEmployeeSkills(emp, catalog)) {
      if (row.self === undefined && row.reviewer === undefined) continue
      const sheetRow = asmt.getRow(r)
      sheetRow.getCell(1).value = emp.name
      sheetRow.getCell(2).value = emp.title
      sheetRow.getCell(3).value = emp.managerName
      sheetRow.getCell(4).value = row.assessedAt ? row.assessedAt.slice(0, 10) : ''
      sheetRow.getCell(5).value = row.definition.code
      sheetRow.getCell(6).value = row.definition.domain
      sheetRow.getCell(7).value = row.definition.name
      sheetRow.getCell(8).value = row.definition.critical ? 'Yes' : 'No'
      sheetRow.getCell(9).value = row.target
      sheetRow.getCell(10).value = row.self ?? ''
      sheetRow.getCell(11).value = row.reviewer ?? ''
      // Derived columns keep the reference workbook's formulas so the file
      // still calculates when edited outside the app.
      sheetRow.getCell(12).value = { formula: `IF(K${r}<>"",K${r},IF(J${r}<>"",J${r},""))`, result: row.final ?? '' }
      sheetRow.getCell(13).value = { formula: `IF(OR(L${r}="",I${r}=""),"",MAX(0,I${r}-L${r}))`, result: row.gap ?? '' }
      sheetRow.getCell(14).value = row.evidenceUrl
        ? { text: row.evidence || row.evidenceUrl, hyperlink: row.evidenceUrl }
        : (row.evidence ?? '')
      sheetRow.getCell(15).value = {
        formula: `IF(M${r}="","",IF(AND(H${r}="Yes",M${r}>=2),"High",IF(M${r}>=2,"Medium",IF(M${r}=1,"Low","Maintain"))))`,
        result: row.priority ?? '',
      }
      r++
    }
  }
  widths(asmt, [18, 26, 16, 15, 9, 26, 34, 10, 9, 11, 13, 12, 8, 34, 11])

  // Rollup formulas must span every row actually written, not just the
  // reference workbook's 704 — a larger team would otherwise be under-counted.
  const lastRow = Math.max(REFERENCE_LAST_ROW, r + 200)

  // --- Team Summary --------------------------------------------------------
  const sum = wb.addWorksheet('Team Summary')
  titleRows(sum, 'Team Coverage', 'Rollups calculated from the Assessment sheet.', [
    'Employee', 'Role', 'Assessed', `Breadth >=${thresholds.breadth}`,
    `Depth >=${thresholds.depth}`, 'Critical breadth',
    'Average level', 'Target attainment', 'High gaps', 'Breadth %',
  ])
  employees.forEach((emp, i) => {
    const n = FIRST_ROW + i
    const s = summarizeEmployee(emp, catalog, roleProfiles, thresholds)
    const row = sum.getRow(n)
    row.getCell(1).value = emp.name
    row.getCell(2).value = emp.title
    const A = `Assessment!$A$${FIRST_ROW}:$A$${lastRow}`
    const L = `Assessment!$L$${FIRST_ROW}:$L$${lastRow}`
    const M = `Assessment!$M$${FIRST_ROW}:$M$${lastRow}`
    const H = `Assessment!$H$${FIRST_ROW}:$H$${lastRow}`
    const O = `Assessment!$O$${FIRST_ROW}:$O$${lastRow}`
    row.getCell(3).value = { formula: `IF(A${n}="","",COUNTIFS(${A},A${n},${L},">="&0))`, result: s.assessed }
    row.getCell(4).value = { formula: `IF(A${n}="","",COUNTIFS(${A},A${n},${L},">="&${thresholds.breadth}))`, result: s.breadth }
    row.getCell(5).value = { formula: `IF(A${n}="","",COUNTIFS(${A},A${n},${L},">="&${thresholds.depth}))`, result: s.depth }
    row.getCell(6).value = { formula: `IF(A${n}="","",COUNTIFS(${A},A${n},${L},">="&${thresholds.breadth},${H},"Yes"))`, result: s.criticalBreadth }
    row.getCell(7).value = { formula: `IFERROR(AVERAGEIFS(${L},${A},A${n}),"")`, result: Number(s.avgLevel.toFixed(2)) }
    row.getCell(8).value = { formula: `IFERROR(COUNTIFS(${A},A${n},${M},0)/COUNTIF(${A},A${n}),"")`, result: Number(s.targetAttainment.toFixed(4)) }
    row.getCell(9).value = { formula: `IF(A${n}="","",COUNTIFS(${A},A${n},${O},"High"))`, result: s.highGaps }
    row.getCell(10).value = { formula: `IFERROR(D${n}/C${n},"")`, result: Number(s.breadthPct.toFixed(4)) }
    row.getCell(8).numFmt = '0%'
    row.getCell(10).numFmt = '0%'
    row.getCell(7).numFmt = '0.0'
  })
  widths(sum, [18, 26, 10, 12, 11, 15, 13, 16, 10, 10])

  // --- Role Profiles -------------------------------------------------------
  const roles = wb.addWorksheet('Role Profiles')
  titleRows(
    roles,
    'Role Profiles',
    'Every role needs a common engineering foundation, meaningful platform capability, and one or more areas of depth.',
    ['Profile', 'Primary outcome', 'Depth areas', 'Working breadth', 'AI-era expectation',
      'Evidence', 'Breadth target', 'Depth target', 'Breadth as % of catalog', 'Depth as % of catalog'],
  )
  const catalogCount = `COUNTA('Skill Catalog'!$A$${FIRST_ROW}:$A$500)`
  roleProfiles.forEach((p, i) => {
    const n = FIRST_ROW + i
    const row = roles.getRow(n)
    row.values = [
      p.name, p.primaryOutcome, p.depthAreas, p.workingBreadth,
      p.aiExpectation, p.evidence, p.breadthTarget, p.depthTarget,
    ]
    row.getCell(9).value = {
      formula: `IFERROR($G${n}/${catalogCount},"")`,
      result: catalog.length ? p.breadthTarget / catalog.length : '',
    }
    row.getCell(10).value = {
      formula: `IFERROR($H${n}/${catalogCount},"")`,
      result: catalog.length ? p.depthTarget / catalog.length : '',
    }
    row.getCell(9).numFmt = '0%'
    row.getCell(10).numFmt = '0%'
  })
  widths(roles, [30, 42, 52, 46, 46, 40, 14, 13, 16, 16])

  // --- Scoring Guide -------------------------------------------------------
  const guide = wb.addWorksheet('Scoring Guide')
  titleRows(guide, 'Proficiency Anchors', 'Use recent demonstrated evidence.', [
    'Level', 'Label', 'Independence', 'Scope', 'Observable behavior', 'Evidence', 'Coverage meaning',
  ])
  PROFICIENCY_ANCHORS.forEach((a, i) => {
    guide.getRow(FIRST_ROW + i).values = [
      a.level, a.label, a.independence, a.scope, a.observableBehavior, a.evidence, a.coverageMeaning,
    ]
  })
  widths(guide, [8, 22, 24, 22, 40, 20, 26])

  // --- Development Plan ----------------------------------------------------
  const plan = wb.addWorksheet('Development Plan')
  titleRows(plan, 'Development Plan', 'Convert gaps into assignments.', [
    'Employee', 'Skill ID', 'Skill', 'Current', 'Target', 'Gap', 'Objective',
    'Experience assignment', 'Coach / reviewer', 'Course / lab', 'Due date', 'Success evidence',
  ])
  const byId = new Map(catalog.map(s => [s.id, s]))
  let p = FIRST_ROW
  for (const emp of employees) {
    for (const item of emp.developmentPlan ?? []) {
      const def = byId.get(item.skillId)
      const gap = collectGaps([emp], catalog, 0).find(g => g.row.skillId === item.skillId)
      plan.getRow(p++).values = [
        emp.name, def?.code ?? '', def?.name ?? item.skillId,
        gap?.row.final ?? '', gap?.row.target ?? def?.targetLevel ?? '', gap?.row.gap ?? '',
        item.objective, item.experienceAssignment, item.coach, item.course,
        item.dueDate, item.successEvidence,
      ]
    }
  }
  widths(plan, [18, 9, 34, 9, 8, 7, 46, 30, 18, 22, 12, 34])

  // --- Sources -------------------------------------------------------------
  const sources = wb.addWorksheet('Sources')
  titleRows(sources, 'Reference Sources', 'Sources informing the matrix.', [
    'Source', 'URL', 'Relevance', 'Accessed',
  ])
  CATALOG_SOURCES.forEach((s, i) => {
    sources.getRow(FIRST_ROW + i).values = [s.name, s.url, s.relevance, s.accessed]
  })
  widths(sources, [40, 60, 60, 12])

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadWorkbook(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportChange {
  employeeId: string
  employeeName: string
  skillId: string
  skillName: string
  field: 'selfRating' | 'reviewerRating' | 'evidence'
  from: string
  to: string
}

/** One row on the Role Profiles sheet, matched against the app's profiles by name. */
export interface RoleProfileChange {
  name: string
  action: 'add' | 'update'
  /** Set when matched to an existing profile — the id `updateRoleProfile` needs. */
  existingId?: string
  /** Full field set to write, whether creating or updating. */
  profile: Omit<RoleProfile, 'id' | 'depthSkillIds'>
  /** Populated for 'update' only — which fields actually differ, and how. */
  fieldChanges: { field: string; from: string; to: string }[]
}

export interface ImportPreview {
  changes: ImportChange[]
  rowsRead: number
  unmatchedEmployees: string[]
  unknownSkillCodes: number[]
  /** Catalog rows whose criticality, target or weight differ from the file. */
  catalogChanges: { skillId: string; name: string; field: string; from: string; to: string }[]
  /** Role Profiles sheet rows that would add a new profile or change an existing one. */
  roleProfileChanges: RoleProfileChange[]
  errors: string[]
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string }
    if (o.richText) return o.richText.map(t => t.text).join('')
    if (o.text !== undefined) return String(o.text)
    if (o.result !== undefined) return String(o.result)
    return ''
  }
  return String(v)
}

/** Parses a target-count cell, tolerating blanks. */
function cellNumber(v: unknown): number | undefined {
  const n = Number(cellText(v).trim())
  return Number.isFinite(n) && cellText(v).trim() !== '' ? n : undefined
}

/**
 * Falls back a missing breadth/depth target to a percentage-of-catalog cell.
 * Excel stores a `0%`-formatted cell as the underlying fraction (e.g. 0.65),
 * but tolerates someone typing a bare "65" meaning 65% too.
 */
function targetFromPercent(pctCellText: string, catalogSize: number): number | undefined {
  const raw = Number(pctCellText.trim().replace(/%$/, ''))
  if (!Number.isFinite(raw) || pctCellText.trim() === '') return undefined
  const fraction = raw > 1 ? raw / 100 : raw
  return Math.round(fraction * catalogSize)
}

/** Reads an uploaded workbook and reports what would change — never writes. */
export async function readWorkbook(
  file: File,
  employees: Employee[],
  catalog: SkillDefinition[],
  roleProfiles: RoleProfile[] = [],
): Promise<ImportPreview> {
  const ExcelJS = await loadExcel()
  const wb: Workbook = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const preview: ImportPreview = {
    changes: [], rowsRead: 0, unmatchedEmployees: [],
    unknownSkillCodes: [], catalogChanges: [], roleProfileChanges: [], errors: [],
  }

  const byCode = new Map(catalog.map(s => [s.code, s]))
  const byName = new Map(employees.map(e => [e.name.trim().toLowerCase(), e]))

  // --- Role Profiles sheet (optional) --------------------------------------
  // Column order matches both this file's own export and the standalone
  // Team_Skills_Assessment_Matrix workbook, so either can be re-imported:
  // Profile, Primary outcome, Depth areas, Working breadth, AI-era expectation,
  // Evidence, Breadth target, Depth target, [Breadth %, Depth %].
  const rolesSheet = wb.getWorksheet('Role Profiles')
  if (rolesSheet) {
    const byRoleName = new Map(roleProfiles.map(p => [p.name.trim().toLowerCase(), p]))
    rolesSheet.eachRow((row, n) => {
      if (n < FIRST_ROW) return
      const name = cellText(row.getCell(1).value).trim()
      if (!name) return

      const breadthTarget =
        cellNumber(row.getCell(7).value) ?? targetFromPercent(cellText(row.getCell(9).value), catalog.length) ?? 0
      const depthTarget =
        cellNumber(row.getCell(8).value) ?? targetFromPercent(cellText(row.getCell(10).value), catalog.length) ?? 0

      const candidate: Omit<RoleProfile, 'id' | 'depthSkillIds'> = {
        name,
        primaryOutcome: cellText(row.getCell(2).value).trim(),
        depthAreas: cellText(row.getCell(3).value).trim(),
        workingBreadth: cellText(row.getCell(4).value).trim(),
        aiExpectation: cellText(row.getCell(5).value).trim(),
        evidence: cellText(row.getCell(6).value).trim(),
        breadthTarget,
        depthTarget,
      }

      const existing = byRoleName.get(name.toLowerCase())
      if (!existing) {
        preview.roleProfileChanges.push({ name, action: 'add', profile: candidate, fieldChanges: [] })
        return
      }

      const fieldChanges: { field: string; from: string; to: string }[] = []
      const compare = (field: string, from: string | number, to: string | number) => {
        if (String(from) !== String(to)) fieldChanges.push({ field, from: String(from), to: String(to) })
      }
      compare('Primary outcome', existing.primaryOutcome, candidate.primaryOutcome)
      compare('Depth areas', existing.depthAreas, candidate.depthAreas)
      compare('Working breadth', existing.workingBreadth, candidate.workingBreadth)
      compare('AI-era expectation', existing.aiExpectation, candidate.aiExpectation)
      compare('Evidence', existing.evidence, candidate.evidence)
      compare('Breadth target', existing.breadthTarget, candidate.breadthTarget)
      compare('Depth target', existing.depthTarget, candidate.depthTarget)

      if (fieldChanges.length > 0) {
        preview.roleProfileChanges.push({
          name, action: 'update', existingId: existing.id, profile: candidate, fieldChanges,
        })
      }
    })
  }

  // --- Skill Catalog sheet (optional) --------------------------------------
  const catSheet = wb.getWorksheet('Skill Catalog')
  if (catSheet) {
    catSheet.eachRow((row, n) => {
      if (n < FIRST_ROW) return
      const code = Number(cellText(row.getCell(1).value))
      const def = byCode.get(code)
      if (!def) return
      const critical = cellText(row.getCell(7).value).trim().toLowerCase() === 'yes'
      const target = parseProficiency(cellText(row.getCell(8).value))
      const weight = Number(cellText(row.getCell(9).value))

      if (critical !== def.critical) {
        preview.catalogChanges.push({
          skillId: def.id, name: def.name, field: 'critical',
          from: def.critical ? 'Yes' : 'No', to: critical ? 'Yes' : 'No',
        })
      }
      if (target !== undefined && target !== def.targetLevel) {
        preview.catalogChanges.push({
          skillId: def.id, name: def.name, field: 'target',
          from: String(def.targetLevel), to: String(target),
        })
      }
      if (Number.isFinite(weight) && weight !== def.weight) {
        preview.catalogChanges.push({
          skillId: def.id, name: def.name, field: 'weight',
          from: String(def.weight), to: String(weight),
        })
      }
    })
  }

  // --- Assessment sheet ----------------------------------------------------
  const sheet = wb.getWorksheet('Assessment')
  if (!sheet) {
    // A workbook can legitimately carry only a Role Profiles and/or Skill
    // Catalog sheet (e.g. one sheet copied out of the full export), so only
    // treat this as an error when nothing importable was found at all.
    if (!rolesSheet && !catSheet) {
      preview.errors.push('No "Assessment", "Role Profiles" or "Skill Catalog" sheet found in this workbook.')
    }
    return preview
  }

  const missingPeople = new Set<string>()
  const missingCodes = new Set<number>()

  sheet.eachRow((row, n) => {
    if (n < FIRST_ROW) return
    const empName = cellText(row.getCell(1).value).trim()
    const codeText = cellText(row.getCell(5).value).trim()
    if (!empName && !codeText) return

    preview.rowsRead++

    const emp = byName.get(empName.toLowerCase())
    if (!emp) { if (empName) missingPeople.add(empName); return }

    const code = Number(codeText)
    const def = byCode.get(code)
    if (!def) { if (Number.isFinite(code)) missingCodes.add(code); return }

    const current: SkillAssessment =
      (emp.skills ?? []).find(s => s.skillId === def.id) ?? { skillId: def.id }

    const push = (
      field: ImportChange['field'],
      from: ProficiencyLevel | string | undefined,
      to: ProficiencyLevel | string | undefined,
    ) => {
      const f = from === undefined || from === '' ? '—' : String(from)
      const t = to === undefined || to === '' ? '—' : String(to)
      if (f === t) return
      preview.changes.push({
        employeeId: emp.id, employeeName: emp.name,
        skillId: def.id, skillName: def.name, field, from: f, to: t,
      })
    }

    push('selfRating', current.selfRating, parseProficiency(cellText(row.getCell(10).value)))
    push('reviewerRating', current.reviewerRating, parseProficiency(cellText(row.getCell(11).value)))

    const evidence = cellText(row.getCell(14).value).trim()
    if (evidence || current.evidence) push('evidence', current.evidence, evidence)
  })

  preview.unmatchedEmployees = Array.from(missingPeople)
  preview.unknownSkillCodes = Array.from(missingCodes)
  return preview
}

/** Folds an approved preview into the batched-write shape the employee store takes. */
export function previewToEdits(
  preview: ImportPreview,
): Record<string, Record<string, Partial<SkillAssessment>>> {
  const out: Record<string, Record<string, Partial<SkillAssessment>>> = {}
  const stamp = new Date().toISOString()

  for (const c of preview.changes) {
    const forEmployee = (out[c.employeeId] ??= {})
    const patch = (forEmployee[c.skillId] ??= { assessedAt: stamp, assessedBy: 'Workbook import' })
    if (c.field === 'evidence') {
      patch.evidence = c.to === '—' ? undefined : c.to
    } else {
      patch[c.field] = c.to === '—' ? undefined : (Number(c.to) as ProficiencyLevel)
    }
  }
  return out
}
