// src/lib/insights/heuristics/mixedTypeColumn.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 20
const MISMATCH_THRESHOLD = 0.05
const SAMPLE_SIZE = 4

function isNumeric(s: string): boolean {
  if (s.length === 0) return false
  const cleaned = s
    .trim()
    .replace(/[€$£¥\s%]/g, '')
    .replace(/(?<=\d)\.(?=\d{3})/g, '')
    .replace(',', '.')
  return Number.isFinite(Number(cleaned))
}

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/

function isDate(s: string): boolean {
  return DATE_DMY.test(s) || DATE_ISO.test(s)
}

function matchesType(value: unknown, type: string): boolean {
  if (value == null) return true
  const s = typeof value === 'string' ? value : String(value)
  if (s.trim().length === 0) return true
  switch (type) {
    case 'number':
    case 'currency':
      return typeof value === 'number' || isNumeric(s)
    case 'date':
      return value instanceof Date || isDate(s)
    case 'boolean':
      return typeof value === 'boolean' || /^(true|false|yes|no|sí|si)$/i.test(s)
    default:
      return true
  }
}

/**
 * Mixed-type column detector (#98). For columns the parser typed as numeric,
 * date or boolean we scan every row and count cells that don't match the
 * declared parser. ≥ 5% mismatches surfaces a finding — often a sign that the
 * source spreadsheet has totals, footers, or columns that combine values with
 * units ("12 kg" vs "8 kg" vs "no informa").
 */
export const mixedTypeColumn: Heuristic = {
  type: 'mixed_type_column',
  applies: (dataset) =>
    dataset.columns.some(
      (c) =>
        c.type === 'number' || c.type === 'currency' || c.type === 'date' || c.type === 'boolean',
    ),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (
        col.type !== 'number' &&
        col.type !== 'currency' &&
        col.type !== 'date' &&
        col.type !== 'boolean'
      ) {
        continue
      }
      if (dataset.rows.length < MIN_N) continue
      let nonEmpty = 0
      let mismatch = 0
      const sample: { record: number; value: string }[] = []
      for (let i = 0; i < dataset.rows.length; i++) {
        const raw = dataset.rows[i][col.key]
        if (raw == null) continue
        const s = typeof raw === 'string' ? raw : String(raw)
        if (s.trim().length === 0) continue
        nonEmpty++
        if (!matchesType(raw, col.type)) {
          mismatch++
          if (sample.length < SAMPLE_SIZE) sample.push({ record: i, value: s.slice(0, 32) })
        }
      }
      if (nonEmpty < MIN_N) continue
      const mismatchPct = mismatch / nonEmpty
      if (mismatchPct < MISMATCH_THRESHOLD) continue

      out.push(
        makeFinding({
          type: 'mixed_type_column',
          data: {
            kind: 'mixed_type_column',
            column: col.key,
            declaredType: col.type,
            mismatchCount: mismatch,
            mismatchPct,
            sample,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
