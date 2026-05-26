// src/lib/insights/heuristics/temporalCoverage.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const temporalCoverage: Heuristic = {
  type: 'temporal_coverage',
  applies: (_dataset, summary) => !!summary.temporalRange,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    if (!summary.temporalRange) return []
    const dateCol = dataset.columns.find((c) => c.type === 'date')
    if (!dateCol) return []
    const densityPerDay = summary.temporalRange.days === 0
      ? dataset.rows.length
      : dataset.rows.length / summary.temporalRange.days
    return [
      makeFinding({
        type: 'temporal_coverage',
        data: {
          kind: 'temporal_coverage',
          column: dateCol.key,
          from: summary.temporalRange.from,
          to: summary.temporalRange.to,
          days: summary.temporalRange.days,
          densityPerDay,
        },
        columns: [dateCol.key],
        columnLabels: labels,
      }),
    ]
  },
}
