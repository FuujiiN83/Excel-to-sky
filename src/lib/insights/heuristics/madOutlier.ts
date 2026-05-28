// src/lib/insights/heuristics/madOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 8
const MZ_THRESHOLD = 3.5

function median(sorted: ReadonlyArray<number>): number {
  const n = sorted.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * MAD-based modified z-score outlier detector (#89). The classic z-score is
 * pulled around by the very outliers we want to find, so this estimator uses
 * the median and median absolute deviation instead. Threshold |M-z| ≥ 3.5
 * is the conventional cutoff from Iglewicz & Hoaglin (1993).
 */
export const madOutlier: Heuristic = {
  type: 'mad_outlier',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const stats = ctx.numericStats.get(col.key)
      if (!stats || stats.sorted.length < MIN_N) continue
      const med = median(stats.sorted)
      const deviations = stats.sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b)
      const mad = median(deviations)
      if (mad === 0) continue

      for (let i = 0; i < dataset.rows.length; i++) {
        const raw = dataset.rows[i][col.key]
        if (raw == null || raw === '') continue
        const v = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(v)) continue
        // Modified z-score formula (Iglewicz & Hoaglin). 0.6745 is the 75th
        // percentile of the standard normal — used to put the MAD on the same
        // scale as the standard deviation.
        const mz = (0.6745 * (v - med)) / mad
        if (Math.abs(mz) >= MZ_THRESHOLD) {
          out.push(
            makeFinding({
              type: 'mad_outlier',
              data: {
                kind: 'mad_outlier',
                column: col.key,
                value: v,
                record: i,
                median: med,
                mad,
                modifiedZ: mz,
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
