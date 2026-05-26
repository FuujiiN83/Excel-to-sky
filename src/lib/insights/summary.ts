// src/lib/insights/summary.ts
import type { ColumnType, Dataset } from '../../types/dataset'
import type { DatasetSummary } from './types'
import type { AnalysisContext } from './context'

export function buildSummary(dataset: Dataset, ctx: AnalysisContext): DatasetSummary {
  const byType: Record<ColumnType, number> = {
    boolean: 0, date: 0, number: 0, currency: 0, geo: 0, category: 0, text: 0,
  }
  for (const col of dataset.columns) byType[col.type]++

  // Null cell percentage
  let cells = 0
  let nullCells = 0
  for (const row of dataset.rows) {
    for (const col of dataset.columns) {
      cells++
      const v = row[col.key]
      if (v == null || v === '') nullCells++
    }
  }
  const nullPct = cells === 0 ? 0 : nullCells / cells

  // Duplicate row count via cached hashes
  const seen = new Map<string, number>()
  for (const h of ctx.rowHashes) seen.set(h, (seen.get(h) ?? 0) + 1)
  let duplicateRowCount = 0
  for (const c of seen.values()) if (c > 1) duplicateRowCount += c - 1

  // Temporal range from first date column with any values
  let temporalRange: DatasetSummary['temporalRange'] | undefined
  for (const col of dataset.columns) {
    if (col.type !== 'date') continue
    const ts = ctx.dateValues.get(col.key)
    if (!ts || ts.length === 0) continue
    let min = ts[0]
    let max = ts[0]
    for (const t of ts) {
      if (t < min) min = t
      if (t > max) max = t
    }
    const days = Math.max(1, Math.round((max - min) / 86_400_000))
    temporalRange = {
      from: new Date(min).toISOString().slice(0, 10),
      to: new Date(max).toISOString().slice(0, 10),
      days,
    }
    break
  }

  // Quality score: 0..1, weighted blend of (non-null share, duplicate share, type coverage)
  const nonNullShare = 1 - nullPct
  const uniqueShare = dataset.rows.length === 0 ? 1 : 1 - duplicateRowCount / dataset.rows.length
  const typeShare =
    dataset.columns.length === 0
      ? 0
      : dataset.columns.filter((c) => c.type !== 'text').length / dataset.columns.length
  const qualityScore = 0.5 * nonNullShare + 0.3 * uniqueShare + 0.2 * typeShare

  return {
    rowCount: dataset.rows.length,
    columnCount: dataset.columns.length,
    byType,
    nullPct,
    duplicateRowCount,
    temporalRange,
    qualityScore: Math.max(0, Math.min(1, qualityScore)),
  }
}
