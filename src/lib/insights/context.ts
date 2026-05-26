// src/lib/insights/context.ts
import type { Dataset } from '../../types/dataset'
import { fnv1a } from './hash'

export interface NumericStats {
  mean: number
  stdDev: number
  sum: number
  /** Ascending sorted copy of valid numeric values. */
  sorted: number[]
}

export interface AnalysisContext {
  /** column.key -> valid numeric values (NaN/null removed). */
  numericValues: Map<string, number[]>
  /** column.key -> precomputed stats. */
  numericStats: Map<string, NumericStats>
  /** column.key -> Map<value, count> for categorical/text/geo columns. */
  valueCounts: Map<string, Map<string, number>>
  /** column.key -> ms timestamps for date columns. */
  dateValues: Map<string, number[]>
  /** Stable hash per row (for dataset-level duplicate detection). */
  rowHashes: string[]
}

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/

function toMillis(raw: unknown): number | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const s = String(raw).trim()
  if (!s) return null
  let m = DATE_DMY.exec(s)
  if (m) {
    const [, d, mo, y] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  m = DATE_ISO.exec(s)
  if (m) {
    const [, y, mo, d] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function toNumber(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw === 'boolean') return raw ? 1 : 0
  const s = String(raw).trim().replace(/[€$£¥\s]/g, '')
  // ES-locale aware decimal: prefer comma-as-decimal when both `,` and `.` present
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let cleaned = s
  if (lastComma !== -1 && lastDot !== -1) {
    cleaned = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    cleaned = s.replace(',', '.')
  }
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function computeNumericStats(values: number[]): NumericStats {
  if (values.length === 0) return { mean: 0, stdDev: 0, sum: 0, sorted: [] }
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / values.length
  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  const stdDev = Math.sqrt(variance / values.length)
  const sorted = [...values].sort((a, b) => a - b)
  return { mean, stdDev, sum, sorted }
}

export function buildContext(dataset: Dataset): AnalysisContext {
  const numericValues = new Map<string, number[]>()
  const numericStats = new Map<string, NumericStats>()
  const valueCounts = new Map<string, Map<string, number>>()
  const dateValues = new Map<string, number[]>()

  for (const col of dataset.columns) {
    if (col.type === 'number' || col.type === 'currency') {
      const nums: number[] = []
      for (const row of dataset.rows) {
        const n = toNumber(row[col.key])
        if (n !== null) nums.push(n)
      }
      numericValues.set(col.key, nums)
      numericStats.set(col.key, computeNumericStats(nums))
    } else if (col.type === 'date') {
      const ts: number[] = []
      for (const row of dataset.rows) {
        const t = toMillis(row[col.key])
        if (t !== null) ts.push(t)
      }
      dateValues.set(col.key, ts)
    } else {
      // category / text / geo / boolean
      const counts = new Map<string, number>()
      for (const row of dataset.rows) {
        const v = row[col.key]
        if (v == null || v === '') continue
        const k = String(v)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      valueCounts.set(col.key, counts)
    }
  }

  // Row hashes for duplicate detection
  const rowHashes = dataset.rows.map((row) => {
    const parts: string[] = []
    for (const col of dataset.columns) {
      const v = row[col.key]
      parts.push(v == null ? '' : String(v))
    }
    return fnv1a(parts.join('\u0001'))
  })

  return { numericValues, numericStats, valueCounts, dateValues, rowHashes }
}
