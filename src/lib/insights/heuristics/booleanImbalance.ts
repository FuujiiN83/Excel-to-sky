// src/lib/insights/heuristics/booleanImbalance.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 10
const IMBALANCE_THRESHOLD = 0.95

const TRUTHY = new Set(['true', 'verdadero', 'si', 'sí', 'yes', '1'])
const FALSY = new Set(['false', 'falso', 'no', '0'])

/**
 * Boolean-column base-rate finding (#96). Detects columns where one class
 * dominates the other (default ≥ 95%) so the column has little information
 * value. Also accepts string-valued boolean columns ("Sí"/"No", "True"/"False"…)
 * since Excel files rarely come with strict native booleans.
 */
export const booleanImbalance: Heuristic = {
  type: 'boolean_imbalance',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'boolean' || c.type === 'category'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      const counts = ctx.valueCounts.get(col.key)
      if (!counts) continue
      // Only consider columns that look boolean: 2 distinct values mapping to
      // a known truthy/falsy lexeme, or declared boolean by the parser.
      const entries = Array.from(counts.entries())
      if (entries.length !== 2 && col.type !== 'boolean') continue
      let trueCount = 0
      let falseCount = 0
      for (const [key, count] of entries) {
        const k = key.trim().toLowerCase()
        if (TRUTHY.has(k)) trueCount += count
        else if (FALSY.has(k)) falseCount += count
      }
      if (trueCount + falseCount < MIN_N) continue
      const total = trueCount + falseCount
      const baseRate = trueCount / total
      const dominantShare = Math.max(baseRate, 1 - baseRate)
      if (dominantShare < IMBALANCE_THRESHOLD) continue

      out.push(
        makeFinding({
          type: 'boolean_imbalance',
          data: {
            kind: 'boolean_imbalance',
            column: col.key,
            trueCount,
            falseCount,
            total,
            baseRate,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
