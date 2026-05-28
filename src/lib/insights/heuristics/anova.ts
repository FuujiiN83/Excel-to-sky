// src/lib/insights/heuristics/anova.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUPS = 3
const MIN_GROUP_N = 8
const ETA_THRESHOLD = 0.1

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
 * Approximate p-value for an F distribution using the incomplete-beta
 * regularised form. Stirling-style series — accurate enough to display three
 * decimal places, which matches the reporting precision we use elsewhere.
 */
function fPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1
  // p = 1 - I(d1*F / (d1*F + d2); d1/2, d2/2)
  const x = (d1 * f) / (d1 * f + d2)
  return 1 - incBeta(x, d1 / 2, d2 / 2)
}

function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCf(x, a, b)) / a
  }
  return 1 - (bt * betaCf(1 - x, b, a)) / b
}

function betaCf(x: number, a: number, b: number): number {
  const ITMAX = 100
  const EPS = 3e-7
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  let h = d
  for (let m = 1; m <= ITMAX; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/**
 * One-way ANOVA F-test (#84) across the levels of a categorical column for a
 * numeric column. Reports F, η² (variance explained ratio) and a p-value.
 * Stronger than the existing group_disparity ratio because it considers
 * within-group variance: a 2× mean gap doesn't matter if the spreads overlap.
 */
export const anova: Heuristic = {
  type: 'anova',
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
        const groups = new Map<string, number[]>()
        for (const row of dataset.rows) {
          const g = row[cat.key]
          if (g == null || g === '') continue
          const v = toNum(row[num.key])
          if (v === null) continue
          const key = String(g)
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(v)
        }
        const valid = Array.from(groups.entries()).filter(([, vs]) => vs.length >= MIN_GROUP_N)
        if (valid.length < MIN_GROUPS) continue

        const allValues: number[] = []
        const means: number[] = []
        const sizes: number[] = []
        for (const [, vs] of valid) {
          let sum = 0
          for (const v of vs) sum += v
          means.push(sum / vs.length)
          sizes.push(vs.length)
          allValues.push(...vs)
        }
        const grandMean = allValues.reduce((s, v) => s + v, 0) / allValues.length
        let ssBetween = 0
        for (let i = 0; i < means.length; i++) {
          ssBetween += sizes[i] * (means[i] - grandMean) ** 2
        }
        let ssWithin = 0
        let cursor = 0
        for (const [, vs] of valid) {
          for (const v of vs) ssWithin += (v - means[cursor]) ** 2
          cursor++
        }
        const ssTotal = ssBetween + ssWithin
        if (ssTotal === 0) continue
        const dfBetween = valid.length - 1
        const dfWithin = allValues.length - valid.length
        if (dfBetween === 0 || dfWithin === 0 || ssWithin === 0) continue
        const msBetween = ssBetween / dfBetween
        const msWithin = ssWithin / dfWithin
        const f = msBetween / msWithin
        const etaSquared = ssBetween / ssTotal
        if (etaSquared < ETA_THRESHOLD) continue
        const p = fPValue(f, dfBetween, dfWithin)
        if (p > 0.05) continue

        out.push(
          makeFinding({
            type: 'anova',
            data: {
              kind: 'anova',
              groupColumn: cat.key,
              metricColumn: num.key,
              f,
              dfBetween,
              dfWithin,
              groups: valid.length,
              pValue: p,
              etaSquared,
            },
            columns: [cat.key, num.key],
            columnLabels: labels,
          }),
        )
      }
    }
    return out
  },
}
