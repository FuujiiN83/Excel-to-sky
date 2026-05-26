// src/lib/insights/scoring.ts
import type { Finding, FindingType, Severity } from './types'

const WEIGHTS = { significance: 0.4, coverage: 0.25, actionability: 0.2, diversityPenalty: 0.15 }
const MAX_RAW = WEIGHTS.significance + WEIGHTS.coverage + WEIGHTS.actionability // 0.85

const ACTIONABILITY: Record<FindingType, number> = {
  numeric_outlier: 0.9,
  group_disparity: 0.9,
  numeric_correlation: 0.8,
  conditional_outlier: 0.9,
  duplicate_lookalike: 0.9,
  category_concentration: 0.7,
  missing_data: 0.7,
  time_density_gap: 0.6,
  time_by_group: 0.7,
  distribution_shape: 0.5,
  text_outlier: 0.4,
  cardinality_anomaly: 0.5,
  quality_score: 0.3,
  schema_summary: 0.2,
  temporal_coverage: 0.2,
  volume_context: 0.1,
}

export function computeSignificance(f: Finding): number {
  switch (f.data.kind) {
    case 'numeric_outlier': return Math.min(1, Math.abs(f.data.zScore) / 6)
    case 'numeric_correlation': return Math.min(1, Math.abs(f.data.r))
    case 'category_concentration': return f.data.coveragePct
    case 'group_disparity': return Math.min(1, Math.log(Math.max(1.0001, f.data.ratio)) / Math.log(20))
    case 'missing_data': return f.data.nullPct
    case 'duplicate_lookalike': {
      const totalVariants = f.data.groups.reduce((s, g) => s + g.variants.length, 0)
      return Math.min(1, totalVariants / 20)
    }
    case 'distribution_shape':
      return (f.data.shape === 'bimodal' || f.data.shape === 'right_skewed' || f.data.shape === 'left_skewed' || f.data.shape === 'sparse')
        ? 0.6 : 0.2
    case 'time_density_gap': return Math.min(1, f.data.gapDays / Math.max(1, f.data.expectedDensity))
    case 'conditional_outlier': {
      const local = f.data.value - f.data.localMean
      const denom = Math.abs(f.data.globalMean) || 1
      return Math.min(1, Math.abs(local / denom) / 6)
    }
    case 'text_outlier': return f.data.reason === 'special_chars' ? 0.5 : 0.4
    case 'cardinality_anomaly': return 0.7
    case 'time_by_group': {
      if (f.data.series.length === 0) return 0
      const avg = f.data.series.reduce((s, x) => s + Math.abs(x.deltaPct), 0) / f.data.series.length
      return Math.min(1, avg / 100)
    }
    case 'quality_score': return 1 - f.data.score
    case 'schema_summary': return 0.3
    case 'temporal_coverage': return 0.3
    case 'volume_context': return 0.2
  }
}

export function computeCoverage(f: Finding, rowCount: number): number {
  if (rowCount === 0) return 0
  const refs = f.recordRefs?.length ?? 0
  if (refs === 0) return 0.1 // floor for findings without explicit recordRefs
  return Math.max(0.1, Math.min(1, refs / rowCount))
}

export function scoreOne(f: Finding, rowCount: number, diversityPenalty: number): number {
  const sig = computeSignificance(f)
  const cov = computeCoverage(f, rowCount)
  const act = ACTIONABILITY[f.type]
  const raw =
    WEIGHTS.significance * sig +
    WEIGHTS.coverage * cov +
    WEIGHTS.actionability * act
  const penalized = raw * (1 - WEIGHTS.diversityPenalty * diversityPenalty)
  const score = penalized / MAX_RAW
  return clamp(0, 1, score)
}

export function deriveSeverity(score: number): Severity {
  if (score > 0.75) return 'critical'
  if (score > 0.5) return 'important'
  if (score > 0.25) return 'note'
  return 'info'
}

/**
 * Apply diversity penalty per type in ranking order. Top-3 of each type pass clean,
 * subsequent ones receive penalty = 1 - 0.85^(n-3).
 */
export function diversityPenaltyFor(typeCount: number): number {
  if (typeCount <= 3) return 0
  return 1 - Math.pow(0.85, typeCount - 3)
}

function clamp(lo: number, hi: number, x: number): number {
  return Math.max(lo, Math.min(hi, x))
}
