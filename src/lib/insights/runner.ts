// src/lib/insights/runner.ts
import type { Dataset } from '../../types/dataset'
import type { AnalyzeOptions, Finding, FindingType, InsightReport } from './types'
import { buildContext } from './context'
import { buildSummary } from './summary'
import { HEURISTICS } from './heuristics/index'
import { deriveSeverity, diversityPenaltyFor, scoreOne } from './scoring'

const DEFAULTS = { maxFindings: 25, minScore: 0.15 } as const
const HARD_CAP = 100
const TIMEOUT_MS = 5000

export function run(dataset: Dataset, options: Omit<AnalyzeOptions, 'signal'> = {}): InsightReport {
  const t0 = Date.now()
  const ctx = buildContext(dataset)
  const summary = buildSummary(dataset, ctx)

  const collected: Finding[] = []
  let degraded = false

  for (const h of HEURISTICS) {
    if (Date.now() - t0 > TIMEOUT_MS) { degraded = true; break }
    try {
      if (!h.applies(dataset, summary)) continue
      const results = h.detect(dataset, summary, ctx)
      for (const f of results) collected.push(f)
    } catch (err) {
      // Fail-open: log to console (will appear in worker), keep going
      // eslint-disable-next-line no-console
      console.warn(`[insights] heuristic ${h.type} failed:`, err)
    }
  }

  // First pass: score each finding without diversity penalty
  for (const f of collected) f.score = scoreOne(f, dataset.rows.length, 0)

  // Sort by raw score desc, then by id for determinism
  collected.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))

  // Apply diversity penalty in ranking order, re-score
  const typeCounter = new Map<FindingType, number>()
  for (const f of collected) {
    const count = (typeCounter.get(f.type) ?? 0) + 1
    typeCounter.set(f.type, count)
    const penalty = diversityPenaltyFor(count)
    f.score = scoreOne(f, dataset.rows.length, penalty)
    f.severity = deriveSeverity(f.score)
  }

  // Final sort with penalties applied
  collected.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))

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
