// src/lib/insights/heuristics/ksTwoSample.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUP_N = 15
const D_THRESHOLD = 0.3
const MAX_PAIRS = 3

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

/**
 * Two-sample Kolmogorov-Smirnov D statistic on two sorted samples. Returns
 * the largest absolute gap between the empirical CDFs.
 */
function ksStatistic(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  let i = 0
  let j = 0
  let d = 0
  while (i < a.length && j < b.length) {
    const x = Math.min(a[i], b[j])
    while (i < a.length && a[i] <= x) i++
    while (j < b.length && b[j] <= x) j++
    const gap = Math.abs(i / a.length - j / b.length)
    if (gap > d) d = gap
  }
  return d
}

/**
 * Asymptotic two-sample KS p-value via the Kolmogorov distribution series.
 * Reasonable for n,m ≥ 15 which we enforce in MIN_GROUP_N.
 */
function ksPValue(d: number, nA: number, nB: number): number {
  const ne = (nA * nB) / (nA + nB)
  const lam = (Math.sqrt(ne) + 0.12 + 0.11 / Math.sqrt(ne)) * d
  let sum = 0
  for (let k = 1; k <= 100; k++) {
    const term = 2 * (-1) ** (k - 1) * Math.exp(-2 * k * k * lam * lam)
    sum += term
    if (Math.abs(term) < 1e-8) break
  }
  return Math.min(1, Math.max(0, sum))
}

/**
 * Two-sample KS test (#85). For every (categorical, numeric) bucket we pull
 * the two heaviest groups and compare their full distributions — not just
 * the means. Catches differences in spread, shape and bimodality that
 * effect_size and group_disparity miss.
 */
export const ksTwoSample: Heuristic = {
  type: 'ks_two_sample',
  applies: (dataset) => {
    const hasCat = dataset.columns.some((c) => c.type === 'category' || c.type === 'boolean')
    const hasNum = dataset.columns.some((c) => c.type === 'number' || c.type === 'currency')
    return hasCat && hasNum
  },
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean')
    const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (const cat of catCols) {
      for (const num of numCols) {
        const byGroup = new Map<string, number[]>()
        for (const row of dataset.rows) {
          const g = row[cat.key]
          if (g == null || g === '') continue
          const v = toNum(row[num.key])
          if (v === null) continue
          const key = String(g)
          if (!byGroup.has(key)) byGroup.set(key, [])
          byGroup.get(key)!.push(v)
        }
        const groups = Array.from(byGroup.entries())
          .filter(([, vs]) => vs.length >= MIN_GROUP_N)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 4)
          .map(([k, vs]) => ({ key: k, sorted: vs.slice().sort((x, y) => x - y) }))
        if (groups.length < 2) continue

        const findings: Array<{
          a: (typeof groups)[number]
          b: (typeof groups)[number]
          d: number
          pValue: number
        }> = []
        for (let i = 0; i < groups.length; i++) {
          for (let j = i + 1; j < groups.length; j++) {
            const d = ksStatistic(groups[i].sorted, groups[j].sorted)
            if (d < D_THRESHOLD) continue
            const p = ksPValue(d, groups[i].sorted.length, groups[j].sorted.length)
            findings.push({ a: groups[i], b: groups[j], d, pValue: p })
          }
        }
        findings.sort((x, y) => y.d - x.d)
        for (const { a, b, d, pValue } of findings.slice(0, MAX_PAIRS)) {
          out.push(
            makeFinding({
              type: 'ks_two_sample',
              data: {
                kind: 'ks_two_sample',
                groupColumn: cat.key,
                metricColumn: num.key,
                groupA: a.key,
                groupB: b.key,
                d,
                nA: a.sorted.length,
                nB: b.sorted.length,
                pValue,
              },
              columns: [cat.key, num.key],
              columnLabels: labels,
            }),
          )
        }
      }
    }
    return out
  },
}
