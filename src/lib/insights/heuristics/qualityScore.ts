// src/lib/insights/heuristics/qualityScore.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const qualityScore: Heuristic = {
  type: 'quality_score',
  applies: (dataset) => dataset.rows.length > 0,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const cellsTotal = dataset.rows.length * dataset.columns.length
    const cellsValid = Math.round(cellsTotal * (1 - summary.nullPct))
    const issues: { type: string; count: number }[] = []
    if (summary.nullPct > 0.05) issues.push({ type: 'missing', count: Math.round(cellsTotal * summary.nullPct) })
    if (summary.duplicateRowCount > 0) issues.push({ type: 'duplicates', count: summary.duplicateRowCount })

    return [
      makeFinding({
        type: 'quality_score',
        data: {
          kind: 'quality_score',
          score: summary.qualityScore,
          cellsTotal,
          cellsValid,
          duplicateRows: summary.duplicateRowCount,
          issues,
        },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
