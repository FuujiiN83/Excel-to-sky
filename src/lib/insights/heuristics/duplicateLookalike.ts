// src/lib/insights/heuristics/duplicateLookalike.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MAX_DISTINCT = 200
const MIN_TOTAL = 10
const MAX_DISTANCE_RATIO = 0.2

export const duplicateLookalike: Heuristic = {
  type: 'duplicate_lookalike',
  applies: (dataset) =>
    dataset.rows.length >= MIN_TOTAL &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'geo'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'category' && col.type !== 'text' && col.type !== 'geo') continue
      const counts = ctx.valueCounts.get(col.key)
      if (!counts || counts.size < 2 || counts.size > MAX_DISTINCT) continue
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      if (total < MIN_TOTAL) continue

      const entries = Array.from(counts.entries())
      const groups: { canonical: string; variants: string[]; totalCount: number }[] = []
      const consumed = new Set<string>()

      // Sort by count desc so the most frequent becomes canonical
      entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

      for (let i = 0; i < entries.length; i++) {
        const [aKey, aCount] = entries[i]
        if (consumed.has(aKey)) continue
        const aNorm = normalize(aKey)
        const variants: string[] = []
        let totalCount = aCount
        for (let j = i + 1; j < entries.length; j++) {
          const [bKey, bCount] = entries[j]
          if (consumed.has(bKey)) continue
          const bNorm = normalize(bKey)
          if (aNorm === bNorm) {
            variants.push(bKey)
            totalCount += bCount
            consumed.add(bKey)
            continue
          }
          const maxLen = Math.max(aKey.length, bKey.length)
          if (maxLen === 0) continue
          const distance = levenshtein(aKey, bKey, Math.ceil(maxLen * MAX_DISTANCE_RATIO))
          if (distance >= 0 && distance / maxLen <= MAX_DISTANCE_RATIO) {
            variants.push(bKey)
            totalCount += bCount
            consumed.add(bKey)
          }
        }
        if (variants.length > 0) {
          groups.push({ canonical: aKey, variants, totalCount })
          consumed.add(aKey)
        }
      }

      if (groups.length === 0) continue
      out.push(makeFinding({
        type: 'duplicate_lookalike',
        data: { kind: 'duplicate_lookalike', column: col.key, groups },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Bounded Levenshtein. Returns -1 if distance exceeds threshold (early-exit). */
function levenshtein(a: string, b: string, threshold: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > threshold) return -1
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > threshold) return -1
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}
