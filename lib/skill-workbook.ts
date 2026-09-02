import type { Workbook, Worksheet } from 'exceljs'
import {
  CATALOG_SOURCES, PROFICIENCY_ANCHORS, ROLE_PROFILES, DEFAULT_THRESHOLDS,
} from './skill-catalog'
import type { RoleProfile, SkillDefinition, SkillThresholds } from './skill-catalog'
import {
  collectGaps, resolveEmployeeSkills, summarizeEmployee,
} from './skill-analytics'
import type { Employee } from './types'
import { parseProficiency } from './utils'

/**
 * Round-trip with `Automation_Team_Skills_Assessment_Matrix.xlsx`.
 *
 * Export writes live values *and* re-emits the reference workbook's formulas for
 * the derived columns, so the downloaded file keeps working as a standalone
 * offline template.
 *
 * Import covers the Skill Catalog and Role Profiles sheets only. Ratings are imported
 * server-side instead (see lib/assessment-import.ts) so a whole-team file is one
 * transactional write with an audit record.
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

/**
 * Maps a sheet's header row to 1-based column indices by label, so a sheet is
 * read by what its columns are *called* rather than a hardcoded position.
 *
 * Both workbook generators in this codebase (this file's own `buildWorkbook`,
 * and the standalone `scripts/build-workbooks.mjs` package) put the same
 * logical columns — Skill ID, Self rating, Evidence, etc. — at *different*
 * positions on the Assessment sheet. Reading by position silently misreads
 * one generator's file as the other's; reading by name works for both, and
 * for any hand-reordered file besides.
 */
function headerMap(sheet: Worksheet, headerRow = FIRST_ROW - 1): Map<string, number> {
  const map = new Map<string, number>()
  sheet.getRow(headerRow).eachCell((cell, col) => {
    const label = cellText(cell.value).trim().toLowerCase()
    if (label) map.set(label, col)
  })
  return map
}

/** First header whose lowercased text contains every given keyword. */
function findCol(headers: Map<string, number>, ...keywords: string[]): number | undefined {
  for (const [label, col] of Array.from(headers)) {
    if (keywords.every(k => label.includes(k))) return col
  }
  return undefined
}

/**
 * Finds a worksheet by name, tolerating case, surrounding whitespace and
 * minor rewording (e.g. "Roles", "Role Profile") — someone hand-building a
 * roles-only workbook to import rarely reproduces the exact export tab name.
 * Tries an exact (normalized) match first, then falls back to a sheet whose
 * name contains every keyword.
 */
function findSheet(wb: Workbook, exact: string, ...keywords: string[]): Worksheet | undefined {
  const target = exact.trim().toLowerCase()
  const byExact = wb.worksheets.find(ws => ws.name.trim().toLowerCase() === target)
  if (byExact) return byExact
  return wb.worksheets.find(ws => {
    const name = ws.name.trim().toLowerCase()
    return keywords.every(k => name.includes(k))
  })
}

function rowLabels(ws: Worksheet, rowNum: number): string[] {
  const labels: string[] = []
  ws.getRow(rowNum).eachCell(cell => labels.push(cellText(cell.value).trim().toLowerCase()))
  return labels
}

/** Header cells that must all appear (as substrings, in any column) for a row to count as that sheet's header. */
const ROLE_HEADER_ANCHORS = ['profile', 'primary outcome']
const CATALOG_HEADER_ANCHORS = ['skill id', 'critical']

/**
 * Locates a sheet and its header row by content rather than name or fixed
 * position. Tries the name-matched sheet first (the standard export layout,
 * header on row `FIRST_ROW - 1`), then scans every sheet's first rows for one
 * whose header cells contain every anchor — a hand-built file rarely
 * reproduces either the export's tab name or its row-4 header.
 */
function locateSheet(
  wb: Workbook, exactName: string, nameKeywords: string[], anchors: string[],
): { sheet: Worksheet; headerRow: number } | undefined {
  const named = findSheet(wb, exactName, ...nameKeywords)
  const candidates = named ? [named, ...wb.worksheets.filter(ws => ws !== named)] : wb.worksheets
  for (const ws of candidates) {
    const maxScan = Math.min(ws.rowCount, 15)
    for (let r = 1; r <= maxScan; r++) {
      const labels = rowLabels(ws, r)
      if (anchors.every(a => labels.some(l => l.includes(a)))) return { sheet: ws, headerRow: r }
    }
  }
  return undefined
}

