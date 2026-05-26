// src/lib/insights/heuristics/timeByGroup.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_PERIODS = 4
const MIN_GROUPS = 2
const MAX_GROUPS = 8
const DELTA_THRESHOLD = 0.25

export const timeByGroup: Heuristic = {
  type: 'time_by_group',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'date') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean') &&
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const dateCol = dataset.columns.find((c) => c.type === 'date')
    if (!dateCol) return out
    const timestamps = ctx.dateValues.get(dateCol.key)
    if (!timestamps || timestamps.length < MIN_PERIODS) return out

    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )
    const metricCols = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency'
    )

    for (const gCol of groupCols) {
      const counts = ctx.valueCounts.get(gCol.key)
      if (!counts || counts.size < MIN_GROUPS || counts.size > MAX_GROUPS) continue

      for (const mCol of metricCols) {
        // group by (group, monthBucket) → mean
        const buckets = new Map<string, Map<number, { total: number; count: number }>>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          const t = ctx.dateValues.get(dateCol.key)?.[i]
          if (g == null || g === '' || m == null || m === '' || t == null) continue
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const gk = String(g)
          const d = new Date(t)
          const monthBucket = d.getUTCFullYear() * 12 + d.getUTCMonth()
          if (!buckets.has(gk)) buckets.set(gk, new Map())
          const inner = buckets.get(gk)!
          const cur = inner.get(monthBucket) ?? { total: 0, count: 0 }
          cur.total += mn
          cur.count++
          inner.set(monthBucket, cur)
        }
        if (buckets.size < MIN_GROUPS) continue

        const series: { group: string; trend: 'rising' | 'falling' | 'flat'; deltaPct: number }[] = []
        for (const [gk, inner] of buckets) {
          if (inner.size < MIN_PERIODS) continue
          const points = Array.from(inner.entries()).sort((a, b) => a[0] - b[0])
          const first = points[0][1].total / points[0][1].count
          const last = points[points.length - 1][1].total / points[points.length - 1][1].count
          const deltaPct = first === 0 ? 0 : (last - first) / Math.abs(first)
          let trend: 'rising' | 'falling' | 'flat' = 'flat'
          if (deltaPct >= DELTA_THRESHOLD) trend = 'rising'
          else if (deltaPct <= -DELTA_THRESHOLD) trend = 'falling'
          series.push({ group: gk, trend, deltaPct })
        }
        if (series.length < MIN_GROUPS) continue

        // Surface only if at least one group diverges from the others
        const trends = new Set(series.map((s) => s.trend))
        if (trends.size < 2 && !series.some((s) => Math.abs(s.deltaPct) >= DELTA_THRESHOLD)) continue

        out.push(makeFinding({
          type: 'time_by_group',
          data: {
            kind: 'time_by_group',
            timeColumn: dateCol.key,
            groupColumn: gCol.key,
            metricColumn: mCol.key,
            series,
          },
          columns: [dateCol.key, gCol.key, mCol.key],
          columnLabels: labels,
        }))
      }
    }
    return out
  },
}
