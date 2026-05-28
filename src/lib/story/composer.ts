// src/lib/story/composer.ts
import type { Finding, InsightReport, FindingType } from '../insights/types'
import type { ComposeInput, Scene, SceneChart, Story, TransitionKind } from './types'
import { pickPhrase } from './transitions'

/**
 * Maximum number of scenes per story (#130). Capping protects the reader
 * from a wall of findings — the composer picks the highest-scoring tension
 * scenes once intro + closing are accounted for.
 */
const MAX_SCENES = 12

/**
 * Bonus applied to a finding's score when picking the lede (#124). Findings
 * that lead to clear action (group disparity, outliers, correlations…) get a
 * bigger boost so the opening hook is something the user can do something
 * with rather than a flat schema summary.
 */
const ACTIONABILITY_BONUS: Partial<Record<FindingType, number>> = {
  numeric_outlier: 0.2,
  group_disparity: 0.25,
  numeric_correlation: 0.18,
  rank_correlation: 0.15,
  effect_size: 0.22,
  simpsons_paradox: 0.4,
  duplicate_lookalike: 0.18,
  time_density_gap: 0.12,
  mann_kendall_trend: 0.18,
  pettitt_changepoint: 0.22,
  anova: 0.18,
  ks_two_sample: 0.15,
  pareto: 0.12,
  gini: 0.1,
  benford: 0.15,
}

/**
 * Words-per-minute target for reading-time estimation (#129). 200 WPM is a
 * common print-comprehension baseline; on a mobile screen the effective rate
 * is usually a touch lower so we round generously.
 */
const WPM = 200

/**
 * Build a ComposeInput from an InsightReport. The intermediate type lets
 * callers compose a story without holding on to the whole report object,
 * which is useful for tests and for the future export path that bundles a
 * story directly into a share link.
 */
export function buildComposeInput(
  report: InsightReport,
  datasetId: string,
  datasetLabel: string,
  columnLabels: Record<string, string>,
  domain?: import('../domains').DomainMatch | null,
): ComposeInput {
  return {
    datasetId,
    datasetLabel,
    columnLabels,
    findings: report.findings,
    rowCount: report.summary.rowCount,
    columnCount: report.summary.columnCount,
    qualityScore: report.summary.qualityScore,
    temporalRange: report.summary.temporalRange,
    duplicateRowCount: report.summary.duplicateRowCount,
    domain: domain ?? null,
  }
}

/**
 * Estimate the lede score — used to pick the opening hook (#124). The lede
 * combines raw score with an actionability bonus so a high-score schema
 * summary doesn't beat a moderate-score group disparity for the front page.
 */
function ledeScore(f: Finding): number {
  return f.score + (ACTIONABILITY_BONUS[f.type] ?? 0)
}

/** Stable word count for reading-time math. Splits on whitespace runs. */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function readingTimeSec(text: string): number {
  const words = countWords(text)
  return Math.max(2, Math.round((words / WPM) * 60))
}

