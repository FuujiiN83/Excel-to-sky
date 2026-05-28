// src/lib/insights/heuristics/kmeansCluster.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 30
const MAX_DIMS = 4
const SILHOUETTE_THRESHOLD = 0.5
const K_VALUES = [2, 3, 4] as const
const MAX_ITER = 25
const SAMPLE_CAP = 600

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

/**
 * Standardise each column to mean 0 / stddev 1 so k-means doesn't get
 * dominated by the column with the largest magnitude.
 */
function standardise(points: number[][]): number[][] {
  const dims = points[0]?.length ?? 0
  if (dims === 0) return points
  const means = new Array<number>(dims).fill(0)
  for (const p of points) for (let d = 0; d < dims; d++) means[d] += p[d]
  for (let d = 0; d < dims; d++) means[d] /= points.length
  const stds = new Array<number>(dims).fill(0)
  for (const p of points) for (let d = 0; d < dims; d++) stds[d] += (p[d] - means[d]) ** 2
  for (let d = 0; d < dims; d++) stds[d] = Math.sqrt(stds[d] / points.length) || 1
  return points.map((p) => p.map((v, d) => (v - means[d]) / stds[d]))
}

function dist2(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return s
}

interface ClusterFit {
  k: number
  centroids: number[][]
  assignments: number[]
  silhouette: number
  sizes: number[]
}

/**
 * k-means++ initial centroids — probability of picking a point as the next
 * centroid is proportional to its squared distance from the nearest existing
 * centroid. Way better starting condition than purely random.
 */
function kmeansPlusPlus(points: number[][], k: number, rng: () => number): number[][] {
  const first = Math.floor(rng() * points.length)
  const centroids: number[][] = [points[first].slice()]
  while (centroids.length < k) {
    const dists = points.map((p) => Math.min(...centroids.map((c) => dist2(p, c))))
    const total = dists.reduce((s, v) => s + v, 0)
    if (total === 0) break
    let r = rng() * total
    let pick = 0
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i]
      if (r <= 0) {
        pick = i
        break
      }
    }
    centroids.push(points[pick].slice())
  }
  return centroids
}

function runKMeans(points: number[][], k: number, rng: () => number): ClusterFit | null {
  if (points.length < k) return null
  let centroids = kmeansPlusPlus(points, k, rng)
  const assignments = new Array<number>(points.length).fill(0)
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false
    for (let i = 0; i < points.length; i++) {
      let bestK = 0
      let bestD = Number.POSITIVE_INFINITY
      for (let c = 0; c < centroids.length; c++) {
        const d = dist2(points[i], centroids[c])
        if (d < bestD) {
          bestD = d
          bestK = c
        }
      }
      if (assignments[i] !== bestK) {
        assignments[i] = bestK
        changed = true
      }
    }
    if (!changed) break
    const sums: number[][] = centroids.map(() => new Array<number>(points[0].length).fill(0))
    const counts = new Array<number>(centroids.length).fill(0)
    for (let i = 0; i < points.length; i++) {
      const a = assignments[i]
      counts[a]++
      for (let d = 0; d < points[i].length; d++) sums[a][d] += points[i][d]
    }
    centroids = sums.map((s, c) => (counts[c] === 0 ? centroids[c] : s.map((v) => v / counts[c])))
  }
  const sizes = new Array<number>(centroids.length).fill(0)
  for (const a of assignments) sizes[a]++
  // Bail if any cluster collapsed to ≤ 2% of the sample.
  if (sizes.some((s) => s < Math.max(2, points.length * 0.02))) return null
  const silhouette = averageSilhouette(points, assignments, k)
  return { k, centroids, assignments, silhouette, sizes }
}

/** Average silhouette coefficient (Rousseeuw 1987) on the full sample. */
function averageSilhouette(points: number[][], assignments: number[], k: number): number {
  if (k < 2) return 0
  let total = 0
  let counted = 0
  for (let i = 0; i < points.length; i++) {
    const own = assignments[i]
    let a = 0
    let aN = 0
    let bMin = Number.POSITIVE_INFINITY
    for (let c = 0; c < k; c++) {
      let sum = 0
      let n = 0
      for (let j = 0; j < points.length; j++) {
        if (i === j || assignments[j] !== c) continue
        sum += Math.sqrt(dist2(points[i], points[j]))
        n++
      }
      if (n === 0) continue
      if (c === own) {
        a = sum / n
        aN = n
      } else {
        const mean = sum / n
        if (mean < bMin) bMin = mean
      }
    }
    if (aN === 0 || bMin === Number.POSITIVE_INFINITY) continue
    total += (bMin - a) / Math.max(a, bMin)
    counted++
  }
  return counted === 0 ? 0 : total / counted
}

/** Mulberry32 — small deterministic RNG so re-running yields the same fit. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function evenlySample<T>(arr: ReadonlyArray<T>, cap: number): T[] {
  if (arr.length <= cap) return arr.slice()
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

/**
 * K-means clustering heuristic (#90). Tries k = 2 / 3 / 4 on every pair (and
 * triple, when at least 3 numeric columns exist) of standardised numeric
 * columns; reports the fit whose silhouette ≥ 0.5. Sample-capped at 600
 * points because Rousseeuw silhouette is O(n²).
 */
export const kmeansCluster: Heuristic = {
  type: 'kmeans_cluster',
  applies: (dataset) =>
    dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency').length >= 2,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const numCols = dataset.columns
      .filter((c) => c.type === 'number' || c.type === 'currency')
      .slice(0, MAX_DIMS)
    if (numCols.length < 2) return []

    const out: Finding[] = []
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

    const sampled = evenlySample(standardise(points), SAMPLE_CAP)
    const rng = mulberry32(0xc0ffee)
    let best: ClusterFit | null = null
    for (const k of K_VALUES) {
      const fit = runKMeans(sampled, k, rng)
      if (!fit) continue
      if (!best || fit.silhouette > best.silhouette) best = fit
    }
    if (!best || best.silhouette < SILHOUETTE_THRESHOLD) return out

    out.push(
      makeFinding({
        type: 'kmeans_cluster',
        data: {
          kind: 'kmeans_cluster',
          columns: numCols.map((c) => c.key),
          k: best.k,
          silhouette: best.silhouette,
          sizes: best.sizes,
          centroids: best.centroids,
        },
        columns: numCols.map((c) => c.key),
        columnLabels: labels,
      }),
    )
    return out
  },
}
