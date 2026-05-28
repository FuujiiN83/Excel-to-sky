// src/lib/story/types.ts
import type { Finding } from '../insights/types'

/**
 * Public Scene model used by the story composer (#122) and the scrollytelling
 * renderer. Scenes are deterministic, pure data — no JSX. Rendering happens
 * in the renderer layer so the composer can be reused for PDF export, audio
 * narration, embed previews, etc.
 */

/**
 * The narrative arc a scene plays in. Sequence is fixed:
 * setup → tension → resolution. The composer always emits an intro
 * (setup) and a closing (resolution); tension scenes are findings
 * surfaced by the insights engine.
 */
export type SceneRole = 'intro' | 'tension' | 'resolution'

/** Layout hint for the renderer. Defaults to `flow` for plain text scenes. */
export type SceneLayout = 'flow' | 'pinned-chart' | 'full-chart' | 'split'

/** Connector applied between this scene and the previous one (#128). */
export type TransitionKind =
  | 'open' // First scene — no transition
  | 'addition' // Stacking related points ("Además…")
  | 'contrast' // Pivot in tone ("Sin embargo…")
  | 'consequence' // Cause → effect ("Por eso…")
  | 'enumeration' // Listing ("En segundo lugar…")
  | 'closing' // Wrap-up ("En resumen…")

export interface SceneChart {
  /** Which renderer to invoke. Free-form so the renderer can grow. */
  kind: 'bar' | 'line' | 'scatter' | 'box' | 'density' | 'heatmap' | 'stacked' | 'stat'
  /** Dataset column keys the chart depends on. */
  columns: string[]
  /** Optional caption shown below the chart. */
  caption?: string
}

export interface Scene {
  id: string
  role: SceneRole
  title: string
  body: string
  /** First transition phrase (Spanish). Renderer prefixes it before `body`. */
  transition: { kind: TransitionKind; phrase: string }
  /** Charts to render alongside the text. Empty = text-only. */
  charts: SceneChart[]
  /** Rows that anchor the scene (highlight / scroll-into-view targets). */
  recordRefs: number[]
  /** Source finding ID when the scene came from one. Null for intro/closing. */
  sourceFindingId: string | null
  /** Layout hint for the renderer. */
  layout: SceneLayout
  /** Estimated reading time in seconds (#129). */
  readingTimeSec: number
}

export interface Story {
  /** Identifier of the dataset the story was composed from. */
  datasetId: string
  datasetLabel: string
  scenes: Scene[]
  /** Locale of the composed text. */
  locale: 'es' | 'en'
  /** Sum of every scene's reading time, in seconds. */
  totalReadingTimeSec: number
}

/** Snapshot of the input to compose() — what scenes saw when they were built. */
export interface ComposeInput {
  datasetId: string
  datasetLabel: string
  columnLabels: Record<string, string>
  findings: ReadonlyArray<Finding>
  rowCount: number
  columnCount: number
  qualityScore: number
  temporalRange?: { from: string; to: string; days: number }
  duplicateRowCount: number
}
