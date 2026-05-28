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
  | 'iqr_outlier'
  | 'mad_outlier'
  | 'rank_correlation'
  | 'effect_size'
  | 'pareto'
  | 'gini'
  | 'benford'
  | 'chi_square_independence'
  | 'mann_kendall_trend'
  | 'anova'
  | 'ks_two_sample'
  | 'pettitt_changepoint'
  | 'boolean_imbalance'
  | 'whitespace_string'
  | 'mixed_type_column'
  | 'ambiguous_date_locale'
  | 'autocorrelation'
  | 'simpsons_paradox'
  | 'kmeans_cluster'
  | 'pca_dominant'
  | 'adf_stationarity'
  | 'stl_seasonality'
  | 'survival_cohort'

export type Severity = 'critical' | 'important' | 'note' | 'info'

export type FindingData =
  | {
      kind: 'numeric_outlier'
      column: string
      value: number
      record: number
      zScore: number
      mean: number
      stdDev: number
    }
  | {
      kind: 'category_concentration'
      column: string
      top: { value: string; count: number; pct: number }[]
      coveragePct: number
    }
  | {
      kind: 'cardinality_anomaly'
      column: string
      distinct: number
      total: number
      reason: 'all_same' | 'all_unique'
    }
  | { kind: 'missing_data'; column: string; nullCount: number; nullPct: number }
  | {
      kind: 'distribution_shape'
      column: string
      shape: 'normal' | 'bimodal' | 'right_skewed' | 'left_skewed' | 'uniform' | 'sparse'
      histogram: number[]
    }
  | {
      kind: 'time_density_gap'
      column: string
      gapStart: string
      gapEnd: string
      gapDays: number
      expectedDensity: number
    }
  | {
      kind: 'duplicate_lookalike'
      column: string
      groups: { canonical: string; variants: string[]; totalCount: number }[]
    }
  | {
      kind: 'text_outlier'
      column: string
      value: string
      record: number
      reason: 'too_long' | 'too_short' | 'special_chars'
    }
  | {
      kind: 'numeric_correlation'
      columnA: string
      columnB: string
      r: number
      n: number
      sample: { a: number; b: number }[]
      /** Fisher-transform 95% confidence interval for r (#94). */
      ciLow?: number
      ciHigh?: number
    }
  | {
      kind: 'group_disparity'
      groupColumn: string
      metricColumn: string
      aggregation: 'mean' | 'sum'
      topGroup: string
      topValue: number
      bottomGroup: string
      bottomValue: number
      ratio: number
    }
  | {
      kind: 'time_by_group'
      timeColumn: string
      groupColumn: string
      metricColumn: string
      series: { group: string; trend: 'rising' | 'falling' | 'flat'; deltaPct: number }[]
    }
  | {
      kind: 'conditional_outlier'
      column: string
      groupColumn: string
      group: string
      value: number
      record: number
      localMean: number
      globalMean: number
    }
  | {
      kind: 'quality_score'
      score: number
      cellsTotal: number
      cellsValid: number
      duplicateRows: number
      issues: { type: string; count: number }[]
    }
  | { kind: 'schema_summary'; total: number; byType: Record<string, number> }
  | {
      kind: 'temporal_coverage'
      column: string
      from: string
      to: string
      days: number
      densityPerDay: number
    }
  | { kind: 'volume_context'; rows: number; columns: number; cells: number }
  | {
      kind: 'iqr_outlier'
      column: string
      value: number
      record: number
      q1: number
      q3: number
      iqr: number
      side: 'below' | 'above'
    }
  | {
      kind: 'mad_outlier'
      column: string
      value: number
      record: number
      median: number
      mad: number
      modifiedZ: number
    }
  | {
      kind: 'rank_correlation'
      columnA: string
      columnB: string
      method: 'spearman' | 'kendall'
      coefficient: number
      n: number
    }
  | {
      kind: 'effect_size'
      groupColumn: string
      metricColumn: string
      groupA: string
      groupB: string
      meanA: number
      meanB: number
      d: number
      magnitude: 'small' | 'medium' | 'large'
      nA: number
      nB: number
    }
  | {
      kind: 'pareto'
      column: string
      topShare: number
      topCount: number
      totalCount: number
      /** Cumulative share captured by the top 20% of records. */
      share80: number
    }
  | { kind: 'gini'; column: string; gini: number; topQuintileShare: number; n: number }
  | {
      kind: 'benford'
      column: string
      chiSquared: number
      maxDeviation: number
      observed: number[]
      expected: number[]
      n: number
    }
  | {
      kind: 'chi_square_independence'
      columnA: string
      columnB: string
      chiSquared: number
      degreesOfFreedom: number
      cramersV: number
      n: number
    }
  | {
      kind: 'mann_kendall_trend'
      timeColumn: string
      metricColumn: string
      s: number
      tau: number
      direction: 'rising' | 'falling' | 'flat'
      n: number
    }
  | {
      kind: 'anova'
      groupColumn: string
      metricColumn: string
      f: number
      dfBetween: number
      dfWithin: number
      groups: number
      pValue: number
      etaSquared: number
    }
  | {
      kind: 'ks_two_sample'
      groupColumn: string
      metricColumn: string
      groupA: string
      groupB: string
      d: number
      nA: number
      nB: number
      pValue: number
    }
  | {
      kind: 'pettitt_changepoint'
      timeColumn: string
      metricColumn: string
      index: number
      timestamp: number
      ks: number
      pValue: number
      meanBefore: number
      meanAfter: number
    }
  | {
      kind: 'boolean_imbalance'
      column: string
      trueCount: number
      falseCount: number
      total: number
      baseRate: number
    }
  | {
      kind: 'whitespace_string'
      column: string
      count: number
      pct: number
      sample: string[]
    }
  | {
      kind: 'mixed_type_column'
      column: string
      declaredType: string
      mismatchCount: number
      mismatchPct: number
      sample: { record: number; value: string }[]
    }
  | {
      kind: 'ambiguous_date_locale'
      column: string
      bothCount: number
      total: number
      sample: string[]
    }
  | {
      kind: 'autocorrelation'
      timeColumn: string
      metricColumn: string
      lag: number
      r: number
      n: number
    }
  | {
      kind: 'simpsons_paradox'
      groupColumn: string
      xColumn: string
      yColumn: string
      globalSlope: number
      groupSlopes: { group: string; slope: number; n: number }[]
    }
  | {
      kind: 'kmeans_cluster'
      columns: string[]
      k: number
      silhouette: number
      sizes: number[]
      centroids: number[][]
    }
  | {
      kind: 'pca_dominant'
      columns: string[]
      explainedVariance: number[]
      cumulative: number
      n: number
      topComponentLoadings: { column: string; loading: number }[]
    }
  | {
      kind: 'adf_stationarity'
      timeColumn: string
      metricColumn: string
      tStatistic: number
      pValue: number
      isStationary: boolean
      n: number
    }
  | {
      kind: 'stl_seasonality'
      timeColumn: string
      metricColumn: string
      period: number
      strength: number
      n: number
    }
  | {
      kind: 'survival_cohort'
      timeColumn: string
      groupColumn: string
      cohorts: { group: string; median: number; n: number }[]
    }

/**
 * Optional calculation breadcrumbs surfaced by the explain panel (#108).
 * Heuristics that fill this give the UI a way to show the reader how the
 * finding was computed without inspecting source.
 */
export interface FindingExplain {
  /** Short formula or test name (e.g. "Pearson r"). */
  method: string
  /** Pre-formatted intermediate values (key → value). */
  steps: ReadonlyArray<{ label: string; value: string }>
  /** Optional citation or doc URL. */
  reference?: string
}

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
  /** Optional breakdown for the per-finding explain panel (#108). */
  explain?: FindingExplain
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
  /** Override the default scoring weights (#107). Missing keys keep their defaults. */
  weights?: Partial<ScoringWeights>
}

export interface ScoringWeights {
  significance: number
  coverage: number
  actionability: number
  diversityPenalty: number
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
export type WorkerResponse = { ok: true; report: InsightReport } | { ok: false; error: string }
