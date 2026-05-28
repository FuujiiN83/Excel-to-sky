// src/lib/insights/heuristics/effectSize.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUP_N = 8
const D_THRESHOLD = 0.5 // Cohen's "medium" effect
const MAX_PAIRS_PER_BUCKET = 4

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

function meanVar(values: ReadonlyArray<number>): { mean: number; variance: number } {
  const n = values.length
  if (n === 0) return { mean: 0, variance: 0 }
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / n
  let s2 = 0
  for (const v of values) s2 += (v - mean) ** 2
  return { mean, variance: s2 / Math.max(1, n - 1) }
}

function magnitudeOf(d: number): 'small' | 'medium' | 'large' {
  const abs = Math.abs(d)
  if (abs >= 0.8) return 'large'
  if (abs >= 0.5) return 'medium'
  return 'small'
}

/**
 * Cohen's d standardized effect size (#93). For every (categorical column,
 * numeric column) pair we collect group means and report the strongest
 * positive- and negative-direction effects between the heaviest groups. The
 * pooled-variance denominator handles unequal sample sizes per group.
 */
export const effectSize: Heuristic = {
  type: 'effect_size',
  applies: (dataset) => {
    const hasCat = dataset.columns.some((c) => c.type === 'category' || c.type === 'boolean')
    const hasNum = dataset.columns.some((c) => c.type === 'number' || c.type === 'currency')
    return hasCat && hasNum
  },
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean')
    const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')

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
          .map(([k, vs]) => ({ key: k, stats: meanVar(vs), n: vs.length }))
        if (groups.length < 2) continue

        // Emit at most MAX_PAIRS_PER_BUCKET findings per (cat,num) bucket so a
        // dataset with 20 product categories doesn't drown the report.
        const pairs: Array<{ a: (typeof groups)[number]; b: (typeof groups)[number]; d: number }> =
          []
        for (let i = 0; i < groups.length; i++) {
          for (let j = i + 1; j < groups.length; j++) {
            const a = groups[i]
            const b = groups[j]
            const pooled = Math.sqrt(
              ((a.n - 1) * a.stats.variance + (b.n - 1) * b.stats.variance) /
                Math.max(1, a.n + b.n - 2),
            )
            if (pooled === 0) continue
            const d = (a.stats.mean - b.stats.mean) / pooled
            if (Math.abs(d) < D_THRESHOLD) continue
            pairs.push({ a, b, d })
          }
        }
        pairs.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
        for (const { a, b, d } of pairs.slice(0, MAX_PAIRS_PER_BUCKET)) {
          out.push(
            makeFinding({
              type: 'effect_size',
              data: {
                kind: 'effect_size',
                groupColumn: cat.key,
                metricColumn: num.key,
                groupA: a.key,
                groupB: b.key,
                meanA: a.stats.mean,
                meanB: b.stats.mean,
                d,
                magnitude: magnitudeOf(d),
                nA: a.n,
                nB: b.n,
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
