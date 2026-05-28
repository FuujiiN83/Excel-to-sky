// src/lib/insights/heuristics/benford.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, DatasetSummary } from '../types'
import type { AnalysisContext } from '../context'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 50
/**
 * χ²(8 degrees of freedom) critical value at α = 0.05 is ≈ 15.51. Anything
 * above that is a statistically significant departure from Benford's law and
 * worth surfacing as a potential fraud / fabrication signal.
 */
const CHI_THRESHOLD = 15.51

/** Expected first-digit frequencies under Benford's law: log10(1 + 1/d). */
const BENFORD = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)))

function leadingDigit(v: number): number | null {
  if (!Number.isFinite(v) || v === 0) return null
  const abs = Math.abs(v)
  // Walk the exponent so 0.00045 → 4, 5300 → 5, 42 → 4.
  const log = Math.floor(Math.log10(abs))
  const scaled = abs / Math.pow(10, log)
  const d = Math.floor(scaled)
  return d >= 1 && d <= 9 ? d : null
}

/**
 * Benford's-law check on numeric columns (#92). For each column with enough
 * non-trivial positive magnitudes we count first-digit frequencies and run a
 * χ² goodness-of-fit test against the Benford distribution. Useful as a soft
 * fraud signal — manually fabricated numbers tend to over-represent the
 * middle digits (4-6) and under-represent the leading 1s.
 */
export const benford: Heuristic = {
  type: 'benford',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const values = ctx.numericValues.get(col.key)
      if (!values || values.length < MIN_N) continue
      const counts = new Array<number>(9).fill(0)
      let n = 0
      for (const v of values) {
        const d = leadingDigit(v)
        if (d === null) continue
        counts[d - 1]++
        n++
      }
      if (n < MIN_N) continue
      // Compute χ² and the largest single-digit deviation in proportion space.
      let chi = 0
      let maxDeviation = 0
      const expectedCounts = BENFORD.map((p) => p * n)
      for (let i = 0; i < 9; i++) {
        const e = expectedCounts[i]
        if (e === 0) continue
        chi += (counts[i] - e) ** 2 / e
        const obsP = counts[i] / n
        maxDeviation = Math.max(maxDeviation, Math.abs(obsP - BENFORD[i]))
      }
      if (chi < CHI_THRESHOLD) continue

      out.push(
        makeFinding({
          type: 'benford',
          data: {
            kind: 'benford',
            column: col.key,
            chiSquared: chi,
            maxDeviation,
            observed: counts,
            expected: expectedCounts,
            n,
          },
          columns: [col.key],
          columnLabels: labels,
        }),
      )
    }
    return out
  },
}
