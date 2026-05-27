import type { CellValue, ColumnType, Dataset } from '../types/dataset'

// ---------- Formatting helpers ----------

/**
 * Module-level locale used by every fmt* helper. SettingsContext keeps it in
 * sync with the persisted user preference via setNumberLocale below. Default
 * is es-ES to preserve historical behaviour when settings haven't loaded yet.
 */
let activeNumberLocale = 'es-ES'

export function setNumberLocale(locale: string): void {
  activeNumberLocale = locale
}

type DateFormatSetting = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'
let activeDateFormat: DateFormatSetting = 'dd/mm/yyyy'

export function setDateFormat(format: DateFormatSetting): void {
  activeDateFormat = format
}

/**
 * Format a date string or Date according to the active user preference.
 * Accepts dd/mm/yyyy (the canonical internal representation produced by
 * analyzeColumn), ISO yyyy-mm-dd, or a Date instance.
 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (value == null) return '—'
  const parts = toDateParts(value)
  if (!parts) return typeof value === 'string' ? value : '—'
  const dd = String(parts.d).padStart(2, '0')
  const mm = String(parts.m).padStart(2, '0')
  const yyyy = String(parts.y)
  switch (activeDateFormat) {
    case 'mm/dd/yyyy':
      return `${mm}/${dd}/${yyyy}`
    case 'yyyy-mm-dd':
      return `${yyyy}-${mm}-${dd}`
    case 'dd/mm/yyyy':
    default:
      return `${dd}/${mm}/${yyyy}`
  }
}

function toDateParts(value: string | Date): { d: number; m: number; y: number } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return { d: value.getDate(), m: value.getMonth() + 1, y: value.getFullYear() }
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (dmy) return { d: Number(dmy[1]), m: Number(dmy[2]), y: Number(dmy[3]) }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return { d: Number(iso[3]), m: Number(iso[2]), y: Number(iso[1]) }
  return null
}

export function fmtNumber(n: unknown): string {
  if (n === undefined || n === null) return '—'
  if (typeof n !== 'number') return String(n)
  if (Number.isNaN(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (Math.abs(n) >= 10_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  if (Number.isInteger(n)) return n.toLocaleString(activeNumberLocale)
  return n.toLocaleString(activeNumberLocale, { maximumFractionDigits: 1 })
}

export function fmtUnit(n: unknown, unit?: string): string {
  const s = fmtNumber(n)
  if (!unit) return s
  if (unit === '€') return `${s} €`
  return `${s} ${unit}`
}

// ---------- Coercion ----------

function isPresent(v: CellValue): boolean {
  return v !== null && v !== undefined && v !== ''
}

function toNumber(v: CellValue): number {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null) return NaN
  const n = Number(v)
  return n
}

// ---------- Analysis ----------

export interface HistogramBucket {
  lo: number
  hi: number
  count: number
  label: string
}

export interface TopItem {
  key: string
  count: number
}

export interface TimelinePoint {
  key: string
  count: number
}

export interface ColumnAnalysis {
  type: ColumnType
  count: number
  nullCount: number
  // numeric
  min?: number
  max?: number
  mean?: number
  median?: number
  mode?: number | string
  range?: number
  sum?: number
  histogram?: HistogramBucket[]
  values?: number[]
  // categorical
  distinct?: number
  top?: TopItem[]
  bottom?: TopItem[]
  modeCount?: number
  least?: string
  leastCount?: number
  // date
  earliest?: string
  latest?: string
  timeline?: TimelinePoint[]
}

function parseDate(value: string): { t: number; d: number; m: number; y: number } | null {
  // Expected format: dd/mm/yyyy (matches legacy sample generator)
  const parts = value.split('/').map(Number)
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null
  const [d, m, y] = parts
  return { d, m, y, t: new Date(y, m - 1, d).getTime() }
}

export interface AnalyzeColumnOptions {
  /** Number of histogram buckets for numeric/currency columns. Defaults to 10. */
  bins?: number
}

