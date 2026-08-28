/**
 * Builds the standalone Excel assessment package from the app's own catalog,
 * so the spreadsheets and the Skills Matrix can never drift apart.
 *
 *   node scripts/build-workbooks.mjs [outDir]
 *
 * Emits:
 *   Team_Skills_Assessment_Matrix_TEMPLATE.xlsx  — blank, for real use
 *   Team_Skills_Assessment_Matrix_EXAMPLE.xlsx   — populated worked example
 *   Skills_Self_Assessment_INTAKE.xlsx           — the engineer-facing form
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ExcelJS = require('exceljs')

// The wrapping npm script always compiles lib/ into .tmp-lib next to this
// script's own repo root — found relative to __dirname rather than an env var,
// so this works the same in bash, PowerShell and cmd.exe.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIB = path.join(ROOT, '.tmp-lib')
const { AAP_SKILL_CATALOG, ROLE_PROFILES, PROFICIENCY_ANCHORS, CATALOG_SOURCES, DEFAULT_THRESHOLDS } =
  require(path.join(LIB, 'skill-catalog.js'))
const { EMPLOYEES } = require(path.join(LIB, 'mock-data.js'))

const OUT = process.argv[2] ?? 'build/workbooks'
const FIRST = 5            // first data row, matching the reference workbook
const LAST = 3000          // formula range ceiling on the Assessment sheet

// ---------------------------------------------------------------------------
// Shared styling
// ---------------------------------------------------------------------------

const INK = 'FF1E293B'
const MUTED = 'FF64748B'
const ACCENT = 'FF2563EB'
const INPUT_FILL = 'FFFEF9E7'   // pale yellow = "you type here"
const CALC_FILL = 'FFF1F5F9'    // pale slate = "calculated, do not type"

function titleBlock(ws, title, subtitle, headers, opts = {}) {
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 15, color: { argb: INK } }
  ws.getCell('A2').value = subtitle
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: MUTED } }

  const row = ws.getRow(4)
  row.values = headers
  row.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  row.alignment = { vertical: 'middle', wrapText: true }
  row.height = opts.headerHeight ?? 30
  row.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
    c.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
  })
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: opts.xSplit ?? 0 }]
}

const widths = (ws, cols) => cols.forEach((w, i) => { ws.getColumn(i + 1).width = w })

/** Colour ramp matching the app's heat map, applied to a 0-5 rating column. */
function ratingScale(ws, ref) {
  ws.addConditionalFormatting({
    ref,
    rules: [{
      type: 'colorScale',
      priority: 10,
      cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 3 }, { type: 'num', value: 5 }],
      color: [{ argb: 'FFF1F5F9' }, { argb: 'FF93C5FD' }, { argb: 'FF1D4ED8' }],
    }],
  })
}

function textRule(ws, ref, text, bg, fg, priority = 1) {
  ws.addConditionalFormatting({
    ref,
    rules: [{
      type: 'containsText', operator: 'containsText', text, priority,
      style: { font: { color: { argb: fg }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: bg } } },
    }],
  })
}

/** Marks a range as an input area and adds a 0-5 whole-number validation. */
function ratingInput(ws, colLetter, from, to, promptTitle) {
  for (let r = from; r <= to; r++) {
    const cell = ws.getCell(`${colLetter}${r}`)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    cell.alignment = { horizontal: 'center' }
    cell.dataValidation = {
      type: 'whole', operator: 'between', allowBlank: true,
      formulae: [0, 5], showInputMessage: true, showErrorMessage: true,
      promptTitle,
      prompt:
        '0 Not exposed · 1 Aware · 2 Guided practitioner\n' +
        '3 Independent · 4 Advanced/lead · 5 Strategic expert\n\n' +
        'Rate on recent demonstrated evidence, not familiarity.',
      errorTitle: 'Use the 0-5 scale',
      error: 'Enter a whole number between 0 and 5, or leave blank if not assessed.',
    }
  }
}

function calcRange(ws, colLetters, from, to) {
  for (const col of colLetters) {
    for (let r = from; r <= to; r++) {
      ws.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } }
    }
  }
}

// ---------------------------------------------------------------------------
// Master workbook
// ---------------------------------------------------------------------------