/** Reads an uploaded workbook and reports what would change — never writes. */
export async function readWorkbook(
  file: File,
  catalog: SkillDefinition[],
  roleProfiles: RoleProfile[] = [],
): Promise<ImportPreview> {
  const ExcelJS = await loadExcel()
  const wb: Workbook = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const preview: ImportPreview = { catalogChanges: [], roleProfileChanges: [], errors: [] }

  const byCode = new Map(catalog.map(s => [s.code, s]))

  // --- Role Profiles sheet (optional) --------------------------------------
  // Read by header name, not position: this file's own export and the
  // standalone Team_Skills_Assessment_Matrix workbook use the same labels,
  // but a future reorder of either would silently break a position-based read.
  // Sheet name and header row are auto-detected too, since a hand-built
  // roles-only file rarely reproduces either the export's tab name or its
  // row-4 header position.
  const rolesLocated = locateSheet(wb, 'Role Profiles', ['role', 'profile'], ROLE_HEADER_ANCHORS)
  if (rolesLocated) {
    const { sheet: rolesSheet, headerRow: rolesHeaderRow } = rolesLocated
    const rh = headerMap(rolesSheet, rolesHeaderRow)
    const rCol = {
      name: findCol(rh, 'profile') ?? 1,
      outcome: findCol(rh, 'primary', 'outcome') ?? 2,
      depthAreas: findCol(rh, 'depth', 'areas') ?? 3,
      breadth: findCol(rh, 'working', 'breadth') ?? 4,
      ai: findCol(rh, 'ai-era') ?? findCol(rh, 'ai', 'expectation') ?? 5,
      evidence: findCol(rh, 'evidence') ?? 6,
      breadthTarget: findCol(rh, 'breadth', 'target') ?? 7,
      depthTarget: findCol(rh, 'depth', 'target') ?? 8,
      breadthPct: findCol(rh, 'breadth', '%') ?? 9,
      depthPct: findCol(rh, 'depth', '%') ?? 10,
    }

    const byRoleName = new Map(roleProfiles.map(p => [p.name.trim().toLowerCase(), p]))
    rolesSheet.eachRow((row, n) => {
      if (n <= rolesHeaderRow) return
      const name = cellText(row.getCell(rCol.name).value).trim()
      if (!name) return

      const breadthTarget =
        cellNumber(row.getCell(rCol.breadthTarget).value) ??
        targetFromPercent(cellText(row.getCell(rCol.breadthPct).value), catalog.length) ?? 0
      const depthTarget =
        cellNumber(row.getCell(rCol.depthTarget).value) ??
        targetFromPercent(cellText(row.getCell(rCol.depthPct).value), catalog.length) ?? 0

      const candidate: Omit<RoleProfile, 'id' | 'depthSkillIds'> = {
        name,
        primaryOutcome: cellText(row.getCell(rCol.outcome).value).trim(),
        depthAreas: cellText(row.getCell(rCol.depthAreas).value).trim(),
        workingBreadth: cellText(row.getCell(rCol.breadth).value).trim(),
        aiExpectation: cellText(row.getCell(rCol.ai).value).trim(),
        evidence: cellText(row.getCell(rCol.evidence).value).trim(),
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
  const catLocated = locateSheet(wb, 'Skill Catalog', ['skill', 'catalog'], CATALOG_HEADER_ANCHORS)
  if (catLocated) {
    const { sheet: catSheet, headerRow: catHeaderRow } = catLocated
    const ch = headerMap(catSheet, catHeaderRow)
    const cCol = {
      id: findCol(ch, 'skill', 'id') ?? 1,
      critical: findCol(ch, 'critical') ?? 7,
      target: findCol(ch, 'target') ?? 8,
      weight: findCol(ch, 'weight') ?? 9,
    }
    catSheet.eachRow((row, n) => {
      if (n <= catHeaderRow) return
      const code = Number(cellText(row.getCell(cCol.id).value))
      const def = byCode.get(code)
      if (!def) return
      const critical = cellText(row.getCell(cCol.critical).value).trim().toLowerCase() === 'yes'
      const target = parseProficiency(cellText(row.getCell(cCol.target).value))
      const weight = Number(cellText(row.getCell(cCol.weight).value))

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
  if (!rolesLocated && !catLocated) {
    preview.errors.push('No "Role Profiles" or "Skill Catalog" sheet found in this workbook.')
  }
  return preview
}
