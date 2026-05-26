// src/lib/insights/heuristics/categoryConcentration.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_COVERAGE = 0.5
const MIN_ROWS = 10

export const categoryConcentration: Heuristic = {
  type: 'category_concentration',
  applies: (dataset) =>
    dataset.rows.length >= MIN_ROWS &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'geo' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'category' && col.type !== 'text' && col.type !== 'geo' && col.type !== 'boolean') continue
      const counts = ctx.valueCounts.get(col.key)
      if (!counts || counts.size < 2) continue
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      if (total < MIN_ROWS) continue

      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      const topN = Math.min(3, sorted.length)
      const top = sorted.slice(0, topN).map(([value, count]) => ({
        value,
        count,
        pct: count / total,
      }))
      const coveragePct = top.reduce((s, t) => s + t.pct, 0)
      if (coveragePct < MIN_COVERAGE) continue

      // Build recordRefs from rows matching the top values (capped at 500)
      const topSet = new Set(top.map((t) => t.value))
      const refs: number[] = []
      for (let i = 0; i < dataset.rows.length && refs.length < 500; i++) {
        const v = dataset.rows[i][col.key]
        if (v != null && topSet.has(String(v))) refs.push(i)
      }

      out.push(makeFinding({
        type: 'category_concentration',
        data: { kind: 'category_concentration', column: col.key, top, coveragePct },
        columns: [col.key],
        columnLabels: labels,
        recordRefs: refs,
      }))
    }
    return out
  },
}