export function analyzeColumn(
  dataset: Dataset,
  columnKey: string,
  options: AnalyzeColumnOptions = {},
): ColumnAnalysis {
  const col = dataset.columns.find((c) => c.key === columnKey)
  if (!col) {
    return { type: 'text', count: 0, nullCount: dataset.rows.length }
  }

  const allValues = dataset.rows.map((row) => row[columnKey])
  const values = allValues.filter(isPresent)

  const out: ColumnAnalysis = {
    type: col.type,
    count: values.length,
    nullCount: dataset.rows.length - values.length,
  }

  if (col.type === 'number' || col.type === 'currency') {
    const nums = values.map(toNumber).filter((n) => !Number.isNaN(n))
    if (nums.length === 0) return out
    nums.sort((a, b) => a - b)
    const sum = nums.reduce((a, b) => a + b, 0)
    const min = nums[0]
    const max = nums[nums.length - 1]
    const mean = sum / nums.length
    const median =
      nums.length % 2
        ? nums[(nums.length - 1) / 2]
        : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
    const freq: Record<string, number> = {}
    nums.forEach((n) => {
      const key = String(n)
      freq[key] = (freq[key] || 0) + 1
    })
    const modeEntry = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    const mode = modeEntry ? Number(modeEntry[0]) : undefined

    // Histogram: 10 buckets
    // Histogram bin count is configurable per call (#61). Defaults preserve
    // the legacy 10-bin behaviour; the column-detail page exposes a slider.
    const bins = Math.max(2, Math.min(100, options.bins ?? 10))
    const step = (max - min) / bins || 1
    const histogram: HistogramBucket[] = Array.from({ length: bins }, (_, i) => {
      const lo = min + i * step
      const hi = i === bins - 1 ? max + 0.0001 : lo + step
      return {
        lo,
        hi,
        count: nums.filter((n) => n >= lo && n < hi).length,
        label: `${Math.round(lo)}`,
      }
    })

    out.min = min
    out.max = max
    out.mean = mean
    out.median = median
    out.mode = mode
    out.range = max - min
    out.sum = sum
    out.values = nums
    out.histogram = histogram
    return out
  }

  if (
    col.type === 'category' ||
    col.type === 'text' ||
    col.type === 'geo' ||
    col.type === 'boolean'
  ) {
    const freq: Record<string, number> = {}
    values.forEach((v) => {
      const key = String(v)
      freq[key] = (freq[key] || 0) + 1
    })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return out
    out.distinct = sorted.length
    out.top = sorted.slice(0, 8).map(([key, count]) => ({ key, count }))
    out.bottom = sorted
      .slice(-3)
      .reverse()
      .map(([key, count]) => ({ key, count }))
    out.mode = sorted[0][0]
    out.modeCount = sorted[0][1]
    const last = sorted[sorted.length - 1]
    out.least = last[0]
    out.leastCount = last[1]
    return out
  }

  if (col.type === 'date') {
    const parsed = values
      .map((v) => (typeof v === 'string' ? parseDate(v) : null))
      .filter((p): p is { t: number; d: number; m: number; y: number } => p !== null)
      .map((p, i) => ({ ...p, original: String(values[i]) }))
      .sort((a, b) => a.t - b.t)
    if (parsed.length === 0) return out
    const earliest = parsed[0]
    const latest = parsed[parsed.length - 1]
    out.earliest = `${String(earliest.d).padStart(2, '0')}/${String(earliest.m).padStart(2, '0')}/${earliest.y}`
    out.latest = `${String(latest.d).padStart(2, '0')}/${String(latest.m).padStart(2, '0')}/${latest.y}`
    const buckets: Record<string, number> = {}
    parsed.forEach((p) => {
      const key = `${p.y}-${String(p.m).padStart(2, '0')}`
      buckets[key] = (buckets[key] || 0) + 1
    })
    out.timeline = Object.entries(buckets).map(([key, count]) => ({ key, count }))
    out.distinct = new Set(values.map(String)).size
    return out
  }

  return out
}

// ---------- Aggregation across rows ----------

export interface GroupAggregate {
  key: string
  count: number
  sum: number
  avg: number
  min: number
  max: number
}

export function groupAggregate(
  dataset: Dataset,
  groupKey: string,
  metricKey: string,
): GroupAggregate[] {
  const map: Record<string, number[]> = {}
  for (const row of dataset.rows) {
    const g = row[groupKey]
    if (!isPresent(g)) continue
    const m = toNumber(row[metricKey])
    const k = String(g)
    if (!map[k]) map[k] = []
    if (!Number.isNaN(m)) map[k].push(m)
  }
  return Object.entries(map).map(([key, arr]) => {
    const sum = arr.reduce((a, b) => a + b, 0)
    const avg = arr.length ? sum / arr.length : 0
    const min = arr.length ? Math.min(...arr) : 0
    const max = arr.length ? Math.max(...arr) : 0
    return { key, count: arr.length, sum, avg, min, max }
  })
}

export function coerceNumbers(dataset: Dataset, key: string): number[] {
  return dataset.rows.map((r) => toNumber(r[key])).filter((n) => !Number.isNaN(n))
}

export function coercePairs(
  dataset: Dataset,
  xKey: string,
  yKey: string,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const row of dataset.rows) {
    const x = toNumber(row[xKey])
    const y = toNumber(row[yKey])
    if (!Number.isNaN(x) && !Number.isNaN(y)) out.push({ x, y })
  }
  return out
}
