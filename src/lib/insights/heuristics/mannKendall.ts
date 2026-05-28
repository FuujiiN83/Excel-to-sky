// src/lib/insights/heuristics/mannKendall.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 12
const TAU_THRESHOLD = 0.25
const SAMPLE_CAP = 400

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

interface TimedValue {
  t: number
  v: number
}

function evenlySample<T>(arr: ReadonlyArray<T>, cap: number): T[] {
  if (arr.length <= cap) return arr.slice()
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

/**
 * Mann-Kendall trend test (#86). For each (date column, numeric column) pair
 * we sort by time, then count concordant vs. discordant value pairs. The
 * S statistic ignores magnitudes and only cares about sign, which makes it
 * robust to outliers and skew. We report Kendall's τ-b alongside S so the
 * effect size has a familiar [-1, 1] range. O(n²) — sample-capped.
 */
export const mannKendall: Heuristic = {
  type: 'mann_kendall_trend',
  applies: (dataset) => {
    const hasDate = dataset.columns.some((c) => c.type === 'date')
    const hasNum = dataset.columns.some((c) => c.type === 'number' || c.type === 'currency')
    return hasDate && hasNum
  },
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const dateCols = dataset.columns.filter((c) => c.type === 'date')
    const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (const dateCol of dateCols) {
      const timestamps = ctx.dateValues.get(dateCol.key) ?? []
      if (timestamps.length < MIN_N) continue

      for (const numCol of numCols) {
        // Re-collect pairs with row alignment so a row missing one side is
        // skipped from both. ctx.dateValues and ctx.numericValues are de-aligned
        // (each filters its own nulls) so we can't reuse them directly.
        const pairs: TimedValue[] = []
        for (const row of dataset.rows) {
          const raw = row[dateCol.key]
          const dt = parseDate(raw)
          if (dt === null) continue
          const v = toNum(row[numCol.key])
          if (v === null) continue
          pairs.push({ t: dt, v })
        }
        if (pairs.length < MIN_N) continue

        pairs.sort((a, b) => a.t - b.t)
        const sampled = evenlySample(pairs, SAMPLE_CAP)

        let s = 0
        let concordant = 0
        let discordant = 0
        for (let i = 0; i < sampled.length; i++) {
          for (let j = i + 1; j < sampled.length; j++) {
            const d = sampled[j].v - sampled[i].v
            if (d > 0) {
              s++
              concordant++
            } else if (d < 0) {
              s--
              discordant++
            }
          }
        }
        const total = concordant + discordant
        if (total === 0) continue
        const tau = (concordant - discordant) / total
        if (Math.abs(tau) < TAU_THRESHOLD) continue

        out.push(
          makeFinding({
            type: 'mann_kendall_trend',
            data: {
              kind: 'mann_kendall_trend',
              timeColumn: dateCol.key,
              metricColumn: numCol.key,
              s,
              tau,
              direction: tau > 0.1 ? 'rising' : tau < -0.1 ? 'falling' : 'flat',
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
