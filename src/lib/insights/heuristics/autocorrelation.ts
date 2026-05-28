// src/lib/insights/heuristics/autocorrelation.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 30
const R_THRESHOLD = 0.5
const LAG = 1

function toNum(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number(
    String(raw)
      .trim()
      .replace(/[€$£¥\s]/g, '')
      .replace(/(?<=\d)\.(?=\d{3})/g, '')
      .replace(',', '.'),
  )
  return Number.isFinite(n) ? n : null
}

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

/**
 * Lag-1 autocorrelation detector (#102). For each (date, numeric) pair we
 * sort by time then compute Pearson r between the series and its lag-1
 * shifted copy. |r| ≥ 0.5 indicates real memory/inertia — common on revenue,
 * temperature, traffic. Helps the narrative layer pick the right granularity
 * for downstream analyses.
 */
export const autocorrelation: Heuristic = {
  type: 'autocorrelation',
  applies: (dataset) => {
    const hasDate = dataset.columns.some((c) => c.type === 'date')
    const hasNum = dataset.columns.some((c) => c.type === 'number' || c.type === 'currency')
    return hasDate && hasNum
  },
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const dateCols = dataset.columns.filter((c) => c.type === 'date')
    const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (const dateCol of dateCols) {
      for (const numCol of numCols) {
        const pairs: { t: number; v: number }[] = []
        for (const row of dataset.rows) {
          const t = parseDate(row[dateCol.key])
          if (t === null) continue
          const v = toNum(row[numCol.key])
          if (v === null) continue
          pairs.push({ t, v })
        }
        if (pairs.length < MIN_N + LAG) continue
        pairs.sort((a, b) => a.t - b.t)
        const xs = pairs.slice(0, pairs.length - LAG).map((p) => p.v)
        const ys = pairs.slice(LAG).map((p) => p.v)
        const r = pearsonOnArrays(xs, ys)
        if (Math.abs(r) < R_THRESHOLD) continue

        out.push(
          makeFinding({
            type: 'autocorrelation',
            data: {
              kind: 'autocorrelation',
              timeColumn: dateCol.key,
              metricColumn: numCol.key,
              lag: LAG,
              r,
              n: pairs.length,
            },
            columns: [dateCol.key, numCol.key],
            columnLabels: labels,
          }),
        )
      }
    }
    return out
  },
}

function pearsonOnArrays(xs: ReadonlyArray<number>, ys: ReadonlyArray<number>): number {
  const n = xs.length
  if (n === 0) return 0
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return 0
  return num / Math.sqrt(dx * dy)
}
