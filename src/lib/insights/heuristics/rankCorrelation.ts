// src/lib/insights/heuristics/rankCorrelation.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 20
const SPEARMAN_THRESHOLD = 0.6
const KENDALL_THRESHOLD = 0.45
/**
 * Kendall's τ is O(n²); cap the sample so very wide datasets don't stall the
 * worker. Spearman is fine on the full series since it boils down to sorting
 * and a Pearson on the ranks.
 */
const KENDALL_SAMPLE_CAP = 500

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
 * Average ranks with ties broken via the mean rank (the "fractional" ranking
 * used by Spearman). Returns ranks in the same order as the input array.
 */
function fractionalRanks(values: ReadonlyArray<number>): number[] {
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(values.length)
  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg
    i = j + 1
  }
  return ranks
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

function spearman(pairs: ReadonlyArray<{ a: number; b: number }>): number {
  const ranksA = fractionalRanks(pairs.map((p) => p.a))
  const ranksB = fractionalRanks(pairs.map((p) => p.b))
  return pearsonOnArrays(ranksA, ranksB)
}

function kendallTau(pairs: ReadonlyArray<{ a: number; b: number }>): number {
  const n = pairs.length
  if (n < 2) return 0
  let concordant = 0
  let discordant = 0
  let tiesA = 0
  let tiesB = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pairs[i].a - pairs[j].a
      const dy = pairs[i].b - pairs[j].b
      if (dx === 0 && dy === 0) continue
      if (dx === 0) tiesA++
      else if (dy === 0) tiesB++
      else if (Math.sign(dx) === Math.sign(dy)) concordant++
      else discordant++
    }
  }
  const total = concordant + discordant + tiesA + tiesB
  if (total === 0) return 0
  // Tau-b handles ties correctly when comparing to mixed-precision numeric.
  const denomA = Math.sqrt(concordant + discordant + tiesA)
  const denomB = Math.sqrt(concordant + discordant + tiesB)
  if (denomA === 0 || denomB === 0) return 0
  return (concordant - discordant) / (denomA * denomB)
}

function evenlySample<T>(arr: ReadonlyArray<T>, cap: number): T[] {
  if (arr.length <= cap) return arr.slice()
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

/**
 * Spearman ρ + Kendall τ-b correlation across every numeric column pair (#81,
 * #82). Each direction emits at most one finding per pair, picked by whichever
 * coefficient is stronger relative to its threshold. Captures monotonic
 * relationships that Pearson misses on curved data.
 */
export const rankCorrelation: Heuristic = {
  type: 'rank_correlation',
  applies: (dataset) =>
    dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency').length >= 2,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const numericCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const a = numericCols[i]
        const b = numericCols[j]
        const pairs: { a: number; b: number }[] = []
        for (const row of dataset.rows) {
          const va = toNum(row[a.key])
          const vb = toNum(row[b.key])
          if (va !== null && vb !== null) pairs.push({ a: va, b: vb })
        }
        if (pairs.length < MIN_N) continue

        const rho = spearman(pairs)
        const tauPairs = evenlySample(pairs, KENDALL_SAMPLE_CAP)
        const tau = kendallTau(tauPairs)

        const spearmanMargin = Math.abs(rho) - SPEARMAN_THRESHOLD
        const kendallMargin = Math.abs(tau) - KENDALL_THRESHOLD
        if (spearmanMargin < 0 && kendallMargin < 0) continue
        const useSpearman = spearmanMargin >= kendallMargin

        out.push(
          makeFinding({
            type: 'rank_correlation',
            data: {
              kind: 'rank_correlation',
              columnA: a.key,
              columnB: b.key,
              method: useSpearman ? 'spearman' : 'kendall',
              coefficient: useSpearman ? rho : tau,
              n: pairs.length,
            },
            columns: [a.key, b.key],
            columnLabels: labels,
          }),
        )
      }
    }
    return out
  },
}
