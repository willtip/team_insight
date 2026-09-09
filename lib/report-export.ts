import type { Workbook } from 'exceljs'

/**
 * Report exports for the Reports page.
 *
 * Every format is built from the same `ReportTable`, so PDF, Excel and
 * PowerPoint always carry identical data. Previously Excel and PowerPoint both
 * fell through to a single `.csv` blob, so picking PowerPoint downloaded a
 * spreadsheet.
 *
 * Both libraries are dynamically imported — together they are several megabytes
 * and nothing on first paint needs them.
 */

export interface ReportTable {
  title: string
  /** Byline shown under the title on the first slide / sheet header. */
  subtitle: string
  headers: string[]
  rows: (string | number)[][]
}

const INK = 'FF1E293B'
const MUTED = '64748B'

async function loadExcel() {
  const mod = await import('exceljs')
  return (mod as unknown as { default?: typeof import('exceljs') }).default ?? mod
}

/**
 * pptxgenjs ships a default-exported class, but its CJS build assigns the class
 * straight to `module.exports`, so the interop shape differs between bundlers.
 * Take `.default` when it's there and fall back to the namespace itself.
 */
type PptxGenJSConstructor = typeof import('pptxgenjs').default

async function loadPptx(): Promise<PptxGenJSConstructor> {
  const mod = await import('pptxgenjs')
  const candidate = mod as unknown as { default?: PptxGenJSConstructor }
  return candidate.default ?? (mod as unknown as PptxGenJSConstructor)
}

/** Column widths sized to content, so nothing is clipped in either format. */
function columnWidths(table: ReportTable, min: number, max: number): number[] {
  return table.headers.map((header, i) => {
    const longest = table.rows.reduce(
      (w, row) => Math.max(w, String(row[i] ?? '').length),
      header.length,
    )
    return Math.min(max, Math.max(min, longest + 2))
  })
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export async function buildReportWorkbook(table: ReportTable): Promise<Workbook> {
  const ExcelJS = await loadExcel()
  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = 'Team Insight'
  wb.created = new Date()

  const ws = wb.addWorksheet(table.title.slice(0, 31))

  ws.getCell('A1').value = table.title
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: INK } }
  ws.getCell('A2').value = table.subtitle
  ws.getCell('A2').font = { italic: true, size: 10, color: { argb: `FF${MUTED}` } }

  const header = ws.getRow(4)
  header.values = table.headers
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.alignment = { vertical: 'middle', wrapText: true }
  header.height = 24
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
  })

  table.rows.forEach((row, i) => {
    ws.getRow(5 + i).values = row as (string | number)[]
  })

  columnWidths(table, 10, 60).forEach((w, i) => { ws.getColumn(i + 1).width = w })
  ws.views = [{ state: 'frozen', ySplit: 4 }]
  if (table.rows.length > 0) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: table.headers.length } }
  }

  return wb
}

// ---------------------------------------------------------------------------
// PowerPoint
// ---------------------------------------------------------------------------

/** Table rows per slide. More than this and the type is too small to read. */
const ROWS_PER_SLIDE = 12

export async function buildReportDeck(table: ReportTable) {
  const PptxGenJS = await loadPptx()
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'          // 13.33in x 7.5in
  pptx.author = 'Team Insight'
  pptx.title = table.title

  // --- Title slide ---------------------------------------------------------
  const title = pptx.addSlide()
  title.background = { color: '1E293B' }
  title.addText(table.title, {
    x: 0.8, y: 2.6, w: 11.7, h: 1.0,
    fontSize: 40, bold: true, color: 'FFFFFF',
  })
  title.addText(table.subtitle, {
    x: 0.8, y: 3.7, w: 11.7, h: 0.5,
    fontSize: 16, color: 'CBD5E1',
  })
  title.addText(`${table.rows.length} rows`, {
    x: 0.8, y: 4.3, w: 11.7, h: 0.4,
    fontSize: 12, color: '94A3B8',
  })

  // --- Table slides --------------------------------------------------------
  // Chunked rather than one giant table: PowerPoint will not scroll a table,
  // so anything past the slide edge would simply be invisible.
  const pageCount = Math.max(1, Math.ceil(table.rows.length / ROWS_PER_SLIDE))
  const widths = columnWidths(table, 6, 40)
  const totalWidth = widths.reduce((a, b) => a + b, 0)
  const colW = widths.map(w => (w / totalWidth) * 12.3)

  for (let page = 0; page < pageCount; page++) {
    const slice = table.rows.slice(page * ROWS_PER_SLIDE, (page + 1) * ROWS_PER_SLIDE)
    const slide = pptx.addSlide()

    slide.addText(table.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 18, bold: true, color: '1E293B',
    })
    slide.addText(`Page ${page + 1} of ${pageCount}`, {
      x: 9.5, y: 0.35, w: 3.3, h: 0.3, fontSize: 11, color: MUTED, align: 'right',
    })

    slide.addTable(
      [
        table.headers.map(h => ({
          text: h,
          options: { bold: true, color: 'FFFFFF', fill: { color: '1E293B' } },
        })),
        ...slice.map(row => row.map(cell => ({
          text: String(cell ?? ''),
          options: { color: '334155' },
        }))),
      ],
      {
        x: 0.5, y: 0.9, w: 12.3,
        colW,
        fontSize: 10,
        border: { type: 'solid', color: 'E2E8F0', pt: 1 },
        valign: 'middle',
        autoPage: false,
      },
    )

    slide.addText('Team Insight · Confidential', {
      x: 0.5, y: 7.0, w: 6, h: 0.3, fontSize: 9, color: '94A3B8',
    })
  }

  return pptx
}

// ---------------------------------------------------------------------------
// Browser download
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadReportXlsx(table: ReportTable, filename: string) {
  const wb = await buildReportWorkbook(table)
  const buffer = await wb.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  )
}

export async function downloadReportPptx(table: ReportTable, filename: string) {
  const pptx = await buildReportDeck(table)
  // `writeFile` rather than `write` + `downloadBlob`: pptxgenjs only honours
  // `compression` when no `outputType` is given, and `write()` cannot ask for a
  // Blob without one. In the browser `writeFile` takes exactly that path and
  // then triggers the same anchor download itself. A full skills-readiness deck
  // is ~9MB stored and well under 1MB deflated.
  await pptx.writeFile({ fileName: filename, compression: true })
}
