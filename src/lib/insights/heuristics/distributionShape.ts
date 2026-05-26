// src/lib/insights/heuristics/distributionShape.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, FindingData } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_VALUES = 30
const BINS = 12

type Shape = Extract<FindingData, { kind: 'distribution_shape' }>['shape']

export const distributionShape: Heuristic = {
  type: 'distribution_shape',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const stats = ctx.numericStats.get(col.key)
      const values = ctx.numericValues.get(col.key)
      if (!stats || !values || values.length < MIN_VALUES) continue
      const min = stats.sorted[0]
      const max = stats.sorted[stats.sorted.length - 1]
      if (max === min) continue

      const step = (max - min) / BINS
      const histogram = new Array(BINS).fill(0)
      for (const v of values) {
        const i = Math.min(BINS - 1, Math.floor((v - min) / step))
        histogram[i]++
      }

      const shape = classifyShape(histogram, stats, values)
      out.push(makeFinding({
        type: 'distribution_shape',
        data: { kind: 'distribution_shape', column: col.key, shape, histogram },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}

function classifyShape(
  hist: number[],
  stats: { mean: number; stdDev: number; sorted: number[] },
  values: number[],
): Shape {
  const distinct = new Set(values).size
  if (distinct < 5) return 'sparse'

  // Detect bimodality: find local maxima with significant separation
  const peaks: number[] = []
  for (let i = 1; i < hist.length - 1; i++) {
    if (hist[i] > hist[i - 1] && hist[i] > hist[i + 1] && hist[i] > values.length / hist.length) {
      peaks.push(i)
    }
  }
  if (peaks.length >= 2 && (peaks[peaks.length - 1] - peaks[0]) >= 3) return 'bimodal'

  // Skewness using third moment
  let m3 = 0
  for (const v of values) m3 += Math.pow((v - stats.mean) / Math.max(stats.stdDev, 1e-9), 3)
  m3 /= values.length
  if (m3 > 1) return 'right_skewed'
  if (m3 < -1) return 'left_skewed'

  // Uniform if histogram bins are within 25% of mean count
  const meanBin = values.length / hist.length
  const variance = hist.reduce((s, c) => s + (c - meanBin) ** 2, 0) / hist.length
  const cv = Math.sqrt(variance) / Math.max(meanBin, 1)
  if (cv < 0.25) return 'uniform'

  return 'normal'
}
