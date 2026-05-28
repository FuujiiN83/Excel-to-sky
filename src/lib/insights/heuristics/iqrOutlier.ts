// src/lib/insights/heuristics/iqrOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 8

/**
 * Tukey-fence outlier detector: anything beyond Q1 − 1.5·IQR or Q3 + 1.5·IQR
 * is flagged. Complements the existing z-score numericOutlier — useful on
 * skewed distributions where the mean and stdDev get dragged around by the
 * very points we are trying to catch (#88).
 */
function quantileFromSorted(sorted: ReadonlyArray<number>, q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (base + 1 < sorted.length) return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  return sorted[base]
}

export const iqrOutlier: Heuristic = {
  type: 'iqr_outlier',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const stats = ctx.numericStats.get(col.key)
      if (!stats || stats.sorted.length < MIN_N) continue
      const q1 = quantileFromSorted(stats.sorted, 0.25)
      const q3 = quantileFromSorted(stats.sorted, 0.75)
      const iqr = q3 - q1
      if (iqr === 0) continue
      const lower = q1 - 1.5 * iqr
      const upper = q3 + 1.5 * iqr

      for (let i = 0; i < dataset.rows.length; i++) {
        const raw = dataset.rows[i][col.key]
        if (raw == null || raw === '') continue
        const v = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(v)) continue
        if (v < lower || v > upper) {
          out.push(
            makeFinding({
              type: 'iqr_outlier',
              data: {
                kind: 'iqr_outlier',
                column: col.key,
                value: v,
                record: i,
                q1,
                q3,
                iqr,
                side: v > upper ? 'above' : 'below',
              },
              columns: [col.key],
              columnLabels: labels,
              recordRefs: [i],
            }),
          )
        }
      }
    }
    return out
  },
}
