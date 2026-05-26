// src/lib/insights/heuristics/volumeContext.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const volumeContext: Heuristic = {
  type: 'volume_context',
  applies: () => true,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    return [
      makeFinding({
        type: 'volume_context',
        data: {
          kind: 'volume_context',
          rows: dataset.rows.length,
          columns: dataset.columns.length,
          cells: dataset.rows.length * dataset.columns.length,
        },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
