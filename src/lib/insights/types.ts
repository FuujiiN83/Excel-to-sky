// src/lib/insights/types.ts
import type { ColumnType, Dataset } from '../../types/dataset'

export type FindingType =
  | 'numeric_outlier'
  | 'category_concentration'
  | 'cardinality_anomaly'
  | 'missing_data'
  | 'distribution_shape'
  | 'time_density_gap'
  | 'duplicate_lookalike'
  | 'text_outlier'
  | 'numeric_correlation'
  | 'group_disparity'
  | 'time_by_group'
  | 'conditional_outlier'
  | 'quality_score'
  | 'schema_summary'
  | 'temporal_coverage'
  | 'volume_context'

export type Severity = 'critical' | 'important' | 'note' | 'info'

export type FindingData =
  | { kind: 'numeric_outlier'; column: string; value: number; record: number; zScore: number; mean: number; stdDev: number }
  | { kind: 'category_concentration'; column: string; top: { value: string; count: number; pct: number }[]; coveragePct: number }
  | { kind: 'cardinality_anomaly'; column: string; distinct: number; total: number; reason: 'all_same' | 'all_unique' }
  | { kind: 'missing_data'; column: string; nullCount: number; nullPct: number }
  | { kind: 'distribution_shape'; column: string; shape: 'normal' | 'bimodal' | 'right_skewed' | 'left_skewed' | 'uniform' | 'sparse'; histogram: number[] }
  | { kind: 'time_density_gap'; column: string; gapStart: string; gapEnd: string; gapDays: number; expectedDensity: number }
  | { kind: 'duplicate_lookalike'; column: string; groups: { canonical: string; variants: string[]; totalCount: number }[] }
  | { kind: 'text_outlier'; column: string; value: string; record: number; reason: 'too_long' | 'too_short' | 'special_chars' }
  | { kind: 'numeric_correlation'; columnA: string; columnB: string; r: number; n: number; sample: { a: number; b: number }[] }
  | { kind: 'group_disparity'; groupColumn: string; metricColumn: string; aggregation: 'mean' | 'sum'; topGroup: string; topValue: number; bottomGroup: string; bottomValue: number; ratio: number }
  | { kind: 'time_by_group'; timeColumn: string; groupColumn: string; metricColumn: string; series: { group: string; trend: 'rising' | 'falling' | 'flat'; deltaPct: number }[] }
  | { kind: 'conditional_outlier'; column: string; groupColumn: string; group: string; value: number; record: number; localMean: number; globalMean: number }
  | { kind: 'quality_score'; score: number; cellsTotal: number; cellsValid: number; duplicateRows: number; issues: { type: string; count: number }[] }
  | { kind: 'schema_summary'; total: number; byType: Record<string, number> }
  | { kind: 'temporal_coverage'; column: string; from: string; to: string; days: number; densityPerDay: number }
  | { kind: 'volume_context'; rows: number; columns: number; cells: number }

export interface Finding {
  id: string
  type: FindingType
  severity: Severity
  score: number
  title: string
  body: string
  columns: string[]
  data: FindingData
  suggestion?: string
  recordRefs?: number[]
}

export interface DatasetSummary {
  rowCount: number
  columnCount: number
  byType: Record<ColumnType, number>
  nullPct: number
  duplicateRowCount: number
  temporalRange?: { from: string; to: string; days: number }
  qualityScore: number
}

export interface AnalyzeOptions {
  maxFindings?: number
  minScore?: number
  signal?: AbortSignal
  locale?: 'es' | 'en'
}

export interface InsightReport {
  summary: DatasetSummary
  findings: Finding[]
  byColumn: Record<string, Finding[]>
  byType: Record<FindingType, Finding[]>
  runtimeMs: number
  degraded?: boolean
}

/** Internal: payload sent to worker. */
export interface WorkerRequest {
  dataset: Dataset
  options: Omit<AnalyzeOptions, 'signal'>
}

/** Internal: payload received from worker. */
export type WorkerResponse =
  | { ok: true; report: InsightReport }
  | { ok: false; error: string }
