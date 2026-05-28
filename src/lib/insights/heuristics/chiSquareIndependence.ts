// src/lib/insights/heuristics/chiSquareIndependence.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 30
const MIN_LEVELS = 2
const MAX_LEVELS = 12
const CRAMERS_V_THRESHOLD = 0.25

/**
 * χ² independence test between two categorical columns (#83). Builds the
 * contingency table, computes χ² with the standard Pearson formula, then
 * reports Cramér's V as a magnitude-aware effect size in [0, 1] that lets
 * us compare strength across tables of different sizes. We cap level counts
 * at MAX_LEVELS to avoid degenerate tables full of single-cell categories.
 */
export const chiSquareIndependence: Heuristic = {
  type: 'chi_square_independence',
  applies: (dataset) =>
    dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean').length >= 2,
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'boolean')
    const out: Finding[] = []

    for (let i = 0; i < catCols.length; i++) {
      for (let j = i + 1; j < catCols.length; j++) {
        const a = catCols[i]
        const b = catCols[j]
        const aLevels = pickLevels(ctx.valueCounts.get(a.key))
        const bLevels = pickLevels(ctx.valueCounts.get(b.key))
        if (aLevels.length < MIN_LEVELS || bLevels.length < MIN_LEVELS) continue

        const aIdx = new Map(aLevels.map((v, k) => [v, k]))
        const bIdx = new Map(bLevels.map((v, k) => [v, k]))
        const table: number[][] = Array.from({ length: aLevels.length }, () =>
          new Array<number>(bLevels.length).fill(0),
        )

        let n = 0
        for (const row of dataset.rows) {
          const av = row[a.key]
          const bv = row[b.key]
          if (av == null || av === '' || bv == null || bv === '') continue
          const ai = aIdx.get(String(av))
          const bi = bIdx.get(String(bv))
          if (ai === undefined || bi === undefined) continue
          table[ai][bi]++
          n++
        }
        if (n < MIN_N) continue

        const rowTotals = table.map((r) => r.reduce((s, c) => s + c, 0))
        const colTotals = bLevels.map((_, c) => table.reduce((s, r) => s + r[c], 0))

        let chi = 0
        for (let r = 0; r < aLevels.length; r++) {
          for (let c = 0; c < bLevels.length; c++) {
            const expected = (rowTotals[r] * colTotals[c]) / n
            if (expected < 1) continue
            chi += (table[r][c] - expected) ** 2 / expected
          }
        }
        const dof = (aLevels.length - 1) * (bLevels.length - 1)
        if (dof === 0) continue
        const minDim = Math.min(aLevels.length, bLevels.length) - 1
        const cramersV = minDim > 0 ? Math.sqrt(chi / (n * minDim)) : 0
        if (cramersV < CRAMERS_V_THRESHOLD) continue

        out.push(
          makeFinding({
            type: 'chi_square_independence',
            data: {
              kind: 'chi_square_independence',
              columnA: a.key,
              columnB: b.key,
              chiSquared: chi,
              degreesOfFreedom: dof,
              cramersV,
              n,
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

function pickLevels(counts: Map<string, number> | undefined): string[] {
  if (!counts) return []
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LEVELS)
    .map(([k]) => k)
}
