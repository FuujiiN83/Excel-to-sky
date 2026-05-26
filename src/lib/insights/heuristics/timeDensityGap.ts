// src/lib/insights/heuristics/timeDensityGap.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const DAY_MS = 86_400_000

export const timeDensityGap: Heuristic = {
  type: 'time_density_gap',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'date'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'date') continue
      const ts = ctx.dateValues.get(col.key)
      if (!ts || ts.length < 5) continue
      const sorted = [...ts].sort((a, b) => a - b)
      const span = sorted[sorted.length - 1] - sorted[0]
      if (span === 0) continue
      const expectedDensity = Math.max(1, Math.round(span / DAY_MS / ts.length))

      // Find gaps significantly larger than expected (≥ 3× expected density, ≥ 7 days)
      let largestGap = 0
      let gapStart = sorted[0]
      let gapEnd = sorted[0]
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1]
        if (gap > largestGap) {
          largestGap = gap
          gapStart = sorted[i - 1]
          gapEnd = sorted[i]
        }
      }
      const gapDays = Math.round(largestGap / DAY_MS)
      if (gapDays < 7 || gapDays < expectedDensity * 3) continue

      out.push(makeFinding({
        type: 'time_density_gap',
        data: {
          kind: 'time_density_gap',
          column: col.key,
          gapStart: new Date(gapStart).toISOString().slice(0, 10),
          gapEnd: new Date(gapEnd).toISOString().slice(0, 10),
          gapDays,
          expectedDensity,
        },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}
