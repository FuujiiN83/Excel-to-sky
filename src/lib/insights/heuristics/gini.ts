// src/lib/insights/heuristics/gini.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 15
const GINI_THRESHOLD = 0.35

/**
 * Gini coefficient on the sorted positive values of a numeric column. We use
 * the Lorenz-curve integration form: G = (Σ (2i − n − 1) · x_i) / (n · Σ x_i)
 * which is O(n log n) including the sort and stable on duplicate values.
 */
export function giniCoefficient(sortedPositive: ReadonlyArray<number>): number {
  const n = sortedPositive.length
  if (n === 0) return 0
  let sum = 0
  let weighted = 0
  for (let i = 0; i < n; i++) {
    sum += sortedPositive[i]
    weighted += (2 * (i + 1) - n - 1) * sortedPositive[i]
  }
  if (sum === 0) return 0
  return weighted / (n * sum)
}

/**
 * Gini index of numeric columns (#105). Complements Pareto: Gini quantifies
 * the *whole* curve of inequality, not just the head. We also report the share
 * of the top quintile so the finding reads concretely ("top 20% holds X%").
 */
export const gini: Heuristic = {
  type: 'gini',
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
      const ascending = positives.slice().sort((a, b) => a - b)
      const g = giniCoefficient(ascending)
      if (g < GINI_THRESHOLD) continue

      const total = ascending.reduce((s, v) => s + v, 0)
      const topQuintileStart = Math.floor(ascending.length * 0.8)
      const topQuintileTotal = ascending.slice(topQuintileStart).reduce((s, v) => s + v, 0)

      out.push(
        makeFinding({
          type: 'gini',
          data: {
            kind: 'gini',
            column: col.key,
            gini: g,
            topQuintileShare: total === 0 ? 0 : topQuintileTotal / total,
            n: ascending.length,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
