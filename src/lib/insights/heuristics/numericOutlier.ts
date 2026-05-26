// src/lib/insights/heuristics/numericOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const Z_THRESHOLD = 3

export const numericOutlier: Heuristic = {
  type: 'numeric_outlier',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const stats = ctx.numericStats.get(col.key)
      if (!stats || stats.stdDev === 0 || stats.sorted.length < 4) continue

      // Scan original rows for outliers (we need row index for recordRefs)
      for (let i = 0; i < dataset.rows.length; i++) {
        const raw = dataset.rows[i][col.key]
        if (raw == null || raw === '') continue
        const v = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(v)) continue
        const z = (v - stats.mean) / stats.stdDev
        if (Math.abs(z) >= Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'numeric_outlier',
            data: {
              kind: 'numeric_outlier',
              column: col.key,
              value: v,
              record: i,
              zScore: z,
              mean: stats.mean,
              stdDev: stats.stdDev,
            },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [i],
          }))
        }
      }
    }
    return out
  },
}
