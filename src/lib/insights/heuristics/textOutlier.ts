// src/lib/insights/heuristics/textOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_ROWS = 10
const Z_THRESHOLD = 3
const SPECIAL_CHARS = /[^\p{L}\p{N}\s.,;:'"@#%&()/+-]/u

export const textOutlier: Heuristic = {
  type: 'text_outlier',
  applies: (dataset) =>
    dataset.rows.length >= MIN_ROWS &&
    dataset.columns.some((c) => c.type === 'text' || c.type === 'category'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'text' && col.type !== 'category') continue
      const lengths: number[] = []
      const stringRows: { value: string; index: number }[] = []
      for (let i = 0; i < dataset.rows.length; i++) {
        const v = dataset.rows[i][col.key]
        if (v == null || v === '') continue
        const s = String(v)
        lengths.push(s.length)
        stringRows.push({ value: s, index: i })
      }
      if (lengths.length < MIN_ROWS) continue
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
      const variance = lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length
      const stdDev = Math.sqrt(variance)

      for (const { value, index } of stringRows) {
        const z = stdDev > 0 ? (value.length - mean) / stdDev : 0
        if (SPECIAL_CHARS.test(value)) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'special_chars' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        } else if (z >= Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'too_long' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        } else if (z <= -Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'too_short' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        }
      }
    }
    return out
  },
}
