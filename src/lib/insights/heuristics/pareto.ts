// src/lib/insights/heuristics/pareto.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 15
/**
 * Trigger threshold: if the top 20% of records hold at least 60% of the total
 * we call it a Pareto pattern. Below that the distribution is too flat to be
 * worth flagging — pure 80/20 is the textbook example, but real datasets
 * rarely hit that exact number and "60% from the top 20%" is still a strong
 * inequality signal.
 */
const SHARE_THRESHOLD = 0.6

/**
 * Pareto principle detector (#104). Sorts numeric values descending and asks
 * whether the top 20% of records accounts for a heavy share of the total.
 * Useful on revenue, traffic, customer-spend columns where the head matters
 * disproportionately for prioritisation.
 */
export const pareto: Heuristic = {
  type: 'pareto',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const values = ctx.numericValues.get(col.key)
      if (!values || values.length < MIN_N) continue
      const positives = values.filter((v) => v > 0)
      if (positives.length < MIN_N) continue
      const sorted = positives.slice().sort((a, b) => b - a)
      const total = sorted.reduce((s, v) => s + v, 0)
      if (total === 0) continue
      const topCount = Math.max(1, Math.floor(sorted.length * 0.2))
      const topTotal = sorted.slice(0, topCount).reduce((s, v) => s + v, 0)
      const share80 = topTotal / total
      if (share80 < SHARE_THRESHOLD) continue

      out.push(
        makeFinding({
          type: 'pareto',
          data: {
            kind: 'pareto',
            column: col.key,
            topShare: share80,
            topCount,
            totalCount: sorted.length,
            share80,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
