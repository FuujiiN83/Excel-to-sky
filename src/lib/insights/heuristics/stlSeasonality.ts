// src/lib/insights/heuristics/stlSeasonality.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 30
const CANDIDATE_PERIODS = [4, 7, 12, 24, 30, 52] as const
const STRENGTH_THRESHOLD = 0.35

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
 * Compute seasonal strength using a simplified STL-ish decomposition: subtract
 * a moving-average trend, then quantify how much variance the per-period
 * means explain vs. the residual. Returns null when the series can't fit at
 * least two full cycles of the candidate period.
 */
function seasonalStrength(series: ReadonlyArray<number>, period: number): number | null {
  const n = series.length
  if (n < period * 2) return null
  const half = Math.floor(period / 2)
  const trend = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += series[j]
      count++
    }
    trend[i] = sum / count
  }
  const detrended = series.map((v, i) => v - trend[i])
  // Seasonal component = average per-cycle position.
  const cycleSums = new Array<number>(period).fill(0)
  const cycleCounts = new Array<number>(period).fill(0)
  for (let i = 0; i < n; i++) {
    cycleSums[i % period] += detrended[i]
    cycleCounts[i % period]++
  }
  const seasonal = cycleSums.map((s, i) => (cycleCounts[i] === 0 ? 0 : s / cycleCounts[i]))
  // Centre the seasonal component so it sums to ~0.
  const sMean = seasonal.reduce((s, v) => s + v, 0) / period
  for (let i = 0; i < period; i++) seasonal[i] -= sMean
  const residuals: number[] = []
  for (let i = 0; i < n; i++) residuals.push(detrended[i] - seasonal[i % period])
  const variance = (arr: number[]): number => {
    const m = arr.reduce((s, v) => s + v, 0) / arr.length
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length
  }
  const varSeasonal = variance(seasonal)
  const varResidual = variance(residuals)
  if (varSeasonal + varResidual === 0) return 0
  return Math.max(0, 1 - varResidual / (varSeasonal + varResidual))
}

/**
 * STL-style seasonality detector (#103). For every (date, numeric) pair we
 * try a handful of candidate periods (4, 7, 12, 24, 30, 52 — roughly weekly,
 * monthly, quarterly, yearly cadences in calendar units). The strongest
 * candidate above 0.35 gets surfaced.
 */
export const stlSeasonality: Heuristic = {
  type: 'stl_seasonality',
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
        let best: { period: number; strength: number } | null = null
        for (const period of CANDIDATE_PERIODS) {
          const strength = seasonalStrength(series, period)
          if (strength === null) continue
          if (!best || strength > best.strength) best = { period, strength }
        }
        if (!best || best.strength < STRENGTH_THRESHOLD) continue
        out.push(
          makeFinding({
            type: 'stl_seasonality',
            data: {
              kind: 'stl_seasonality',
              timeColumn: dateCol.key,
              metricColumn: numCol.key,
              period: best.period,
              strength: best.strength,
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
