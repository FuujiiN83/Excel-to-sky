// src/lib/insights/heuristics/simpsonsParadox.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUP_N = 10
const MIN_GROUPS_REVERSED = 2
const SLOPE_THRESHOLD = 0.01

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

interface XY {
  x: number
  y: number
}

function slope(points: ReadonlyArray<XY>): number | null {
  const n = points.length
  if (n < 3) return null
  let sx = 0
  let sy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let den = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    num += dx * dy
    den += dx * dx
  }
  if (den === 0) return null
  return num / den
}

/**
 * Simpson's-paradox detector (#106). For every combination (categorical
 * grouping column, numeric x, numeric y) we fit the OLS slope globally and
 * within each group. The paradox triggers when the global slope has the
 * opposite sign to a meaningful majority of group slopes — a strong,
 * presentation-worthy finding that fundamentally changes what the data says.
 */
export const simpsonsParadox: Heuristic = {
  type: 'simpsons_paradox',
  applies: (dataset) => {
    const hasCat = dataset.columns.some((c) => c.type === 'category' || c.type === 'boolean')
    const numCount = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency',
    ).length
    return hasCat && numCount >= 2
  },
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean')
    const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (const cat of catCols) {
      for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
          const xCol = numCols[i]
          const yCol = numCols[j]
          const all: XY[] = []
          const byGroup = new Map<string, XY[]>()
          for (const row of dataset.rows) {
            const g = row[cat.key]
            if (g == null || g === '') continue
            const x = toNum(row[xCol.key])
            const y = toNum(row[yCol.key])
            if (x === null || y === null) continue
            const key = String(g)
            const point = { x, y }
            all.push(point)
            if (!byGroup.has(key)) byGroup.set(key, [])
            byGroup.get(key)!.push(point)
          }
          if (all.length < 4 * MIN_GROUP_N) continue
          const global = slope(all)
          if (global === null || Math.abs(global) < SLOPE_THRESHOLD) continue
          const groupSlopes: { group: string; slope: number; n: number }[] = []
          for (const [key, pts] of byGroup) {
            if (pts.length < MIN_GROUP_N) continue
            const s = slope(pts)
            if (s === null) continue
            groupSlopes.push({ group: key, slope: s, n: pts.length })
          }
          if (groupSlopes.length < 2) continue
          const reversed = groupSlopes.filter(
            (g) =>
              Math.sign(g.slope) === -Math.sign(global) && Math.abs(g.slope) >= SLOPE_THRESHOLD,
          )
          if (reversed.length < MIN_GROUPS_REVERSED) continue
          if (reversed.length < groupSlopes.length / 2) continue

          out.push(
            makeFinding({
              type: 'simpsons_paradox',
              data: {
                kind: 'simpsons_paradox',
                groupColumn: cat.key,
                xColumn: xCol.key,
                yColumn: yCol.key,
                globalSlope: global,
                groupSlopes,
              },
              columns: [cat.key, xCol.key, yCol.key],
              columnLabels: labels,
            }),
          )
        }
      }
    }
    return out
  },
}
