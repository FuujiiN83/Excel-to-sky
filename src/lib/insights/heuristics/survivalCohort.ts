// src/lib/insights/heuristics/survivalCohort.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N_PER_GROUP = 10
const MIN_GROUPS = 2
const MAX_GROUPS = 5

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/
function parseDate(raw: unknown): number | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const s = String(raw).trim()
  if (!s) return null
  let m = DATE_DMY.exec(s)
  if (m) {
    const [, d, mo, y] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  m = DATE_ISO.exec(s)
  if (m) {
    const [, y, mo, d] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function median(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

/**
 * Simplified cohort / survival heuristic (#100). When a dataset has a date
 * column + a categorical "cohort" column we compute the *days since the
 * first observation* for every row, group by cohort, and report the median
 * time-to-event per cohort when the medians diverge by ≥ 50% across cohorts.
 * Not Kaplan-Meier — that needs an explicit event column we don't have yet —
 * but enough signal to suggest a proper survival model is worth building.
 */
export const survivalCohort: Heuristic = {
  type: 'survival_cohort',
  applies: (dataset) => {
    const hasDate = dataset.columns.some((c) => c.type === 'date')
    const hasCat = dataset.columns.some((c) => c.type === 'category' || c.type === 'boolean')
    return hasDate && hasCat
  },
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const dateCols = dataset.columns.filter((c) => c.type === 'date')
    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean')
    const out: Finding[] = []
    for (const dateCol of dateCols) {
      const allTimes: number[] = []
      for (const row of dataset.rows) {
        const t = parseDate(row[dateCol.key])
        if (t !== null) allTimes.push(t)
      }
      if (allTimes.length < MIN_N_PER_GROUP * MIN_GROUPS) continue
      const start = Math.min(...allTimes)
      const day = 1000 * 60 * 60 * 24
      for (const catCol of catCols) {
        const buckets = new Map<string, number[]>()
        for (const row of dataset.rows) {
          const t = parseDate(row[dateCol.key])
          if (t === null) continue
          const g = row[catCol.key]
          if (g == null || g === '') continue
          const key = String(g)
          const list = buckets.get(key) ?? []
          list.push((t - start) / day)
          buckets.set(key, list)
        }
        const cohorts = Array.from(buckets.entries())
          .filter(([, vs]) => vs.length >= MIN_N_PER_GROUP)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, MAX_GROUPS)
          .map(([key, vs]) => ({ group: key, median: median(vs), n: vs.length }))
        if (cohorts.length < MIN_GROUPS) continue
        const medians = cohorts.map((c) => c.median)
        const high = Math.max(...medians)
        const low = Math.min(...medians)
        if (low === 0 || high / low < 1.5) continue
        out.push(
          makeFinding({
            type: 'survival_cohort',
            data: {
              kind: 'survival_cohort',
              timeColumn: dateCol.key,
              groupColumn: catCol.key,
              cohorts,
            },
            columns: [dateCol.key, catCol.key],
            columnLabels: labels,
          }),
        )
      }
    }
    return out
  },
}
