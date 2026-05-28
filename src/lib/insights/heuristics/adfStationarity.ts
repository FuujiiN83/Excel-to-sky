// src/lib/insights/heuristics/adfStationarity.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 25
const ADF_CRITICAL_5PCT = -2.86

function toNum(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number(
    String(raw)
      .trim()
      .replace(/[€$£¥\s]/g, '')
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
 * OLS regression of Δy_t on y_{t-1}. The augmented Dickey-Fuller t-statistic
 * is the coefficient divided by its standard error; comparing against the
 * 5%-critical value (-2.86) is the standard 95%-significance rule for n ≥ 25.
 */
function adfTStat(series: ReadonlyArray<number>): { t: number; p: number } | null {
  const n = series.length
  if (n < MIN_N) return null
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 1; i < n; i++) {
    xs.push(series[i - 1])
    ys.push(series[i] - series[i - 1])
  }
  const len = xs.length
  let sx = 0
  let sy = 0
  for (let i = 0; i < len; i++) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / len
  const my = sy / len
  let num = 0
  let denom = 0
  for (let i = 0; i < len; i++) {
    const dx = xs[i] - mx
    num += dx * (ys[i] - my)
    denom += dx * dx
  }
  if (denom === 0) return null
  const beta = num / denom
  const alpha = my - beta * mx
  let resSquares = 0
  for (let i = 0; i < len; i++) {
    const pred = alpha + beta * xs[i]
    resSquares += (ys[i] - pred) ** 2
  }
  const sigma2 = resSquares / Math.max(1, len - 2)
  const seBeta = Math.sqrt(sigma2 / denom)
  if (seBeta === 0) return null
  const t = beta / seBeta
  // Rough p-value: 0.01 below -3.43, 0.05 below -2.86, 0.1 below -2.57, else 0.5+.
  const p = t < -3.43 ? 0.01 : t < ADF_CRITICAL_5PCT ? 0.05 : t < -2.57 ? 0.1 : 0.5
  return { t, p }
}

/**
 * ADF stationarity test (#101). Surfaces every (date, numeric) series that
 * is meaningfully *non*-stationary at the 5% level — those are the series
 * that need differencing before downstream modelling. Stationary series are
 * also reported (lower score) so the reader knows the column is well-behaved.
 */
export const adfStationarity: Heuristic = {
  type: 'adf_stationarity',
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
        if (pairs.length < MIN_N) continue
        pairs.sort((a, b) => a.t - b.t)
        const series = pairs.map((p) => p.v)
        const stat = adfTStat(series)
        if (!stat) continue
        const isStationary = stat.t < ADF_CRITICAL_5PCT
        // Only emit the non-stationary direction by default — that's the
        // useful signal. Stationary is too common to surface as a finding.
        if (isStationary) continue
        out.push(
          makeFinding({
            type: 'adf_stationarity',
            data: {
              kind: 'adf_stationarity',
              timeColumn: dateCol.key,
              metricColumn: numCol.key,
              tStatistic: stat.t,
              pValue: stat.p,
              isStationary,
              n: series.length,
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