/** Reformulate a finding title into a narrative-friendly headline (#131). */
function narrativeTitle(finding: Finding): string {
  const t = finding.title
  // Strip "ColName: " prefixes so the scene title reads like prose. Insights
  // titles start with "<Column>: …" which is informative for the dashboard
  // but feels like a label inside a story.
  const colonIdx = t.indexOf(':')
  if (colonIdx > -1 && colonIdx < 40) {
    const before = t.slice(0, colonIdx).trim()
    const after = t.slice(colonIdx + 1).trim()
    if (after.length > 0) return capitalise(`${after} (${before})`)
  }
  return capitalise(t)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Derive a sensible chart hint for the scene from a finding's data shape. */
function chartsForFinding(f: Finding): SceneChart[] {
  switch (f.data.kind) {
    case 'numeric_correlation':
    case 'rank_correlation':
      return [{ kind: 'scatter', columns: [f.data.columnA, f.data.columnB] }]
    case 'group_disparity':
    case 'effect_size':
    case 'anova':
    case 'ks_two_sample':
      return [{ kind: 'bar', columns: [f.data.groupColumn, f.data.metricColumn] }]
    case 'time_by_group':
      return [{ kind: 'line', columns: [f.data.timeColumn, f.data.metricColumn] }]
    case 'mann_kendall_trend':
    case 'autocorrelation':
    case 'pettitt_changepoint':
      return [{ kind: 'line', columns: [f.data.timeColumn, f.data.metricColumn] }]
    case 'distribution_shape':
      return [{ kind: 'density', columns: [f.data.column] }]
    case 'numeric_outlier':
    case 'iqr_outlier':
    case 'mad_outlier':
      return [{ kind: 'box', columns: [f.data.column] }]
    case 'category_concentration':
    case 'pareto':
    case 'gini':
      return [{ kind: 'bar', columns: [f.data.column] }]
    default:
      return []
  }
}

/** Build the opening "Resumen" scene (#125). */
function makeIntroScene(input: ComposeInput, locale: 'es' | 'en'): Scene {
  const qual = Math.round(input.qualityScore * 100)
  const range = input.temporalRange
    ? ` Cubre del ${input.temporalRange.from} al ${input.temporalRange.to} (${input.temporalRange.days} días).`
    : ''
  const dupes =
    input.duplicateRowCount > 0
      ? ` Detectamos ${input.duplicateRowCount} filas duplicadas, conviene revisarlas.`
      : ''
  // Lead with the domain when we detected one (sub-project #2 wire-up).
  const domain = input.domain?.pack
  const domainPrefix = domain
    ? locale === 'en'
      ? `Looks like a ${domain.label.toLowerCase()} dataset. `
      : `Parece un dataset de ${domain.label.toLowerCase()}. `
    : ''
  const baseBody =
    locale === 'en'
      ? `${input.datasetLabel} contains ${fmt(input.rowCount)} rows across ${input.columnCount} columns. Quality estimated at ${qual}%.${range}${dupes}`
      : `${input.datasetLabel} contiene ${fmt(input.rowCount)} filas en ${input.columnCount} columnas. Calidad estimada del ${qual}%.${range}${dupes}`
  const body = `${domainPrefix}${baseBody}`
  return {
    id: `intro:${input.datasetId}`,
    role: 'intro',
    title:
      locale === 'en' ? `Welcome to ${input.datasetLabel}` : `Bienvenido a ${input.datasetLabel}`,
    body,
    transition: { kind: 'open', phrase: pickPhrase('open', 0) },
    charts: [{ kind: 'stat', columns: [] }],
    recordRefs: [],
    sourceFindingId: null,
    layout: 'flow',
    readingTimeSec: readingTimeSec(body),
  }
}

/** Build the wrap-up scene (#126). */
function makeClosingScene(input: ComposeInput, scenes: Scene[], locale: 'es' | 'en'): Scene {
  const qual = Math.round(input.qualityScore * 100)
  const counted = scenes.filter((s) => s.role === 'tension').length
  // Prefer the domain pack's hints when we detected one — those are tailored
  // to the vertical and read as concrete next steps. Fall back to the finding
  // suggestions when no domain matched.
  const domainHints = input.domain?.pack.hints.slice(0, 3) ?? []
  const findingSuggestions =
    domainHints.length > 0
      ? []
      : Array.from(
          new Set(
            input.findings
              .map((f) => f.suggestion)
              .filter((s): s is string => Boolean(s))
              .slice(0, 3),
          ),
        )
  const tips = domainHints.length > 0 ? domainHints : findingSuggestions
  const bullets = tips.length > 0 ? ` Próximos pasos: ${tips.join(' · ')}` : ''
  const body =
    locale === 'en'
      ? `We surfaced ${counted} findings worth your attention. Overall data quality is ${qual}%.${bullets}`
      : `Hemos destacado ${counted} hallazgos relevantes. La calidad global del dataset es del ${qual}%.${bullets}`
  return {
    id: `closing:${input.datasetId}`,
    role: 'resolution',
    title: locale === 'en' ? 'Where we land' : 'Para cerrar',
    body,
    transition: { kind: 'closing', phrase: pickPhrase('closing', 0) },
    charts: [],
    recordRefs: [],
    sourceFindingId: null,
    layout: 'flow',
    readingTimeSec: readingTimeSec(body),
  }
}

/**
 * Order tension scenes along the narrative arc (#127): start with the lede
 * (largest actionable finding), then alternate addition / consequence /
 * contrast transitions to keep the rhythm varied. The ordering is stable so
 * repeated compose() calls on the same report return identical scene lists.
 */
function orderTensionScenes(findings: ReadonlyArray<Finding>): Finding[] {
  const ranked = findings
    .slice()
    .sort((a, b) => ledeScore(b) - ledeScore(a) || a.id.localeCompare(b.id))
  return ranked
}

/** Choose the transition kind for a scene given its rank in the tension block. */
function transitionKindFor(rank: number, total: number): TransitionKind {
  if (rank === 0) return 'open'
  if (rank === total - 1) return 'contrast'
  if (rank % 3 === 1) return 'consequence'
  if (rank % 3 === 2) return 'contrast'
  return 'addition'
}

/**
 * Compose a Story from an InsightReport (#123). Intro + closing always
 * present; tension scenes are derived from up to MAX_SCENES − 2 of the
 * highest-scoring findings.
 */
export function compose(input: ComposeInput, locale: 'es' | 'en' = 'es'): Story {
  const intro = makeIntroScene(input, locale)
  const ordered = orderTensionScenes(input.findings)
  const tensionBudget = Math.max(0, MAX_SCENES - 2)
  const picked = ordered.slice(0, tensionBudget)

  const tension: Scene[] = picked.map((f, i) => {
    const kind = transitionKindFor(i, picked.length)
    const phrase = pickPhrase(kind, i)
    const title = narrativeTitle(f)
    const body = f.body
    return {
      id: `scene:${f.id}`,
      role: 'tension',
      title,
      body,
      transition: { kind, phrase },
      charts: chartsForFinding(f),
      recordRefs: f.recordRefs ?? [],
      sourceFindingId: f.id,
      layout: f.columns.length === 2 ? 'split' : 'pinned-chart',
      readingTimeSec: readingTimeSec(`${title} ${body}`),
    }
  })

  const scenes: Scene[] = [intro, ...tension]
  const closing = makeClosingScene(input, scenes, locale)
  scenes.push(closing)

  return {
    datasetId: input.datasetId,
    datasetLabel: input.datasetLabel,
    scenes,
    locale,
    totalReadingTimeSec: scenes.reduce((s, x) => s + x.readingTimeSec, 0),
  }
}

/**
 * Pure helper exposing the lede pick — useful when a caller wants to show
 * the headline finding outside the story renderer (e.g. preview cards).
 */
export function pickLede(findings: ReadonlyArray<Finding>): Finding | null {
  if (findings.length === 0) return null
  return orderTensionScenes(findings)[0] ?? null
}

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}
