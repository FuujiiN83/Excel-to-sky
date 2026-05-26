// src/lib/insights/heuristics/groupDisparity.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUPS = 2
const MAX_GROUPS = 50
const MIN_PER_GROUP = 3
const RATIO_THRESHOLD = 2

export const groupDisparity: Heuristic = {
  type: 'group_disparity',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )
    const metricCols = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency'
    )
    const out: Finding[] = []

    for (const gCol of groupCols) {
      for (const mCol of metricCols) {
        // means per group
        const sums = new Map<string, { total: number; count: number; refs: number[] }>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          if (g == null || g === '' || m == null || m === '') continue
          const gk = String(g)
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const entry = sums.get(gk) ?? { total: 0, count: 0, refs: [] }
          entry.total += mn
          entry.count++
          if (entry.refs.length < 100) entry.refs.push(i)
          sums.set(gk, entry)
        }
        if (sums.size < MIN_GROUPS || sums.size > MAX_GROUPS) continue

        // valid groups with min sample
        const groups = Array.from(sums.entries())
          .filter(([, v]) => v.count >= MIN_PER_GROUP)
          .map(([k, v]) => ({ key: k, mean: v.total / v.count, refs: v.refs }))
        if (groups.length < MIN_GROUPS) continue
        groups.sort((a, b) => b.mean - a.mean || a.key.localeCompare(b.key))

        const top = groups[0]
        const bottom = groups[groups.length - 1]
        if (bottom.mean <= 0) continue
        const ratio = top.mean / bottom.mean
        if (ratio < RATIO_THRESHOLD) continue

        out.push(makeFinding({
          type: 'group_disparity',
          data: {
            kind: 'group_disparity',
            groupColumn: gCol.key,
            metricColumn: mCol.key,
            aggregation: 'mean',
            topGroup: top.key,
            topValue: top.mean,
            bottomGroup: bottom.key,
            bottomValue: bottom.mean,
            ratio,
          },
          columns: [gCol.key, mCol.key],
          columnLabels: labels,
          recordRefs: [...top.refs, ...bottom.refs].slice(0, 500),
        }))
      }
    }
    return out
  },
}
