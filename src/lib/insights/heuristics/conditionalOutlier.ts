// src/lib/insights/heuristics/conditionalOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUP_SIZE = 5
const LOCAL_Z = 3

export const conditionalOutlier: Heuristic = {
  type: 'conditional_outlier',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )

    for (const mCol of dataset.columns) {
      if (mCol.type !== 'number' && mCol.type !== 'currency') continue
      const globalStats = ctx.numericStats.get(mCol.key)
      if (!globalStats) continue

      for (const gCol of groupCols) {
        const groups = new Map<string, { values: { value: number; index: number }[] }>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          if (g == null || g === '' || m == null || m === '') continue
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const gk = String(g)
          const entry = groups.get(gk) ?? { values: [] }
          entry.values.push({ value: mn, index: i })
          groups.set(gk, entry)
        }

        for (const [gk, entry] of groups) {
          if (entry.values.length < MIN_GROUP_SIZE) continue
          const nums = entry.values.map((v) => v.value)
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length
          const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length
          const stdDev = Math.sqrt(variance)
          if (stdDev === 0) continue
          // Skip groups whose own mean is close to global (they wouldn't generate "conditional" surprise)
          if (Math.abs(mean - globalStats.mean) / Math.max(globalStats.stdDev, 1e-9) < 1) {
            for (const { value, index } of entry.values) {
              const z = (value - mean) / stdDev
              if (Math.abs(z) >= LOCAL_Z) {
                out.push(makeFinding({
                  type: 'conditional_outlier',
                  data: {
                    kind: 'conditional_outlier',
                    column: mCol.key,
                    groupColumn: gCol.key,
                    group: gk,
                    value,
                    record: index,
                    localMean: mean,
                    globalMean: globalStats.mean,
                  },
                  columns: [mCol.key, gCol.key],
                  columnLabels: labels,
                  recordRefs: [index],
                }))
              }
            }
          }
        }
      }
    }
    return out
  },
}
