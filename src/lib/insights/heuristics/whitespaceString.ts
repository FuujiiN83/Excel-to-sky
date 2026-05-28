// src/lib/insights/heuristics/whitespaceString.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_COUNT = 3
const SAMPLE_SIZE = 3

/**
 * Whitespace-only cell detector (#97). Today the missingData heuristic lumps
 * `""` and `"   "` together with true nulls. This finding surfaces the
 * subset that is technically non-empty but visually blank, so the user can
 * normalise the column without losing real data behind a blanket null replace.
 */
export const whitespaceString: Heuristic = {
  type: 'whitespace_string',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'text' || c.type === 'category' || c.type === 'geo'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'text' && col.type !== 'category' && col.type !== 'geo') continue
      let count = 0
      const sample: string[] = []
      for (const row of dataset.rows) {
        const v = row[col.key]
        if (typeof v !== 'string') continue
        if (v.length === 0) continue
        if (v.trim().length !== 0) continue
        count++
        if (sample.length < SAMPLE_SIZE) sample.push(JSON.stringify(v))
      }
      if (count < MIN_COUNT) continue
      const pct = count / dataset.rows.length

      out.push(
        makeFinding({
          type: 'whitespace_string',
          data: {
            kind: 'whitespace_string',
            column: col.key,
            count,
            pct,
            sample,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
