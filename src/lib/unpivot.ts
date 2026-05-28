import type { Column, Dataset } from '../types/dataset'

/**
 * Wide-to-long detection + transform (#5). "Wide" tables encode values across
 * column headers — typical examples are pivot exports where each year /
 * month / quarter / region is its own column:
 *
 *   Country | 2020 | 2021 | 2022 | 2023
 *   ES      | 100  | 120  | 130  | 140
 *
 * The long form is much friendlier for analysis:
 *
 *   Country | Period | Value
 *   ES      | 2020   | 100
 *   ES      | 2021   | 120
 *
 * Detection looks for a contiguous run of numeric columns whose headers
 * share one of a few recognisable patterns (year, year-month, quarter,
 * month name). Three or more contiguous matches trigger the suggestion.
 */

const YEAR_RE = /^(?:19|20)\d{2}$/
const YEAR_MONTH_RE = /^(?:19|20)\d{2}[-/]\d{1,2}$/
const QUARTER_RE = /^Q[1-4](?:[\s_-]?(?:19|20)\d{2})?$/i
const MONTH_NAMES = new Set([
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
])

export type WidePattern = 'year' | 'year-month' | 'quarter' | 'month-name'

function classifyHeader(label: string): WidePattern | null {
  const trimmed = label.trim()
  if (YEAR_RE.test(trimmed)) return 'year'
  if (YEAR_MONTH_RE.test(trimmed)) return 'year-month'
  if (QUARTER_RE.test(trimmed)) return 'quarter'
  if (MONTH_NAMES.has(trimmed.toLowerCase())) return 'month-name'
  return null
}

export interface WideDetection {
  /** Pattern detected across the run of headers. */
  pattern: WidePattern
  /** Column keys, in dataset order, that should be melted into rows. */
  meltColumns: string[]
  /** Column keys that stay as identifying dimensions. */
  keepColumns: string[]
  /** Default labels for the new period + value columns. */
  suggestedPeriodLabel: string
  suggestedValueLabel: string
}

/**
 * Walk the columns and report the longest contiguous numeric run with
 * matching header pattern (≥ 3 columns). Returns null when no candidate
 * meets the threshold.
 */
export function detectWidePattern(dataset: Dataset): WideDetection | null {
  if (dataset.columns.length < 4) return null
  let bestStart = -1
  let bestEnd = -1
  let bestPattern: WidePattern | null = null
  let curStart = -1
  let curPattern: WidePattern | null = null
  for (let i = 0; i < dataset.columns.length; i++) {
    const col = dataset.columns[i]
    const isNumeric = col.type === 'number' || col.type === 'currency'
    const classified = classifyHeader(col.label)
    if (!isNumeric || !classified || (curPattern && classified !== curPattern)) {
      if (curStart >= 0 && i - curStart > bestEnd - bestStart) {
        bestStart = curStart
        bestEnd = i
        bestPattern = curPattern
      }
      curStart = -1
      curPattern = null
      // Re-evaluate the current column as a fresh start.
      if (isNumeric && classified) {
        curStart = i
        curPattern = classified
      }
      continue
    }
    if (curStart < 0) {
      curStart = i
      curPattern = classified
    }
  }
  if (curStart >= 0 && dataset.columns.length - curStart > bestEnd - bestStart) {
    bestStart = curStart
    bestEnd = dataset.columns.length
    bestPattern = curPattern
  }
  if (!bestPattern || bestEnd - bestStart < 3) return null
  const meltColumns = dataset.columns.slice(bestStart, bestEnd).map((c) => c.key)
  const keepColumns = dataset.columns.filter((c) => !meltColumns.includes(c.key)).map((c) => c.key)
  if (keepColumns.length === 0) return null
  return {
    pattern: bestPattern,
    meltColumns,
    keepColumns,
    suggestedPeriodLabel:
      bestPattern === 'year'
        ? 'Año'
        : bestPattern === 'year-month'
          ? 'Periodo'
          : bestPattern === 'quarter'
            ? 'Trimestre'
            : 'Mes',
    suggestedValueLabel: 'Valor',
  }
}

/**
 * Apply the detected unpivot. Returns a new Dataset with the keepColumns +
 * two new columns ([periodLabel] for the original header, [valueLabel] for
 * the cell value). Dataset id gains a `:long` suffix to differentiate it
 * from the source in the snapshot store.
 */
export function unpivotDataset(
  dataset: Dataset,
  detection: WideDetection,
  periodLabel = detection.suggestedPeriodLabel,
  valueLabel = detection.suggestedValueLabel,
): Dataset {
  const periodKey = '__period__'
  const valueKey = '__value__'
  const keepColumns: Column[] = detection.keepColumns
    .map((k) => dataset.columns.find((c) => c.key === k))
    .filter((c): c is Column => !!c)
  const meltColumnObjs = detection.meltColumns
    .map((k) => dataset.columns.find((c) => c.key === k))
    .filter((c): c is Column => !!c)
  const newColumns: Column[] = [
    ...keepColumns,
    { key: periodKey, label: periodLabel, type: 'category' },
    { key: valueKey, label: valueLabel, type: 'number' },
  ]
  const newRows: Dataset['rows'] = []
  for (const row of dataset.rows) {
    for (const melt of meltColumnObjs) {
      const v = row[melt.key]
      if (v == null || v === '') continue
      const num = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(num)) continue
      const next: Dataset['rows'][number] = { [periodKey]: melt.label, [valueKey]: num }
      for (const k of detection.keepColumns) next[k] = row[k] ?? null
      newRows.push(next)
    }
  }
  return {
    id: `${dataset.id}:long`,
    label: `${dataset.label} (formato largo)`,
    createdAt: new Date().toISOString(),
    columns: newColumns,
    rows: newRows,
  }
}
