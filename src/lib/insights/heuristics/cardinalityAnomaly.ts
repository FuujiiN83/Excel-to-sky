// src/lib/insights/heuristics/cardinalityAnomaly.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_ROWS = 10

export const cardinalityAnomaly: Heuristic = {
  type: 'cardinality_anomaly',
  applies: (dataset) => dataset.rows.length >= MIN_ROWS,
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      let distinct = 0
      let total = 0
      if (col.type === 'category' || col.type === 'text' || col.type === 'geo' || col.type === 'boolean') {
        const counts = ctx.valueCounts.get(col.key)
        if (!counts) continue
        distinct = counts.size
        total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      } else if (col.type === 'number' || col.type === 'currency') {
        const nums = ctx.numericValues.get(col.key) ?? []
        total = nums.length
        distinct = new Set(nums).size
      } else if (col.type === 'date') {
        const ts = ctx.dateValues.get(col.key) ?? []
        total = ts.length
        distinct = new Set(ts).size
      } else continue

      if (total < MIN_ROWS) continue

      const allSame = distinct === 1
      const allUnique = distinct === total && total > 1
      if (!allSame && !allUnique) continue

      out.push(makeFinding({
        type: 'cardinality_anomaly',
        data: { kind: 'cardinality_anomaly', column: col.key, distinct, total, reason: allSame ? 'all_same' : 'all_unique' },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}
