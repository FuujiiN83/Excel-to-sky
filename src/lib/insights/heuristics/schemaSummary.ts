// src/lib/insights/heuristics/schemaSummary.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const schemaSummary: Heuristic = {
  type: 'schema_summary',
  applies: (dataset) => dataset.columns.length > 0,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const byType: Record<string, number> = {}
    for (const [t, n] of Object.entries(summary.byType)) {
      if (n > 0) byType[t] = n
    }
    return [
      makeFinding({
        type: 'schema_summary',
        data: { kind: 'schema_summary', total: dataset.columns.length, byType },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
