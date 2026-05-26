import type { ColumnType } from '../types/dataset'

const TRUE_VALUES = new Set(['true', '1', 'sí', 'si', 'yes', 'y', 'verdadero'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'falso'])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
const DMY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/

const THRESHOLD = 0.8
const CATEGORY_MAX_RATIO = 0.05
const CATEGORY_MIN_ROWS = 20

export function detectBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (TRUE_VALUES.has(v)) return true
  if (FALSE_VALUES.has(v)) return false
  return null
}

export function detectNumber(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim().replace(/[€$£¥\s]/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function detectDate(raw: string): Date | null {
  if (!raw) return null
  const s = raw.trim()
  if (ISO_DATE.test(s)) {
    const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s)
    return isNaN(d.getTime()) ? null : d
  }
  const m = DMY.exec(s)
  if (m) {
    const [, day, month, year] = m
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function sample<T>(values: T[], max = 200): T[] {
  if (values.length <= max) return values
  const head = values.slice(0, max / 2)
  const tail: T[] = []
  for (let i = 0; i < max / 2; i++) {
    tail.push(values[Math.floor(Math.random() * values.length)])
  }
  return [...head, ...tail]
}

export function inferColumnType(rawValues: (string | null | undefined)[]): ColumnType {
  const filtered = rawValues.filter((v): v is string => v != null && v !== '')
  const sampled = sample(filtered)
  if (sampled.length === 0) return 'text'

  const counts = { boolean: 0, date: 0, number: 0 }
  for (const v of sampled) {
    if (detectBoolean(v) !== null) counts.boolean++
    if (detectDate(v) !== null) counts.date++
    if (detectNumber(v) !== null) counts.number++
  }
  const total = sampled.length

  if (counts.boolean / total >= THRESHOLD) return 'boolean'
  if (counts.date / total >= THRESHOLD) return 'date'
  if (counts.number / total >= THRESHOLD) return 'number'

  const unique = new Set(sampled).size
  if (total >= CATEGORY_MIN_ROWS && unique / total < CATEGORY_MAX_RATIO) return 'category'

  return 'text'
}