async function buildMaster({ populated }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Team Insight'
  wb.created = new Date()

  const roster = populated
    ? EMPLOYEES.map(e => ({ name: e.name, title: e.title, roleId: e.roleProfileId, manager: e.managerName }))
    : []
  const roleName = id => ROLE_PROFILES.find(p => p.id === id)?.name ?? ''

  // --- Read Me -------------------------------------------------------------
  const readme = wb.addWorksheet('Read Me', { properties: { tabColor: { argb: ACCENT } } })
  titleBlock(
    readme,
    'Technical Skills Assessment — Operating Instructions',
    populated
      ? 'WORKED EXAMPLE. Populated with sample data so you can see every calculation live.'
      : 'Blank template. Start on the Roster sheet.',
    ['Step', 'What to do', 'Where'],
    { headerHeight: 22 },
  )
  const steps = [
    ['1. Calibrate', 'Read the proficiency anchors before rating anything. If two managers mean different things by "level 3", none of the downstream numbers mean anything.', 'Scoring Guide'],
    ['2. Tailor', 'Adjust which skills are Critical, set Target levels, and delete anything that does not apply to your team. Targets drive every gap calculation.', 'Skill Catalog'],
    ['3. Set the bar', 'Confirm the levels at which breadth, coverage and depth start counting. These define what the words mean throughout the workbook.', 'Settings'],
    ['4. List the team', 'Enter each engineer once and assign a role profile. That sets the breadth and depth targets they are measured against.', 'Roster'],
    ['5. Collect self-assessments', 'Send each engineer the separate Self-Assessment Intake workbook. Paste the block from their "Send to Manager" sheet into the Intake sheet here.', 'Intake'],
    ['6. Review', 'Add your Reviewer rating beside each self rating. The reviewer rating supersedes the self rating wherever both exist.', 'Assessment'],
    ['7. Read the result', 'Per-person rollups, per-skill coverage and single points of failure calculate themselves.', 'Team Summary · Skill Coverage'],
    ['8. Convert to work', 'Turn the High-priority gaps into assignments with a coach, a due date and an evidence bar.', 'Development Plan'],
  ]
  steps.forEach((s, i) => {
    const r = readme.getRow(FIRST + i)
    r.values = s
    r.alignment = { vertical: 'top', wrapText: true }
    r.height = 34
    r.getCell(1).font = { bold: true }
  })

  let r = FIRST + steps.length + 1
  const notes = [
    ['HOW RATINGS RESOLVE', 'Final = Reviewer rating if present, otherwise Self rating. Gap = Target − Final, floored at zero. Priority is High when a Critical skill sits 2 or more levels below target.'],
    ['COLOUR KEY', 'Pale yellow cells are for you to type in. Pale grey cells are calculated — overwriting them breaks the sheet.'],
    ['COMPATIBILITY', 'Standard formulas only — works in Excel 2016 and later, Excel for Mac, and Google Sheets (via File > Import).'],
    ['GUARDRAIL', 'This measures capability for planning and growth. It is not a performance rating and must not be used for forced ranking.'],
  ]
  notes.forEach(([k, v], i) => {
    const row = readme.getRow(r + i)
    row.getCell(1).value = k
    row.getCell(1).font = { bold: true, size: 9, color: { argb: MUTED } }
    row.getCell(2).value = v
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.height = 30
  })
  widths(readme, [22, 105, 28])

  // --- Settings ------------------------------------------------------------
  const set = wb.addWorksheet('Settings')
  titleBlock(set, 'Measurement Settings', 'These three levels define what breadth, coverage and depth mean everywhere in this workbook.',
    ['Threshold', 'Level', 'Meaning', 'What it drives'], { headerHeight: 22 })
  const thresholdRows = [
    ['Breadth', DEFAULT_THRESHOLDS.breadth, 'An engineer counts as HAVING a skill at this level or above.', 'Breadth counts on Team Summary; every role profile breadth target.'],
    ['Coverage', DEFAULT_THRESHOLDS.coverage, 'The TEAM is covered for a skill once somebody reaches this level.', 'Coverage column on Skill Coverage.'],
    ['Depth', DEFAULT_THRESHOLDS.depth, 'An engineer OWNS a skill at this level or above.', 'Depth counts; role depth targets; single-point-of-failure detection.'],
  ]
  thresholdRows.forEach((row, i) => {
    const rr = set.getRow(FIRST + i)
    rr.values = row
    rr.alignment = { vertical: 'top', wrapText: true }
    rr.height = 28
    rr.getCell(1).font = { bold: true }
    const b = rr.getCell(2)
    b.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    b.alignment = { horizontal: 'center' }
    b.font = { bold: true, size: 12 }
    b.dataValidation = {
      type: 'whole', operator: 'between', allowBlank: false, formulae: [0, 5],
      showErrorMessage: true, errorTitle: 'Use the 0-5 scale', error: 'Enter a whole number between 0 and 5.',
    }
  })
  set.getCell(`A${FIRST + 4}`).value = 'Raising a threshold does not change anyone’s capability — only what you are willing to call breadth, coverage or ownership. Expect counts to fall. Keep them ordered: breadth ≤ coverage ≤ depth.'
  set.getCell(`A${FIRST + 4}`).font = { italic: true, size: 9, color: { argb: MUTED } }
  set.mergeCells(`A${FIRST + 4}:D${FIRST + 4}`)
  set.getRow(FIRST + 4).height = 26
  set.getRow(FIRST + 4).alignment = { wrapText: true, vertical: 'top' }
  widths(set, [16, 10, 60, 62])

  wb.definedNames.add(`Settings!$B$${FIRST}`, 'ThrBreadth')
  wb.definedNames.add(`Settings!$B$${FIRST + 1}`, 'ThrCoverage')
  wb.definedNames.add(`Settings!$B$${FIRST + 2}`, 'ThrDepth')

  // --- Scoring Guide -------------------------------------------------------
  const guide = wb.addWorksheet('Scoring Guide')
  titleBlock(guide, 'Proficiency Anchors', 'Rate on recent demonstrated evidence, not on familiarity, enthusiasm or job title.',
    ['Level', 'Label', 'Independence', 'Scope', 'Observable behaviour', 'Evidence required', 'What it contributes'])
  PROFICIENCY_ANCHORS.forEach((a, i) => {
    const row = guide.getRow(FIRST + i)
    row.values = [a.level, a.label, a.independence, a.scope, a.observableBehavior, a.evidence, a.coverageMeaning]
    row.alignment = { vertical: 'top', wrapText: true }
    row.height = 30
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).font = { bold: true, size: 12 }
    row.getCell(2).font = { bold: true }
  })
  ratingScale(guide, `A${FIRST}:A${FIRST + PROFICIENCY_ANCHORS.length - 1}`)
  widths(guide, [8, 22, 26, 22, 46, 24, 24])

  // --- Skill Catalog -------------------------------------------------------
  const cat = wb.addWorksheet('Skill Catalog')
  titleBlock(cat, 'Skill Catalog', 'The assessable capabilities. Adjust criticality, target level and weight to match your team.',
    ['Skill ID', 'Domain', 'Subdomain', 'Skill', 'Observable capability (what "doing this" looks like)',
     'Example evidence at target', 'Critical?', 'Target', 'Weight'], { xSplit: 1 })
  AAP_SKILL_CATALOG.forEach((s, i) => {
    const row = cat.getRow(FIRST + i)
    row.values = [s.code, s.domain, s.subdomain, s.name, s.observableCapability,
                  s.exampleEvidence, s.critical ? 'Yes' : 'No', s.targetLevel, s.weight]
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(7).alignment = { horizontal: 'center' }
    row.getCell(8).alignment = { horizontal: 'center' }
    row.getCell(9).alignment = { horizontal: 'center' }
  })
  const catLast = FIRST + AAP_SKILL_CATALOG.length - 1
  cat.autoFilter = `A4:I${catLast}`
  for (let i = FIRST; i <= catLast; i++) {
    cat.getCell(`G${i}`).dataValidation = {
      type: 'list', allowBlank: false, formulae: ['"Yes,No"'], showErrorMessage: true,
    }
    cat.getCell(`H${i}`).dataValidation = {
      type: 'whole', operator: 'between', allowBlank: false, formulae: [0, 5], showErrorMessage: true,
    }
  }
  textRule(cat, `G${FIRST}:G${catLast}`, 'Yes', 'FFFEE2E2', 'FFB91C1C')
  widths(cat, [9, 26, 16, 36, 62, 34, 10, 9, 9])

  // --- Role Profiles -------------------------------------------------------
  const roles = wb.addWorksheet('Role Profiles')
  titleBlock(roles, 'Role Profiles',
    'Breadth = how WIDE the role reaches (skills at the breadth threshold or above). Depth = how far DOWN it goes (skills owned at the depth threshold or above). Both are counts of skills.',
    ['Profile', 'Primary outcome', 'Depth areas', 'Working breadth', 'AI-era expectation', 'Evidence',
     'Breadth target', 'Depth target', 'Breadth as % of catalog', 'Depth as % of catalog'])
  ROLE_PROFILES.forEach((p, i) => {
    const n = FIRST + i
    const row = roles.getRow(n)
    row.values = [p.name, p.primaryOutcome, p.depthAreas, p.workingBreadth, p.aiExpectation, p.evidence,
                  p.breadthTarget, p.depthTarget]
    row.getCell(9).value = { formula: `IFERROR($G${n}/COUNTA('Skill Catalog'!$A$${FIRST}:$A$500),"")`, result: p.breadthTarget / AAP_SKILL_CATALOG.length }
    row.getCell(10).value = { formula: `IFERROR($H${n}/COUNTA('Skill Catalog'!$A$${FIRST}:$A$500),"")`, result: p.depthTarget / AAP_SKILL_CATALOG.length }
    row.getCell(9).numFmt = '0%'
    row.getCell(10).numFmt = '0%'
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(1).font = { bold: true }
    row.height = 46
    ;[7, 8, 9, 10].forEach(c => { row.getCell(c).alignment = { horizontal: 'center', vertical: 'top' } })
  })
  widths(roles, [30, 34, 40, 34, 36, 30, 13, 12, 14, 14])

  // --- Roster --------------------------------------------------------------
  const ros = wb.addWorksheet('Roster', { properties: { tabColor: { argb: 'FF16A34A' } } })
  titleBlock(ros, 'Team Roster', 'Enter each engineer once. The role profile sets the breadth and depth targets they are measured against.',
    ['Employee', 'Job title', 'Role profile', 'Manager'], { headerHeight: 22 })
  const rosterRows = Math.max(roster.length, 25)
  for (let i = 0; i < rosterRows; i++) {
    const n = FIRST + i
    const row = ros.getRow(n)
    if (roster[i]) row.values = [roster[i].name, roster[i].title, roleName(roster[i].roleId), roster[i].manager]
    ;['A', 'B', 'C', 'D'].forEach(c => {
      ros.getCell(`${c}${n}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    })
    ros.getCell(`C${n}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: [`'Role Profiles'!$A$${FIRST}:$A$${FIRST + ROLE_PROFILES.length - 1}`],
      showErrorMessage: true, errorTitle: 'Unknown role profile',
      error: 'Pick a profile from the Role Profiles sheet.',
    }
  }
  widths(ros, [26, 34, 34, 22])

  // --- Intake --------------------------------------------------------------
  const intake = wb.addWorksheet('Intake', { properties: { tabColor: { argb: 'FFF59E0B' } } })
  titleBlock(intake, 'Self-Assessment Intake',
    'Paste the block from each engineer’s "Send to Manager" sheet here. The Assessment sheet picks up their self ratings automatically.',
    ['Employee', 'Skill ID', 'Self rating', 'Self evidence', 'Submitted', 'Key (calculated)'], { headerHeight: 22 })

  const intakeRows = []
  if (populated) {
    for (const emp of EMPLOYEES) {
      for (const a of emp.skills) {
        if (a.selfRating === undefined) continue
        const def = AAP_SKILL_CATALOG.find(s => s.id === a.skillId)
        if (!def) continue
        intakeRows.push([emp.name, def.code, a.selfRating, a.evidence ?? '', (a.assessedAt ?? '').slice(0, 10)])
      }
    }
  }
  const intakeLast = Math.max(FIRST + intakeRows.length - 1, FIRST + 800)
  intakeRows.forEach((row, i) => { intake.getRow(FIRST + i).values = row })
  for (let n = FIRST; n <= intakeLast; n++) {
    intake.getCell(`F${n}`).value = { formula: `IF($A${n}="","",$A${n}&"|"&$B${n})`, result: intakeRows[n - FIRST] ? `${intakeRows[n - FIRST][0]}|${intakeRows[n - FIRST][1]}` : '' }
    intake.getCell(`F${n}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } }
  }
  intake.getColumn(6).hidden = true
  intake.autoFilter = `A4:E${Math.min(intakeLast, FIRST + 800)}`
  widths(intake, [26, 10, 12, 60, 14, 26])

  // --- Assessment ----------------------------------------------------------
  const asmt = wb.addWorksheet('Assessment', { properties: { tabColor: { argb: ACCENT } } })
  titleBlock(asmt, 'Individual Assessment',
    'One row per engineer per skill. Type in the Reviewer rating column; everything else calculates. Self ratings arrive from the Intake sheet.',
    ['Employee', 'Role profile', 'Skill ID', 'Domain', 'Skill', 'Critical?', 'Target',
     'Self rating', 'Reviewer rating', 'Final', 'Gap', 'Priority', 'Reviewer evidence / link', 'Reviewed on',
     'Weight', 'Have', 'Need', 'Key', 'FinalNum'],
    { xSplit: 1 })

  const seedByPerson = new Map(EMPLOYEES.map(e => [e.name, new Map(e.skills.map(a => [a.skillId, a]))]))
  let n = FIRST
  const people = populated ? roster : [{ name: '', roleId: '' }]
  for (const person of people) {
    for (const def of AAP_SKILL_CATALOG) {
      const seed = populated ? seedByPerson.get(person.name)?.get(def.id) : undefined
      const row = asmt.getRow(n)
      row.getCell(1).value = person.name || { formula: `IF(Roster!$A$${FIRST}="","",Roster!$A$${FIRST})`, result: '' }
      row.getCell(2).value = { formula: `IFERROR(INDEX(Roster!$C:$C,MATCH($A${n},Roster!$A:$A,0)),"")`, result: roleName(person.roleId) }
      row.getCell(3).value = def.code
      row.getCell(4).value = { formula: `IFERROR(INDEX('Skill Catalog'!$B:$B,MATCH($C${n},'Skill Catalog'!$A:$A,0)),"")`, result: def.domain }
      row.getCell(5).value = { formula: `IFERROR(INDEX('Skill Catalog'!$D:$D,MATCH($C${n},'Skill Catalog'!$A:$A,0)),"")`, result: def.name }
      row.getCell(6).value = { formula: `IFERROR(INDEX('Skill Catalog'!$G:$G,MATCH($C${n},'Skill Catalog'!$A:$A,0)),"")`, result: def.critical ? 'Yes' : 'No' }
      row.getCell(7).value = { formula: `IFERROR(INDEX('Skill Catalog'!$H:$H,MATCH($C${n},'Skill Catalog'!$A:$A,0)),"")`, result: def.targetLevel }
      row.getCell(8).value = { formula: `IFERROR(INDEX(Intake!$C:$C,MATCH($R${n},Intake!$F:$F,0)),"")`, result: seed?.selfRating ?? '' }
      row.getCell(9).value = seed?.reviewerRating ?? ''
      row.getCell(10).value = { formula: `IF($I${n}<>"",$I${n},IF($H${n}<>"",$H${n},""))`, result: seed ? (seed.reviewerRating ?? seed.selfRating ?? '') : '' }
      row.getCell(11).value = { formula: `IF(OR($J${n}="",$G${n}=""),"",MAX(0,$G${n}-$J${n}))`, result: '' }
      row.getCell(12).value = { formula: `IF($K${n}="","",IF(AND($F${n}="Yes",$K${n}>=2),"High",IF($K${n}>=2,"Medium",IF($K${n}=1,"Low","Maintain"))))`, result: '' }
      row.getCell(13).value = seed?.evidence ?? ''
      row.getCell(14).value = seed?.assessedAt ? seed.assessedAt.slice(0, 10) : ''
      row.getCell(15).value = { formula: `IFERROR(INDEX('Skill Catalog'!$I:$I,MATCH($C${n},'Skill Catalog'!$A:$A,0)),"")`, result: def.weight }
      row.getCell(16).value = { formula: `IF($J${n}="","",MIN($J${n},$G${n})*$O${n})`, result: '' }
      row.getCell(17).value = { formula: `IF($J${n}="","",$G${n}*$O${n})`, result: '' }
      row.getCell(18).value = { formula: `IF($A${n}="","",$A${n}&"|"&$C${n})`, result: person.name ? `${person.name}|${def.code}` : '' }
      // Numeric mirror of Final: SUMPRODUCT cannot multiply through the "" that
      // the Final formula returns for unrated rows.
      row.getCell(19).value = { formula: `IF($J${n}="",0,$J${n})`, result: 0 }
      row.getCell(13).alignment = { wrapText: false }
      n++
    }
  }
  const asmtLast = n - 1
  ratingInput(asmt, 'I', FIRST, asmtLast, 'Reviewer rating (0-5)')
  for (let i = FIRST; i <= asmtLast; i++) {
    asmt.getCell(`M${i}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
  }
  calcRange(asmt, ['J', 'K', 'L'], FIRST, asmtLast)
  ratingScale(asmt, `J${FIRST}:J${asmtLast}`)
  textRule(asmt, `L${FIRST}:L${asmtLast}`, 'High', 'FFFEE2E2', 'FFB91C1C', 1)
  textRule(asmt, `L${FIRST}:L${asmtLast}`, 'Medium', 'FFFEF3C7', 'FF92400E', 2)
  textRule(asmt, `L${FIRST}:L${asmtLast}`, 'Maintain', 'FFDCFCE7', 'FF166534', 3)
  asmt.autoFilter = `A4:N${asmtLast}`
  ;[15, 16, 17, 18, 19].forEach(c => { asmt.getColumn(c).hidden = true })
  widths(asmt, [22, 28, 8, 24, 34, 9, 8, 10, 11, 8, 7, 11, 40, 12, 8, 8, 8, 22, 9])

  const A = `Assessment!$A$${FIRST}:$A$${LAST}`
  const Fin = `Assessment!$J$${FIRST}:$J$${LAST}`
  const Gp = `Assessment!$K$${FIRST}:$K$${LAST}`
  const Crit = `Assessment!$F$${FIRST}:$F$${LAST}`
  const Pri = `Assessment!$L$${FIRST}:$L$${LAST}`
  const Sid = `Assessment!$C$${FIRST}:$C$${LAST}`
  const Have = `Assessment!$P$${FIRST}:$P$${LAST}`
  const Need = `Assessment!$Q$${FIRST}:$Q$${LAST}`
  const FinNum = `Assessment!$S$${FIRST}:$S$${LAST}`

  // --- Team Summary --------------------------------------------------------
  const sum = wb.addWorksheet('Team Summary')
  titleBlock(sum, 'Team Summary', 'Per-engineer rollups. Everything here is calculated from the Assessment sheet.',
    ['Employee', 'Role profile', 'Assessed', 'Breadth', 'Depth', 'Critical breadth', 'Average level',
     'At target', 'High-priority gaps', 'Capability index', 'Breadth target', 'Depth target',
     'Breadth vs target', 'Depth vs target'])
  const sumRows = Math.max(roster.length, 25)
  for (let i = 0; i < sumRows; i++) {
    const m = FIRST + i
    const row = sum.getRow(m)
    row.getCell(1).value = { formula: `IF(Roster!$A${m}="","",Roster!$A${m})`, result: roster[i]?.name ?? '' }
    row.getCell(2).value = { formula: `IF($A${m}="","",IFERROR(INDEX(Roster!$C:$C,MATCH($A${m},Roster!$A:$A,0)),""))`, result: roster[i] ? roleName(roster[i].roleId) : '' }
    row.getCell(3).value = { formula: `IF($A${m}="","",COUNTIFS(${A},$A${m},${Fin},">=0"))` }
    row.getCell(4).value = { formula: `IF($A${m}="","",COUNTIFS(${A},$A${m},${Fin},">="&ThrBreadth))` }
    row.getCell(5).value = { formula: `IF($A${m}="","",COUNTIFS(${A},$A${m},${Fin},">="&ThrDepth))` }
    row.getCell(6).value = { formula: `IF($A${m}="","",COUNTIFS(${A},$A${m},${Fin},">="&ThrBreadth,${Crit},"Yes"))` }
    row.getCell(7).value = { formula: `IFERROR(AVERAGEIFS(${Fin},${A},$A${m}),"")` }
    row.getCell(8).value = { formula: `IFERROR(COUNTIFS(${A},$A${m},${Gp},0)/$C${m},"")` }
    row.getCell(9).value = { formula: `IF($A${m}="","",COUNTIFS(${A},$A${m},${Pri},"High"))` }
    row.getCell(10).value = { formula: `IFERROR(SUMIFS(${Have},${A},$A${m})/SUMIFS(${Need},${A},$A${m}),"")` }
    row.getCell(11).value = { formula: `IFERROR(INDEX('Role Profiles'!$G:$G,MATCH($B${m},'Role Profiles'!$A:$A,0)),"")` }
    row.getCell(12).value = { formula: `IFERROR(INDEX('Role Profiles'!$H:$H,MATCH($B${m},'Role Profiles'!$A:$A,0)),"")` }
    row.getCell(13).value = { formula: `IF(OR($K${m}="",$A${m}=""),"",IF($D${m}>=$K${m},"Met",'"'&"Short by "&($K${m}-$D${m})&'"'))`.replace(/'"'&|&'"'/g, '') }
    row.getCell(14).value = { formula: `IF(OR($L${m}="",$A${m}=""),"",IF($E${m}>=$L${m},"Met","Short by "&($L${m}-$E${m})))` }
    row.getCell(7).numFmt = '0.0'
    row.getCell(8).numFmt = '0%'
    row.getCell(10).numFmt = '0%'
    for (let c = 3; c <= 14; c++) row.getCell(c).alignment = { horizontal: 'center' }
  }
  const sumLast = FIRST + sumRows - 1
  calcRange(sum, ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'], FIRST, sumLast)
  textRule(sum, `M${FIRST}:N${sumLast}`, 'Met', 'FFDCFCE7', 'FF166534', 1)
  textRule(sum, `M${FIRST}:N${sumLast}`, 'Short', 'FFFEF3C7', 'FF92400E', 2)
  widths(sum, [22, 28, 10, 10, 9, 14, 13, 10, 15, 14, 13, 12, 15, 15])

  // --- Skill Coverage ------------------------------------------------------
  const cov = wb.addWorksheet('Skill Coverage', { properties: { tabColor: { argb: 'FFDC2626' } } })
  titleBlock(cov, 'Skill Coverage & Single Points of Failure',
    'Per-skill view across the whole team. A Critical skill with one owner or none is a staffing risk, not a training nicety.',
    ['Skill ID', 'Skill', 'Domain', 'Critical?', 'Target', 'Rated', 'Coverage', 'Depth owners',
     'Team average', 'Strongest', 'Gap to target', 'Single point of failure'], { xSplit: 2 })
  AAP_SKILL_CATALOG.forEach((s, i) => {
    const m = FIRST + i
    const row = cov.getRow(m)
    row.getCell(1).value = s.code
    row.getCell(2).value = { formula: `IFERROR(INDEX('Skill Catalog'!$D:$D,MATCH($A${m},'Skill Catalog'!$A:$A,0)),"")`, result: s.name }
    row.getCell(3).value = { formula: `IFERROR(INDEX('Skill Catalog'!$B:$B,MATCH($A${m},'Skill Catalog'!$A:$A,0)),"")`, result: s.domain }
    row.getCell(4).value = { formula: `IFERROR(INDEX('Skill Catalog'!$G:$G,MATCH($A${m},'Skill Catalog'!$A:$A,0)),"")`, result: s.critical ? 'Yes' : 'No' }
    row.getCell(5).value = { formula: `IFERROR(INDEX('Skill Catalog'!$H:$H,MATCH($A${m},'Skill Catalog'!$A:$A,0)),"")`, result: s.targetLevel }
    row.getCell(6).value = { formula: `COUNTIFS(${Sid},$A${m},${Fin},">=0")` }
    row.getCell(7).value = { formula: `COUNTIFS(${Sid},$A${m},${Fin},">="&ThrCoverage)` }
    row.getCell(8).value = { formula: `COUNTIFS(${Sid},$A${m},${Fin},">="&ThrDepth)` }
    row.getCell(9).value = { formula: `IFERROR(AVERAGEIFS(${Fin},${Sid},$A${m}),"")` }
    row.getCell(10).value = { formula: `IF(COUNTIFS(${Sid},$A${m},${Fin},">=0")=0,"",SUMPRODUCT(MAX((${Sid}=$A${m})*(${FinNum}))))` }
    row.getCell(11).value = { formula: `IF(OR($J${m}="",$E${m}=""),"",MAX(0,$E${m}-$J${m}))` }
    row.getCell(12).value = { formula: `IF($D${m}<>"Yes","",IF($H${m}=0,"NO OWNER",IF($H${m}=1,"BUS FACTOR 1","")))` }
    row.getCell(9).numFmt = '0.0'
    for (let c = 4; c <= 12; c++) row.getCell(c).alignment = { horizontal: 'center' }
  })
  const covLast = FIRST + AAP_SKILL_CATALOG.length - 1
  calcRange(cov, ['F', 'G', 'H', 'I', 'J', 'K', 'L'], FIRST, covLast)
  cov.autoFilter = `A4:L${covLast}`
  textRule(cov, `L${FIRST}:L${covLast}`, 'NO OWNER', 'FFFEE2E2', 'FFB91C1C', 1)
  textRule(cov, `L${FIRST}:L${covLast}`, 'BUS FACTOR', 'FFFEF3C7', 'FF92400E', 2)
  ratingScale(cov, `I${FIRST}:I${covLast}`)
  widths(cov, [9, 36, 26, 10, 8, 8, 11, 13, 13, 11, 13, 22])

  // --- Development Plan ----------------------------------------------------
  const plan = wb.addWorksheet('Development Plan')
  titleBlock(plan, 'Development Plan', 'Convert High-priority gaps into work. The experience assignment is the part that moves a level; a course rarely does.',
    ['Employee', 'Skill ID', 'Skill', 'Current', 'Target', 'Gap', 'Objective',
     'Experience assignment', 'Coach / reviewer', 'Course / lab', 'Due date', 'Success evidence', 'Status'])
  for (let i = 0; i < 120; i++) {
    const m = FIRST + i
    const row = plan.getRow(m)
    row.getCell(3).value = { formula: `IFERROR(INDEX('Skill Catalog'!$D:$D,MATCH($B${m},'Skill Catalog'!$A:$A,0)),"")` }
    row.getCell(4).value = { formula: `IFERROR(INDEX(${Fin},MATCH($A${m}&"|"&$B${m},Assessment!$R$${FIRST}:$R$${LAST},0)),"")` }
    row.getCell(5).value = { formula: `IFERROR(INDEX('Skill Catalog'!$H:$H,MATCH($B${m},'Skill Catalog'!$A:$A,0)),"")` }
    row.getCell(6).value = { formula: `IF(OR($D${m}="",$E${m}=""),"",MAX(0,$E${m}-$D${m}))` }
    row.getCell(13).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Planned,In Progress,Complete"'], showErrorMessage: true,
    }
    ;['A', 'B', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(c => {
      plan.getCell(`${c}${m}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    })
    calcRange(plan, ['C', 'D', 'E', 'F'], m, m)
  }
  plan.autoFilter = `A4:M${FIRST + 119}`
  widths(plan, [22, 9, 34, 9, 8, 7, 44, 34, 20, 22, 12, 36, 13])

  // --- Sources -------------------------------------------------------------
  const src = wb.addWorksheet('Sources')
  titleBlock(src, 'Reference Sources', 'Sources informing the skill catalog and rubric.',
    ['Source', 'URL', 'Relevance', 'Accessed'], { headerHeight: 22 })
  CATALOG_SOURCES.forEach((s, i) => {
    const row = src.getRow(FIRST + i)
    row.values = [s.name, s.url, s.relevance, s.accessed]
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(2).value = { text: s.url, hyperlink: s.url }
    row.getCell(2).font = { color: { argb: ACCENT }, underline: true }
  })
  widths(src, [42, 60, 62, 12])

  return wb
}

// ---------------------------------------------------------------------------
// Self-assessment intake workbook
// ---------------------------------------------------------------------------

async function buildSelfAssessment() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Team Insight'
  wb.created = new Date()

  // --- Start here ----------------------------------------------------------
  const start = wb.addWorksheet('Start Here', { properties: { tabColor: { argb: ACCENT } } })
  start.getCell('A1').value = 'Skills Self-Assessment'
  start.getCell('A1').font = { bold: true, size: 18, color: { argb: INK } }
  start.getCell('A2').value = 'Your own read on what you can demonstrably do today. Takes about 30 minutes.'
  start.getCell('A2').font = { italic: true, size: 11, color: { argb: MUTED } }

  start.getCell('A4').value = 'Your name'
  start.getCell('A5').value = 'Your role'
  start.getCell('A6').value = 'Date'
  ;['A4', 'A5', 'A6'].forEach(a => { start.getCell(a).font = { bold: true } })
  ;['B4', 'B5', 'B6'].forEach(b => {
    const c = start.getCell(b)
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    c.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
    c.protection = { locked: false }
  })
  start.getCell('B4').value = ''
  start.getCell('B6').value = new Date().toISOString().slice(0, 10)

  const howTo = [
    ['How this works', ''],
    ['1', 'Go to the "My Assessment" tab. There is one row per skill, with a plain description of what doing that skill actually looks like.'],
    ['2', 'For each one, enter a rating from 0 to 5 in the yellow column. Read the Scoring Guide tab first — the levels have specific meanings.'],
    ['3', 'Add a line of evidence for anything you rate 3 or above. "Which piece of work would you point at?" is the test.'],
    ['4', 'Leave a row blank if it genuinely does not apply to your work. Do not guess.'],
    ['5', 'Check the "My Summary" tab to see your own profile, then send the file back to your manager.'],
    ['', ''],
    ['What this is for', 'Capability planning: finding where the team is thin, who is ready for more, and what to invest in. It is the starting point of a conversation, not a score.'],
    ['What this is not', 'It is not a performance review, it is not used for ranking, and a low rating on something you have never touched costs you nothing. Under-rating yourself to be safe makes the team data worse.'],
    ['Be honest about level 3', 'Level 3 means you have owned this end to end in production, unaided. That is a high bar and most people sit below it on most skills. That is expected and fine.'],
  ]
  howTo.forEach(([k, v], i) => {
    const n = 9 + i
    const row = start.getRow(n)
    row.getCell(1).value = k
    row.getCell(2).value = v
    row.getCell(1).font = { bold: true, color: { argb: k.length > 2 ? INK : MUTED } }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.height = v.length > 110 ? 34 : 20
  })
  widths(start, [20, 108])

  // --- Scoring Guide -------------------------------------------------------
  const guide = wb.addWorksheet('Scoring Guide')
  titleBlock(guide, 'What each level means', 'Rate on recent demonstrated evidence — work you could point at — not on how familiar something feels.',
    ['Level', 'Label', 'How independent you are', 'Where you have done it', 'What it looks like', 'Evidence you could show'])
  PROFICIENCY_ANCHORS.forEach((a, i) => {
    const row = guide.getRow(FIRST + i)
    row.values = [a.level, a.label, a.independence, a.scope, a.observableBehavior, a.evidence]
    row.alignment = { vertical: 'top', wrapText: true }
    row.height = 32
    row.getCell(1).font = { bold: true, size: 13 }
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(2).font = { bold: true }
  })
  ratingScale(guide, `A${FIRST}:A${FIRST + 5}`)
  widths(guide, [8, 24, 28, 24, 48, 26])

  // --- My Assessment -------------------------------------------------------
  const my = wb.addWorksheet('My Assessment', { properties: { tabColor: { argb: 'FFF59E0B' } } })
  titleBlock(my, 'My Assessment', 'Fill in the two yellow columns. Everything else is here to help you decide.',
    ['Skill ID', 'Domain', 'Skill', 'What doing this actually looks like', 'Evidence that would show it',
     'Team target', 'MY RATING (0-5)', 'MY EVIDENCE — what would you point at?', 'What my rating means'],
    { xSplit: 3, headerHeight: 34 })
  AAP_SKILL_CATALOG.forEach((s, i) => {
    const m = FIRST + i
    const row = my.getRow(m)
    row.values = [s.code, s.domain, s.name, s.observableCapability, s.exampleEvidence, s.targetLevel]
    row.getCell(9).value = { formula: `IFERROR(INDEX('Scoring Guide'!$B$${FIRST}:$B$${FIRST + 5},$G${m}+1),"")` }
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'top' }
    row.height = 30
  })
  const myLast = FIRST + AAP_SKILL_CATALOG.length - 1
  ratingInput(my, 'G', FIRST, myLast, 'Your rating (0-5)')
  for (let m = FIRST; m <= myLast; m++) {
    my.getCell(`G${m}`).protection = { locked: false }
    const ev = my.getCell(`H${m}`)
    ev.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } }
    ev.protection = { locked: false }
    ev.alignment = { wrapText: true, vertical: 'top' }
    my.getCell(`I${m}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } }
  }
  ratingScale(my, `G${FIRST}:G${myLast}`)
  my.autoFilter = `A4:I${myLast}`
  widths(my, [8, 24, 34, 56, 30, 9, 14, 44, 20])

  // --- My Summary ----------------------------------------------------------
  const mine = wb.addWorksheet('My Summary')
  titleBlock(mine, 'My Profile', 'Updates as you fill in the assessment. This is what your manager will see first.',
    ['Measure', 'Value', 'What it means'], { headerHeight: 22 })
  const G = `'My Assessment'!$G$${FIRST}:$G$${myLast}`
  const T = `'My Assessment'!$F$${FIRST}:$F$${myLast}`
  const measures = [
    ['Skills rated', { formula: `COUNTIFS(${G},">=0")` }, `of ${AAP_SKILL_CATALOG.length} in the catalog`],
    ['Breadth (level 2+)', { formula: `COUNTIFS(${G},">=2")` }, 'Skills you can work with review'],
    ['Working proficiency (3+)', { formula: `COUNTIFS(${G},">=3")` }, 'Skills you can own end to end'],
    ['Depth (level 4+)', { formula: `COUNTIFS(${G},">=4")` }, 'Skills you could lead and coach others in'],
    ['Average level', { formula: `IFERROR(AVERAGEIFS(${G},${G},">=0"),"")` }, 'Across everything you rated'],
    ['At or above team target', { formula: `SUMPRODUCT((${G}<>"")*(${G}>=${T}))` }, 'Skills where you already meet the bar'],
  ]
  measures.forEach(([label, formula, note], i) => {
    const m = FIRST + i
    const row = mine.getRow(m)
    row.getCell(1).value = label
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = formula
    row.getCell(2).alignment = { horizontal: 'center' }
    row.getCell(2).font = { bold: true, size: 13, color: { argb: ACCENT } }
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } }
    row.getCell(3).value = note
    row.getCell(3).font = { color: { argb: MUTED } }
  })
  if (measures[4]) mine.getCell(`B${FIRST + 4}`).numFmt = '0.0'

  const domains = [...new Set(AAP_SKILL_CATALOG.map(s => s.domain))]
  const domStart = FIRST + measures.length + 2
  mine.getCell(`A${domStart - 1}`).value = 'By domain'
  mine.getCell(`A${domStart - 1}`).font = { bold: true, size: 11, color: { argb: INK } }
  const D = `'My Assessment'!$B$${FIRST}:$B$${myLast}`
  domains.forEach((d, i) => {
    const m = domStart + i
    const row = mine.getRow(m)
    row.getCell(1).value = d
    row.getCell(2).value = { formula: `IFERROR(AVERAGEIFS(${G},${D},$A${m},${G},">=0"),"")` }
    row.getCell(2).numFmt = '0.0'
    row.getCell(2).alignment = { horizontal: 'center' }
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } }
    row.getCell(3).value = { formula: `IF($B${m}="","",COUNTIFS(${D},$A${m},${G},">=0")&" of "&COUNTIF(${D},$A${m})&" rated")` }
    row.getCell(3).font = { color: { argb: MUTED } }
  })
  ratingScale(mine, `B${domStart}:B${domStart + domains.length - 1}`)
  widths(mine, [30, 14, 46])

  // --- Send to Manager -----------------------------------------------------
  const send = wb.addWorksheet('Send to Manager', { properties: { tabColor: { argb: 'FF16A34A' } } })
  titleBlock(send, 'Send to Manager',
    'Copy rows 5 downward (columns A-E) and paste them into the Intake sheet of the team assessment workbook.',
    ['Employee', 'Skill ID', 'Self rating', 'Self evidence', 'Submitted'], { headerHeight: 22 })
  AAP_SKILL_CATALOG.forEach((s, i) => {
    const m = FIRST + i
    const row = send.getRow(m)
    row.getCell(1).value = { formula: `IF('Start Here'!$B$4="","(enter your name on Start Here)",'Start Here'!$B$4)` }
    row.getCell(2).value = s.code
    row.getCell(3).value = { formula: `IF('My Assessment'!$G${m}="","",'My Assessment'!$G${m})` }
    row.getCell(4).value = { formula: `IF('My Assessment'!$H${m}="","",'My Assessment'!$H${m})` }
    row.getCell(5).value = { formula: `IF('Start Here'!$B$6="","",TEXT('Start Here'!$B$6,"yyyy-mm-dd"))` }
    row.getCell(3).alignment = { horizontal: 'center' }
  })
  calcRange(send, ['A', 'B', 'C', 'D', 'E'], FIRST, myLast)
  widths(send, [26, 10, 12, 60, 14])

  // Lock everything except the engineer's own input cells.
  for (const ws of [my, mine, guide, send]) {
    await ws.protect('', {
      selectLockedCells: true, selectUnlockedCells: true,
      formatColumns: true, formatRows: true, sort: true, autoFilter: true,
    })
  }
  await start.protect('', { selectLockedCells: true, selectUnlockedCells: true })

  return wb
}

// ---------------------------------------------------------------------------

const main = async () => {
  await mkdir(OUT, { recursive: true })
  const jobs = [
    ['Team_Skills_Assessment_Matrix_TEMPLATE.xlsx', () => buildMaster({ populated: false })],
    ['Team_Skills_Assessment_Matrix_EXAMPLE.xlsx', () => buildMaster({ populated: true })],
    ['Skills_Self_Assessment_INTAKE.xlsx', () => buildSelfAssessment()],
  ]
  for (const [name, build] of jobs) {
    const wb = await build()
    const file = path.join(OUT, name)
    await wb.xlsx.writeFile(file)
    console.log(`  ✓ ${name}`)
  }
  console.log(`\ndone → ${path.resolve(OUT)}`)

  // Clean up the tsc staging dir in Node rather than a shell `rm -rf`, which
  // doesn't exist as such on Windows (cmd has no `rm`; PowerShell's alias
  // doesn't take -rf flags).
  await rm(LIB, { recursive: true, force: true })
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
