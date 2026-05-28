// src/lib/insights/heuristics/pettittChangepoint.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 20
const SAMPLE_CAP = 300

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

function evenlySample<T>(arr: ReadonlyArray<T>, cap: number): T[] {
  if (arr.length <= cap) return arr.slice()
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

/**
 * Pettitt non-parametric single-changepoint test (#87). For each ordered
 * (date, numeric) series we walk every possible split point, compute the
 * Mann-Whitney U-like statistic, and take the maximum. The p-value uses the
 * common asymptotic approximation 2·exp(-6·K² / (n³ + n²)).
 *
 * Outputs the most likely changepoint index plus the means before/after so
 * the user can immediately segment their analysis around it.
 */
export const pettittChangepoint: Heuristic = {
  type: 'pettitt_changepoint',
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
        const sampled = evenlySample(pairs, SAMPLE_CAP)
        const n = sampled.length

        // U_i = Σ_{j≤i} Σ_{k>i} sign(x_k − x_j). Compute iteratively in O(n²).
        let maxAbsK = 0
        let bestIdx = 0
        let runningU = 0
        const fullSignSum = new Array<number>(n)
        // Pre-compute the sign matrix lazily via incremental updates: as i
        // grows, the contribution of comparing point i to all already-seen
        // points flips into the "before" set.
        for (let i = 0; i < n; i++) {
          let row = 0
          for (let j = 0; j < n; j++) {
            if (j === i) continue
            row += Math.sign(sampled[j].v - sampled[i].v)
          }
          fullSignSum[i] = row
        }
        for (let i = 0; i < n - 1; i++) {
          runningU += fullSignSum[i]
          const k = Math.abs(runningU)
          if (k > maxAbsK) {
            maxAbsK = k
            bestIdx = i
          }
        }
        if (maxAbsK === 0) continue
        // Asymptotic p-value approximation for Pettitt (Pettitt 1979).
        const denom = Math.pow(n, 3) + Math.pow(n, 2)
        const p = denom === 0 ? 1 : 2 * Math.exp((-6 * maxAbsK * maxAbsK) / denom)
        if (p > 0.05) continue

        let sumBefore = 0
        for (let i = 0; i <= bestIdx; i++) sumBefore += sampled[i].v
        const meanBefore = sumBefore / (bestIdx + 1)
        let sumAfter = 0
        for (let i = bestIdx + 1; i < n; i++) sumAfter += sampled[i].v
        const meanAfter = sumAfter / (n - bestIdx - 1)
        if (Math.abs(meanAfter - meanBefore) < 1e-6) continue

        out.push(
          makeFinding({
            type: 'pettitt_changepoint',
            data: {
              kind: 'pettitt_changepoint',
              timeColumn: dateCol.key,
              metricColumn: numCol.key,
              index: bestIdx,
              timestamp: sampled[bestIdx].t,
              ks: maxAbsK,
              pValue: p,
              meanBefore,
              meanAfter,
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
