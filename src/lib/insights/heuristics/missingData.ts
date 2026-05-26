// src/lib/insights/heuristics/missingData.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_PCT = 0.1
const MIN_ROWS = 10

export const missingData: Heuristic = {
  type: 'missing_data',
  applies: (dataset) => dataset.rows.length >= MIN_ROWS,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const total = dataset.rows.length

    for (const col of dataset.columns) {
      let nulls = 0
      const refs: number[] = []
      for (let i = 0; i < dataset.rows.length; i++) {
        const v = dataset.rows[i][col.key]
        if (v == null || v === '') {
          nulls++
          if (refs.length < 500) refs.push(i)
        }
      }
      const pct = nulls / total
      if (pct < MIN_PCT || nulls === 0) continue

      out.push(makeFinding({
        type: 'missing_data',
        data: { kind: 'missing_data', column: col.key, nullCount: nulls, nullPct: pct },
        columns: [col.key],
        columnLabels: labels,
        recordRefs: refs,
      }))
    }
    return out
  },
}
