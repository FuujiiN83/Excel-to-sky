// src/lib/insights/heuristics/numericCorrelation.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 20
const R_THRESHOLD = 0.7
const SAMPLE_CAP = 500

export const numericCorrelation: Heuristic = {
  type: 'numeric_correlation',
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

        const r = pearson(pairs)
        if (Math.abs(r) < R_THRESHOLD) continue

        const sample = pairs.length <= SAMPLE_CAP ? pairs : evenlySample(pairs, SAMPLE_CAP)
        out.push(makeFinding({
          type: 'numeric_correlation',
          data: { kind: 'numeric_correlation', columnA: a.key, columnB: b.key, r, n: pairs.length, sample },
          columns: [a.key, b.key],
          columnLabels: labels,
        }))
      }
    }
    return out
  },
}

function toNum(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).trim().replace(/[€$£¥\s]/g, '').replace(/(?<=\d)\.(?=\d{3})/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function pearson(pairs: { a: number; b: number }[]): number {
  const n = pairs.length
  let sumA = 0, sumB = 0
  for (const p of pairs) { sumA += p.a; sumB += p.b }
  const meanA = sumA / n
  const meanB = sumB / n
  let num = 0, dA = 0, dB = 0
  for (const p of pairs) {
    const da = p.a - meanA
    const db = p.b - meanB
    num += da * db
    dA += da * da
    dB += db * db
  }
  const denom = Math.sqrt(dA * dB)
  return denom === 0 ? 0 : num / denom
}

function evenlySample<T>(arr: T[], cap: number): T[] {
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}
