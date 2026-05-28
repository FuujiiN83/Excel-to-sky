// src/lib/insights/heuristics/ambiguousDateLocale.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 10
const AMBIGUOUS_RATIO = 0.2
const SAMPLE_SIZE = 4

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/

/**
 * Ambiguous date locale detector (#99). For each date column we count rows
 * where both DD/MM and MM/DD interpretations produce a valid date with a
 * day field ≤ 12. Those rows can be assigned either way; if a column has a
 * meaningful share of them the user should pick a format explicitly before
 * any time-series math gets nondeterministic.
 */
export const ambiguousDateLocale: Heuristic = {
  type: 'ambiguous_date_locale',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'date'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'date') continue
      let total = 0
      let bothCount = 0
      const sample: string[] = []
      for (const row of dataset.rows) {
        const raw = row[col.key]
        if (raw == null || raw === '') continue
        const s = typeof raw === 'string' ? raw.trim() : String(raw).trim()
        const m = DATE_DMY.exec(s)
        if (!m) continue
        total++
        const a = Number(m[1])
        const b = Number(m[2])
        // Both fields ≤ 12 → swap is also a valid date; the column is
        // ambiguous for this row regardless of locale chosen.
        if (a <= 12 && b <= 12 && a !== b) {
          bothCount++
          if (sample.length < SAMPLE_SIZE) sample.push(s)
        }
      }
      if (total < MIN_N) continue
      if (bothCount / total < AMBIGUOUS_RATIO) continue

      out.push(
        makeFinding({
          type: 'ambiguous_date_locale',
          data: {
            kind: 'ambiguous_date_locale',
            column: col.key,
            bothCount,
            total,
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
