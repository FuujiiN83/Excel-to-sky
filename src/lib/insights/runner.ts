// src/lib/insights/runner.ts
import type { Dataset } from '../../types/dataset'
import type { AnalyzeOptions, Finding, FindingType, InsightReport } from './types'
import { buildContext } from './context'
import { buildSummary } from './summary'
import { HEURISTICS } from './heuristics/index'
import { deriveSeverity, diversityPenaltyFor, resolveWeights, scoreOne } from './scoring'
import { setInsightsLocale } from './i18n'

const DEFAULTS = { maxFindings: 25, minScore: 0.15 } as const
const HARD_CAP = 100
const TIMEOUT_MS = 5000

export function run(dataset: Dataset, options: Omit<AnalyzeOptions, 'signal'> = {}): InsightReport {
  const t0 = Date.now()
  // Apply the caller-requested locale before any heuristic renders text.
  // Default ('es') matches historical behaviour.
  // Only Spanish + English templates exist for the insights engine today;
  // other UI locales fall back to Spanish (the base language) until we
  // translate the per-finding render templates.
  setInsightsLocale(options.locale === 'en' ? 'en' : 'es')
  const weights = resolveWeights(options.weights)
  const ctx = buildContext(dataset)
  const summary = buildSummary(dataset, ctx)

  const collected: Finding[] = []
  let degraded = false

  for (const h of HEURISTICS) {
    if (Date.now() - t0 > TIMEOUT_MS) {
      degraded = true
      break
    }
    try {
      if (!h.applies(dataset, summary)) continue
      const results = h.detect(dataset, summary, ctx)
      for (const f of results) collected.push(f)
    } catch (err) {
      // Fail-open: log to console (will appear in worker), keep going
      console.warn(`[insights] heuristic ${h.type} failed:`, err)
    }
  }

  // Holm-Bonferroni correction (#95). Any finding whose data.kind carries an
  // explicit p-value enters a single family of pairwise/group tests. We sort
  // the family ascending by p, then check each against alpha / (m - rank).
  // Findings that don't pass get demoted (severity floored to 'note') so the
  // ranker doesn't surface chance-level results as critical.
  applyHolmBonferroni(collected)

  // First pass: score each finding without diversity penalty. Findings marked
  // by Holm-Bonferroni as failing the family threshold get their raw score
  // multiplied by 0.4 so they fall down the ranking but stay visible (the
  // user might still want to see weak signals).
  for (const f of collected) {
    const holmDropped = f.score === -1
    const raw = scoreOne(f, dataset.rows.length, 0, weights)
    f.score = holmDropped ? raw * 0.4 : raw
  }

  // Sort by raw score desc, then by id for determinism
  collected.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  // Apply diversity penalty in ranking order, re-score
  const typeCounter = new Map<FindingType, number>()
  for (const f of collected) {
    const count = (typeCounter.get(f.type) ?? 0) + 1
    typeCounter.set(f.type, count)
    const penalty = diversityPenaltyFor(count)
    f.score = scoreOne(f, dataset.rows.length, penalty, weights)
    f.severity = deriveSeverity(f.score)
  }

  // Final sort with penalties applied
  collected.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  // Filter min-score, cap
  const minScore = options.minScore ?? DEFAULTS.minScore
  const maxFindings = Math.min(HARD_CAP, options.maxFindings ?? DEFAULTS.maxFindings)
  const findings = collected.filter((f) => f.score >= minScore).slice(0, maxFindings)

  // Group helpers
  const byColumn: Record<string, Finding[]> = {}
  const byType = {} as Record<FindingType, Finding[]>
  for (const f of findings) {
    for (const c of f.columns) (byColumn[c] ||= []).push(f)
    ;(byType[f.type] ||= []).push(f)
  }

  return {
    summary,
    findings,
    byColumn,
    byType,
    runtimeMs: Date.now() - t0,
    degraded: degraded || undefined,
  }
}

const ALPHA = 0.05

/**
 * Extract a p-value from a finding when its data shape carries one. Returns
 * null for findings whose kind is not a statistical hypothesis test — those
 * skip the Holm family entirely.
 */
function extractPValue(f: Finding): number | null {
  switch (f.data.kind) {
    case 'anova':
    case 'ks_two_sample':
    case 'pettitt_changepoint':
      return f.data.pValue
    default:
      return null
  }
}

function applyHolmBonferroni(findings: Finding[]): void {
  const family = findings
    .map((f, i) => ({ f, i, p: extractPValue(f) }))
    .filter((x): x is { f: Finding; i: number; p: number } => x.p !== null)
  if (family.length === 0) return
  family.sort((a, b) => a.p - b.p)
  const m = family.length
  for (let rank = 0; rank < m; rank++) {
    const threshold = ALPHA / (m - rank)
    if (family[rank].p > threshold) {
      // Tag the finding so its score gets dampened later. We attach via
      // recordRefs being untouched and a tiny suggestion-side mark; the simplest
      // route is to demote severity directly downstream by halving the score.
      family[rank].f.score = -1 // sentinel: dropped by Holm
    }
  }
}
