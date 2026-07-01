import type { FinanceReport } from '@/types/finance.types'
import {
  isMetricsSection,
  isSummarySection,
  parseFinanceReportContent,
  type ParsedFinanceReport,
  type ParsedReportSection,
} from '@/lib/finance/report-parser'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 42

const COLORS = {
  background: '#0b0b12',
  surface: '#171620',
  elevated: '#211f2d',
  border: '#343044',
  accent: '#bdb4ff',
  accentDark: '#7c6dfa',
  text: '#f0edf7',
  muted: '#9b96aa',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#ffb86e',
}

function sanitizePdfText(value: string) {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const value = Number.parseInt(clean, 16)
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  }
}

function rgbCommand(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`
}

function textWidth(value: string, size: number) {
  return sanitizePdfText(value).length * size * 0.52
}

function wrapText(value: string, maxWidth: number, size: number) {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (textWidth(candidate, size) <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

class PdfLayout {
  private pages: string[][] = []
  private current: string[] = []
  private cursorY = PAGE_HEIGHT - MARGIN
  private pageNumber = 0

  constructor(private readonly report: ParsedFinanceReport) {
    this.addPage(false)
  }

  build() {
    if (this.current.length > 0) {
      this.pages.push(this.current)
      this.current = []
    }

    return this.pages.map(page => page.join('\n')).filter(Boolean)
  }

  private add(command: string) {
    this.current.push(command)
  }

  private addPage(repeatedHeader: boolean) {
    if (this.current.length > 0) this.pages.push(this.current)
    this.current = []
    this.pageNumber += 1
    this.cursorY = PAGE_HEIGHT - MARGIN

    this.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.background)
    this.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 10, COLORS.accent)

    if (repeatedHeader) {
      this.text('Lumus', MARGIN, this.cursorY, 13, 'F2', COLORS.accent)
      this.text(`Informe financiero - ${this.report.monthLabel}`, MARGIN + 56, this.cursorY, 10, 'F1', COLORS.muted)
      this.cursorY -= 30
    }
  }

  private ensure(height: number) {
    if (this.cursorY - height < MARGIN) this.addPage(true)
  }

  rect(x: number, y: number, width: number, height: number, color: string) {
    this.add(`q ${rgbCommand(color)} ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`)
  }

  text(value: string, x: number, y: number, size: number, font: 'F1' | 'F2', color: string) {
    this.add(`BT /${font} ${size} Tf ${rgbCommand(color)} ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`)
  }

  line(value: string, x: number, size: number, color = COLORS.text, font: 'F1' | 'F2' = 'F1', maxWidth = PAGE_WIDTH - MARGIN * 2) {
    const lines = wrapText(value, maxWidth, size)
    const lineHeight = size * 1.45
    this.ensure(lines.length * lineHeight + 4)

    for (const line of lines) {
      this.text(line, x, this.cursorY, size, font, color)
      this.cursorY -= lineHeight
    }
  }

  gap(height: number) {
    this.cursorY -= height
  }

  coverHeader() {
    const headerHeight = 112
    this.rect(MARGIN, this.cursorY - headerHeight + 16, PAGE_WIDTH - MARGIN * 2, headerHeight, COLORS.surface)
    this.rect(MARGIN, this.cursorY - headerHeight + 16, 5, headerHeight, COLORS.accent)
    this.text('LUMUS', MARGIN + 22, this.cursorY - 24, 12, 'F2', COLORS.accent)
    this.text('Informe financiero', MARGIN + 22, this.cursorY - 52, 27, 'F2', COLORS.text)
    this.text(this.report.monthLabel, MARGIN + 22, this.cursorY - 76, 12, 'F1', COLORS.muted)
    this.text(`Generado el ${this.report.createdLabel}`, PAGE_WIDTH - MARGIN - 170, this.cursorY - 24, 9, 'F1', COLORS.muted)
    this.cursorY -= headerHeight + 10
  }

  metricCards(rows: Array<{ label: string; value: string }>) {
    if (rows.length === 0) return

    const gap = 10
    const columns = 2
    const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / columns
    const cardHeight = 48
    const startY = this.cursorY
    const neededRows = Math.ceil(rows.length / columns)

    this.ensure(neededRows * (cardHeight + gap) + 8)

    rows.forEach((row, index) => {
      const col = index % columns
      const line = Math.floor(index / columns)
      const x = MARGIN + col * (cardWidth + gap)
      const y = startY - cardHeight - line * (cardHeight + gap)
      const normalized = row.label.toLowerCase()
      const color = normalized.includes('gasto')
        ? COLORS.danger
        : normalized.includes('balance') || normalized.includes('ahorro') || normalized.includes('ingreso')
          ? COLORS.success
          : COLORS.accent

      this.rect(x, y, cardWidth, cardHeight, COLORS.elevated)
      this.rect(x, y + cardHeight - 3, cardWidth, 3, color)
      this.text(row.label.toUpperCase(), x + 12, y + cardHeight - 18, 8, 'F2', COLORS.muted)
      this.text(row.value, x + 12, y + 13, 13, 'F2', COLORS.text)
    })

    this.cursorY = startY - neededRows * (cardHeight + gap) - 8
  }

  section(section: ParsedReportSection) {
    this.ensure(42)
    this.gap(4)
    this.text(section.title, MARGIN, this.cursorY, 15, 'F2', COLORS.accent)
    this.cursorY -= 22

    for (const paragraph of section.paragraphs) {
      this.line(paragraph, MARGIN, 10.5, COLORS.text)
      this.gap(4)
    }

    for (const row of section.rows) {
      this.ensure(28)
      this.rect(MARGIN, this.cursorY - 21, PAGE_WIDTH - MARGIN * 2, 24, COLORS.surface)
      this.text(row.label, MARGIN + 10, this.cursorY - 12, 9.5, 'F1', COLORS.muted)
      this.text(row.value, MARGIN + 210, this.cursorY - 12, 9.5, 'F2', COLORS.text)
      this.cursorY -= 30
    }

    for (const item of section.items) {
      this.line(`- ${item}`, MARGIN + 6, 10.5, COLORS.text, 'F1', PAGE_WIDTH - MARGIN * 2 - 6)
      this.gap(3)
    }

    this.gap(6)
  }
}

function buildPageCommands(report: ParsedFinanceReport) {
  const layout = new PdfLayout(report)
  const summary = report.sections.find(isSummarySection)
  const metrics = report.sections.find(isMetricsSection)

  layout.coverHeader()

  if (summary) {
    for (const paragraph of summary.paragraphs) {
      layout.line(paragraph, MARGIN, 12, COLORS.text, 'F1')
      layout.gap(4)
    }
    layout.gap(6)
  }

  layout.metricCards(metrics?.rows.slice(0, 4) ?? [])

  for (const section of report.sections) {
    if (isSummarySection(section) || isMetricsSection(section)) continue
    layout.section(section)
  }

  return layout.build()
}

function buildPdfBytes(report: ParsedFinanceReport) {
  const streams = buildPageCommands(report)
  const objects: Array<{ id: number; body: string }> = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      id: 3,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    },
    {
      id: 4,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    },
  ]

  const pageRefs: string[] = []

  streams.forEach((stream, index) => {
    const pageId = 5 + index * 2
    const contentId = pageId + 1
    pageRefs.push(`${pageId} 0 R`)
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    })
    objects.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    })
  })

  objects.push({
    id: 2,
    body: `<< /Type /Pages /Count ${streams.length} /Kids [${pageRefs.join(' ')}] >>`,
  })

  objects.sort((a, b) => a.id - b.id)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const object of objects) {
    offsets[object.id] = pdf.length
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`
  }

  const xrefOffset = pdf.length
  const maxId = Math.max(...objects.map(object => object.id))
  pdf += `xref\n0 ${maxId + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i += 1) {
    bytes[i] = pdf.charCodeAt(i) <= 255 ? pdf.charCodeAt(i) : 63
  }

  return bytes
}

export function downloadFinanceReportPdf(report: FinanceReport) {
  const parsed = parseFinanceReportContent(report)
  const bytes = buildPdfBytes(parsed)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `lumus-informe-${report.month}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
