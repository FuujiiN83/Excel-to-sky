import type { Dataset } from '../types/dataset'

/**
 * Lightweight PII detection + redaction utilities for the share flow
 * (#194, #195). The detector is conservative on purpose — false positives
 * would scare the user away from sharing data that is actually fine. The
 * redactor swaps each detected value for a stable hash-style token so
 * aggregate analysis is still possible downstream.
 */

export type PIIKind = 'email' | 'phone' | 'iban' | 'dni-nie' | 'credit-card' | 'long-id'

export interface PIIHit {
  column: string
  /** Number of cells in this column matching a PII pattern. */
  count: number
  /** Dominant kind detected — a column may match more than one regex; we pick the one with the most hits. */
  kind: PIIKind
  /** First 3 redacted previews for the warning UI. Never the raw value. */
  preview: string[]
}

export interface PIIReport {
  hits: PIIHit[]
  totalCells: number
  affectedCells: number
}

interface Detector {
  kind: PIIKind
  test: (s: string) => boolean
}

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const PHONE_RE = /^[+]?\d[\d\s().-]{6,18}\d$/
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/
const DNI_RE = /^[XYZ]?\d{7,8}[A-Z]$/i
const CC_RE = /^(?:\d[ -]?){13,19}$/
const LONG_ID_RE = /^[A-Z0-9]{14,}$/i

const DETECTORS: ReadonlyArray<Detector> = [
  { kind: 'email', test: (s) => EMAIL_RE.test(s) },
  { kind: 'iban', test: (s) => IBAN_RE.test(s.replace(/\s+/g, '')) },
  { kind: 'dni-nie', test: (s) => DNI_RE.test(s) },
  {
    kind: 'credit-card',
    test: (s) => CC_RE.test(s.replace(/[\s-]/g, '')) && luhn(s.replace(/\D/g, '')),
  },
  { kind: 'phone', test: (s) => PHONE_RE.test(s) },
  { kind: 'long-id', test: (s) => LONG_ID_RE.test(s) },
]

function luhn(digits: string): boolean {
  if (!digits) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

/**
 * Scan every cell in the dataset and report columns that look like they
 * contain PII. A column is reported when ≥ 30% of its non-empty cells match
 * the same detector — single accidental matches don't trigger.
 */
export function detectPII(dataset: Dataset): PIIReport {
  const hits: PIIHit[] = []
  let totalCells = 0
  let affectedCells = 0

  for (const col of dataset.columns) {
    if (col.type !== 'text' && col.type !== 'category') continue
    const perKind = new Map<PIIKind, { count: number; samples: string[] }>()
    let nonEmpty = 0
    for (const row of dataset.rows) {
      const raw = row[col.key]
      if (raw == null) continue
      const s = typeof raw === 'string' ? raw.trim() : String(raw)
      if (!s) continue
      nonEmpty++
      for (const det of DETECTORS) {
        if (!det.test(s)) continue
        const bucket = perKind.get(det.kind) ?? { count: 0, samples: [] }
        bucket.count++
        if (bucket.samples.length < 3) bucket.samples.push(redactValue(s, det.kind))
        perKind.set(det.kind, bucket)
        break // one kind per cell
      }
    }
    if (nonEmpty === 0) continue
    totalCells += nonEmpty
    let best: { kind: PIIKind; count: number; samples: string[] } | null = null
    for (const [kind, bucket] of perKind) {
      if (!best || bucket.count > best.count)
        best = { kind, count: bucket.count, samples: bucket.samples }
    }
    if (!best) continue
    const share = best.count / nonEmpty
    if (share < 0.3) continue
    affectedCells += best.count
    hits.push({ column: col.key, count: best.count, kind: best.kind, preview: best.samples })
  }
  return { hits, totalCells, affectedCells }
}

/**
 * Produce a stable, opaque redacted preview of a value. We hash-tokenise via
 * a fast non-cryptographic FNV-1a — adequate for "this cell is no longer
 * recognisable" without paying the cost of SubtleCrypto.
 */
export function redactValue(raw: string, kind: PIIKind): string {
  const h = fnv1aHex(`${kind}::${raw}`)
  const prefix = REDACT_PREFIX[kind]
  return `${prefix}-${h.slice(0, 8)}`
}

const REDACT_PREFIX: Record<PIIKind, string> = {
  email: 'mail',
  phone: 'tel',
  iban: 'iban',
  'dni-nie': 'id',
  'credit-card': 'cc',
  'long-id': 'tkn',
}

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/**
 * Return a copy of the dataset with every PII-detected cell replaced by a
 * redacted token. The returned dataset is otherwise structurally identical so
 * downstream consumers (sharing, exports, insights) don't need to know.
 */
export function redactDataset(dataset: Dataset): Dataset {
  const report = detectPII(dataset)
  if (report.hits.length === 0) return dataset
  const columnsByKey = new Map(report.hits.map((h) => [h.column, h.kind]))
  const rows = dataset.rows.map((row) => {
    const next: typeof row = { ...row }
    for (const [col, kind] of columnsByKey) {
      const raw = row[col]
      if (raw == null) continue
      const s = typeof raw === 'string' ? raw : String(raw)
      if (!s.trim()) continue
      next[col] = redactValue(s, kind)
    }
    return next
  })
  return { ...dataset, rows }
}

const KIND_LABEL: Record<PIIKind, string> = {
  email: 'Emails',
  phone: 'Teléfonos',
  iban: 'IBAN',
  'dni-nie': 'DNI / NIE',
  'credit-card': 'Tarjetas',
  'long-id': 'IDs largos',
}

export function describeHit(hit: PIIHit, columnLabel: string): string {
  return `${KIND_LABEL[hit.kind]} en ${columnLabel} (${hit.count} celdas)`
}
