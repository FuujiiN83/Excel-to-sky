// src/lib/insights/heuristics/pcaDominant.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_COLS = 3
const MIN_N = 30
const MAX_COLS = 8
const PC1_THRESHOLD = 0.7

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

function standardise(points: number[][]): number[][] {
  const dims = points[0]?.length ?? 0
  const means = new Array<number>(dims).fill(0)
  for (const p of points) for (let d = 0; d < dims; d++) means[d] += p[d]
  for (let d = 0; d < dims; d++) means[d] /= points.length
  const stds = new Array<number>(dims).fill(0)
  for (const p of points) for (let d = 0; d < dims; d++) stds[d] += (p[d] - means[d]) ** 2
  for (let d = 0; d < dims; d++) stds[d] = Math.sqrt(stds[d] / points.length) || 1
  return points.map((p) => p.map((v, d) => (v - means[d]) / stds[d]))
}

/** Pairwise covariance matrix of an N×d sample. */
function covariance(points: number[][]): number[][] {
  const n = points.length
  const d = points[0].length
  const cov: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0))
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let s = 0
      for (const p of points) s += p[i] * p[j]
      const c = s / Math.max(1, n - 1)
      cov[i][j] = c
      cov[j][i] = c
    }
  }
  return cov
}

/**
 * Power-iteration estimate of the top-k eigenpairs of a symmetric matrix.
 * Deflate by subtracting the rank-1 projection after each iteration. Fast
 * and small — adequate for up to 8 dimensions, which we already cap at.
 */
function topEigenpairs(
  matrix: number[][],
  k: number,
  iterations = 60,
): { value: number; vector: number[] }[] {
  const d = matrix.length
  const m = matrix.map((row) => row.slice())
  const out: { value: number; vector: number[] }[] = []
  for (let comp = 0; comp < k; comp++) {
    let v = new Array<number>(d).fill(0)
    v[comp % d] = 1
    let lambda = 0
    for (let it = 0; it < iterations; it++) {
      const mv = multiply(m, v)
      const norm = Math.sqrt(mv.reduce((s, x) => s + x * x, 0)) || 1
      v = mv.map((x) => x / norm)
      lambda = mv.reduce((s, x, i) => s + x * v[i], 0) / norm
    }
    out.push({ value: lambda, vector: v })
    // Deflate: M -= lambda · v vᵀ
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) m[i][j] -= lambda * v[i] * v[j]
  }
  return out
}

function multiply(m: number[][], v: number[]): number[] {
  const d = m.length
  const out = new Array<number>(d).fill(0)
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) out[i] += m[i][j] * v[j]
  return out
}

/**
 * PCA dominance heuristic (#91). When ≥ 3 numeric columns exist we compute
 * PC1 and PC2 explained-variance ratio. Anything above 70% for PC1 (or 90%
 * for PC1+PC2 together) signals that the dataset effectively lives on a
 * low-dimensional subspace — worth surfacing because it tells the user a lot
 * of their numeric columns are basically the same signal.
 */
export const pcaDominant: Heuristic = {
  type: 'pca_dominant',
  applies: (dataset) =>
    dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency').length >= MIN_COLS,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const numCols = dataset.columns
      .filter((c) => c.type === 'number' || c.type === 'currency')
      .slice(0, MAX_COLS)
    if (numCols.length < MIN_COLS) return []

    const points: number[][] = []
    for (const row of dataset.rows) {
      const vals: number[] = []
      let ok = true
      for (const col of numCols) {
        const v = toNum(row[col.key])
        if (v === null) {
          ok = false
          break
        }
        vals.push(v)
      }
      if (ok) points.push(vals)
    }
    if (points.length < MIN_N) return []

    const std = standardise(points)
    const cov = covariance(std)
    const eigen = topEigenpairs(cov, 2)
    const totalVariance = numCols.length // each standardised column has variance 1
    const explained = eigen.map((e) => Math.max(0, e.value) / totalVariance)
    if (explained[0] < PC1_THRESHOLD && explained[0] + explained[1] < 0.9) return []

    const top = eigen[0].vector.map((v, i) => ({
      column: numCols[i].key,
      loading: v,
    }))
    return [
      makeFinding({
        type: 'pca_dominant',
        data: {
          kind: 'pca_dominant',
          columns: numCols.map((c) => c.key),
          explainedVariance: explained,
          cumulative: explained[0] + explained[1],
          n: points.length,
          topComponentLoadings: top,
        },
        columns: numCols.map((c) => c.key),
        columnLabels: labels,
      }),
    ]
  },
}
