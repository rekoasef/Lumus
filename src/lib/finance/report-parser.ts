import type { FinanceReport } from '@/types/finance.types'

export type ParsedReportRow = {
  label: string
  value: string
}

export type ParsedReportSection = {
  title: string
  paragraphs: string[]
  rows: ParsedReportRow[]
  items: string[]
}

export type ParsedFinanceReport = {
  monthLabel: string
  createdLabel: string
  sections: ParsedReportSection[]
}

const KNOWN_SECTION_TITLES = new Set([
  'resumen del mes',
  'ingresos y gastos',
  'gastos por categoria',
  'presupuestos',
  'metas de ahorro',
  'recomendaciones',
])

export function getReportMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month

  return new Date(year, monthNumber - 1, 1).toLocaleString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
}

export function getReportCreatedLabel(createdAt: string) {
  return new Date(createdAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function stripReportMarkup(value: string) {
  return value
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*[-•]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTitle(value: string) {
  return stripReportMarkup(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSectionTitle(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.includes(':')) return false
  if (trimmed.startsWith('## ')) return true

  const normalized = normalizeTitle(trimmed)
  return KNOWN_SECTION_TITLES.has(normalized)
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function parseTableRow(line: string): ParsedReportRow | null {
  if (!line.includes('|') || isTableSeparator(line)) return null

  const cells = line
    .split('|')
    .map(cell => stripReportMarkup(cell))
    .filter(Boolean)

  if (cells.length < 2) return null

  const label = cells[0]
  const value = cells.slice(1).join(' · ')
  const normalizedLabel = normalizeTitle(label)
  const normalizedValue = normalizeTitle(value)

  if (
    (normalizedLabel === 'concepto' && normalizedValue === 'monto') ||
    (normalizedLabel === 'categoria' && normalizedValue === 'monto')
  ) {
    return null
  }

  return { label, value }
}

function parseKeyValue(line: string): ParsedReportRow | null {
  const cleaned = stripReportMarkup(line)
  const separatorIndex = cleaned.indexOf(':')
  if (separatorIndex <= 0) return null

  const label = cleaned.slice(0, separatorIndex).trim()
  const value = cleaned.slice(separatorIndex + 1).trim()

  if (!label || !value || label.length > 42) return null
  return { label, value }
}

function createSection(title: string): ParsedReportSection {
  return {
    title: stripReportMarkup(title),
    paragraphs: [],
    rows: [],
    items: [],
  }
}

export function parseFinanceReportContent(report: Pick<FinanceReport, 'content' | 'month' | 'created_at'>): ParsedFinanceReport {
  const sections: ParsedReportSection[] = []
  let current: ParsedReportSection | null = null

  const pushSection = (title: string) => {
    const nextSection = createSection(title)
    current = nextSection
    sections.push(nextSection)
    return nextSection
  }

  for (const rawLine of report.content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || isTableSeparator(line)) continue

    if (isSectionTitle(line)) {
      pushSection(line)
      continue
    }

    const section = current ?? pushSection('Resumen del mes')

    const tableRow = parseTableRow(line)
    if (tableRow) {
      section.rows.push(tableRow)
      continue
    }

    if (/^\s*(\d+[.)]|[-•])\s+/.test(rawLine)) {
      section.items.push(stripReportMarkup(rawLine))
      continue
    }

    const row = parseKeyValue(line)
    if (row) {
      section.rows.push(row)
      continue
    }

    section.paragraphs.push(stripReportMarkup(line))
  }

  return {
    monthLabel: getReportMonthLabel(report.month),
    createdLabel: getReportCreatedLabel(report.created_at),
    sections,
  }
}

export function isSummarySection(section: ParsedReportSection) {
  return normalizeTitle(section.title) === 'resumen del mes'
}

export function isMetricsSection(section: ParsedReportSection) {
  return normalizeTitle(section.title) === 'ingresos y gastos'
}
