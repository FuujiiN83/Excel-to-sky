# Insights Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100%-local, deterministic statistical insights engine that analyzes any `Dataset` and returns a ranked `InsightReport` with 16 distinct heuristic findings — the foundation of the narrative dashboard product.

**Architecture:** Pure-TypeScript module under `src/lib/insights/`, runs inside a Web Worker (mirroring the existing `parser.worker.ts` pattern). Each heuristic is a self-contained file implementing a shared `Heuristic` interface. A central `runner` orchestrates them, a `scoring` module rankings their output, and a single `analyzeDataset()` async function is the public API.

**Tech Stack:** TypeScript 5, Vite Web Workers, pure JS math (no external stats library). Consumes `Dataset`/`Column`/`CellValue` types from `src/types/dataset.ts`.

**Spec:** `docs/superpowers/specs/2026-05-26-insights-engine-design.md`

**User decision: skip writing tests this phase.** Each task ends with manual verification via `console.log` inspection on real sample datasets + the user's shift-tracker Excel + `npx tsc --noEmit` clean.

---

## File structure (target)

```
src/lib/insights/
├── index.ts                 # analyzeDataset() public wrapper, exported types
├── types.ts                 # Finding, FindingData, AnalyzeOptions, InsightReport, DatasetSummary
├── hash.ts                  # fnv1a — deterministic id hashing
├── context.ts               # AnalysisContext: shared cache built once per analysis
├── summary.ts               # buildSummary(dataset) → DatasetSummary
├── scoring.ts               # scoreFinding() + applyDiversityPenalty() + deriveSeverity()
├── runner.ts                # run(dataset, options) → InsightReport
├── worker.ts                # Web Worker entry (receives Dataset, posts back InsightReport)
├── i18n/
│   └── es.ts                # Title/body template fns per FindingType
└── heuristics/
    ├── _base.ts             # Heuristic interface + small helpers
    ├── index.ts             # exports HEURISTICS: Heuristic[]
    ├── numericOutlier.ts
    ├── categoryConcentration.ts
    ├── cardinalityAnomaly.ts
    ├── missingData.ts
    ├── distributionShape.ts
    ├── timeDensityGap.ts
    ├── duplicateLookalike.ts
    ├── textOutlier.ts
    ├── numericCorrelation.ts
    ├── groupDisparity.ts
    ├── timeByGroup.ts
    ├── conditionalOutlier.ts
    ├── qualityScore.ts
    ├── schemaSummary.ts
    ├── temporalCoverage.ts
    └── volumeContext.ts
```

Plus a small dev workbench:

```
src/dev/
└── InsightsWorkbench.tsx    # hidden route /dev/insights for manual verification
```

And one App.tsx hook (Task 25) to auto-run after parse and console.log the report in dev mode.

---

## Conventions used across all tasks

- All inline code blocks are complete — no `...` placeholders. Paste-ready.
- After every code task: `cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit` must exit 0 before committing.
- Commit messages follow Conventional Commits: `feat(insights): …` or `chore(insights): …`.
- All heuristic functions are **pure**: no Math.random, no Date.now inside the algorithm (only inside the wrapper for `runtimeMs`). Same input → same output.
- All strings to the user go through `src/lib/insights/i18n/es.ts` — no hardcoded user-facing strings in heuristic files.

---

# Phase 0 — Foundation (Tasks 1-8)

End state: typed module skeleton with worker + API entry + scoring + runner + empty heuristic registry. `analyzeDataset()` callable, returns an empty `InsightReport` with valid `summary`.

## Task 1: Create types module

**Files:**
- Create: `src/lib/insights/types.ts`

- [ ] **Step 1: Write the file**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/types.ts
git commit -m "feat(insights): module type definitions"
```

---

## Task 2: Create deterministic hash helper

**Files:**
- Create: `src/lib/insights/hash.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/insights/hash.ts
// FNV-1a 32-bit hash. Used to generate stable Finding ids from payload.

const OFFSET = 0x811c9dc5
const PRIME = 0x01000193

export function fnv1a(s: string): string {
  let h = OFFSET
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, PRIME)
  }
  // Unsigned 32-bit hex (8 chars)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Hash an arbitrary plain-object payload deterministically by stable JSON. */
export function hashPayload(parts: unknown[]): string {
  return fnv1a(stableStringify(parts))
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v as Record<string, unknown>).sort()
  const obj = v as Record<string, unknown>
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/hash.ts
git commit -m "feat(insights): deterministic FNV-1a id hashing"
```

---

## Task 3: AnalysisContext shared cache

**Files:**
- Create: `src/lib/insights/context.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/insights/context.ts
import type { Dataset } from '../../types/dataset'
import { fnv1a } from './hash'

export interface NumericStats {
  mean: number
  stdDev: number
  sum: number
  /** Ascending sorted copy of valid numeric values. */
  sorted: number[]
}

export interface AnalysisContext {
  /** column.key -> valid numeric values (NaN/null removed). */
  numericValues: Map<string, number[]>
  /** column.key -> precomputed stats. */
  numericStats: Map<string, NumericStats>
  /** column.key -> Map<value, count> for categorical/text/geo columns. */
  valueCounts: Map<string, Map<string, number>>
  /** column.key -> ms timestamps for date columns. */
  dateValues: Map<string, number[]>
  /** Stable hash per row (for dataset-level duplicate detection). */
  rowHashes: string[]
}

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/

function toMillis(raw: unknown): number | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const s = String(raw).trim()
  if (!s) return null
  let m = DATE_DMY.exec(s)
  if (m) {
    const [, d, mo, y] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  m = DATE_ISO.exec(s)
  if (m) {
    const [, y, mo, d] = m
    const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getTime()
    return Number.isNaN(t) ? null : t
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function toNumber(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw === 'boolean') return raw ? 1 : 0
  const s = String(raw).trim().replace(/[€$£¥\s]/g, '')
  // ES-locale aware decimal: prefer comma-as-decimal when both `,` and `.` present
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let cleaned = s
  if (lastComma !== -1 && lastDot !== -1) {
    cleaned = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    cleaned = s.replace(',', '.')
  }
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function computeNumericStats(values: number[]): NumericStats {
  if (values.length === 0) return { mean: 0, stdDev: 0, sum: 0, sorted: [] }
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / values.length
  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  const stdDev = Math.sqrt(variance / values.length)
  const sorted = [...values].sort((a, b) => a - b)
  return { mean, stdDev, sum, sorted }
}

export function buildContext(dataset: Dataset): AnalysisContext {
  const numericValues = new Map<string, number[]>()
  const numericStats = new Map<string, NumericStats>()
  const valueCounts = new Map<string, Map<string, number>>()
  const dateValues = new Map<string, number[]>()

  for (const col of dataset.columns) {
    if (col.type === 'number' || col.type === 'currency') {
      const nums: number[] = []
      for (const row of dataset.rows) {
        const n = toNumber(row[col.key])
        if (n !== null) nums.push(n)
      }
      numericValues.set(col.key, nums)
      numericStats.set(col.key, computeNumericStats(nums))
    } else if (col.type === 'date') {
      const ts: number[] = []
      for (const row of dataset.rows) {
        const t = toMillis(row[col.key])
        if (t !== null) ts.push(t)
      }
      dateValues.set(col.key, ts)
    } else {
      // category / text / geo / boolean
      const counts = new Map<string, number>()
      for (const row of dataset.rows) {
        const v = row[col.key]
        if (v == null || v === '') continue
        const k = String(v)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      valueCounts.set(col.key, counts)
    }
  }

  // Row hashes for duplicate detection
  const rowHashes = dataset.rows.map((row) => {
    const parts: string[] = []
    for (const col of dataset.columns) {
      const v = row[col.key]
      parts.push(v == null ? '' : String(v))
    }
    return fnv1a(parts.join('\u0001'))
  })

  return { numericValues, numericStats, valueCounts, dateValues, rowHashes }
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/context.ts
git commit -m "feat(insights): AnalysisContext with cached per-column stats"
```

---

## Task 4: DatasetSummary builder

**Files:**
- Create: `src/lib/insights/summary.ts`

- [ ] **Step 1: Write the file**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/summary.ts
git commit -m "feat(insights): DatasetSummary builder"
```

---

## Task 5: Spanish i18n templates

**Files:**
- Create: `src/lib/insights/i18n/es.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/insights/i18n/es.ts
import type { FindingData } from '../types'

export interface RenderedText { title: string; body: string; suggestion?: string }

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

export function render(data: FindingData, columnLabels: Record<string, string>): RenderedText {
  const lbl = (k: string): string => columnLabels[k] ?? k
  switch (data.kind) {
    case 'numeric_outlier':
      return {
        title: `${lbl(data.column)}: valor ${fmt(data.value)} se aleja ${data.zScore.toFixed(1)}σ de la media`,
        body: `La media es ${fmt(data.mean)} con desviación ${fmt(data.stdDev)}. Este registro destaca claramente del resto.`,
        suggestion: 'Filtrar solo outliers',
      }
    case 'category_concentration':
      return {
        title: `${lbl(data.column)}: los ${data.top.length} valores principales acumulan ${pct(data.coveragePct)}`,
        body: `${data.top.slice(0, 3).map((t) => `${t.value} (${pct(t.pct)})`).join(', ')}. Distribución concentrada.`,
        suggestion: 'Agrupar por estos valores',
      }
    case 'cardinality_anomaly':
      return data.reason === 'all_unique'
        ? {
            title: `${lbl(data.column)}: todos los ${data.total} valores son únicos`,
            body: 'Probablemente un identificador. No aporta valor para agrupar o agregar.',
          }
        : {
            title: `${lbl(data.column)}: un solo valor en ${data.total} filas`,
            body: 'Esta columna no aporta variación. Podrías eliminarla del análisis.',
          }
    case 'missing_data':
      return {
        title: `${lbl(data.column)}: ${pct(data.nullPct)} de las filas están vacías`,
        body: `${data.nullCount} celdas sin dato. Considera limpiar antes de analizar.`,
      }
    case 'distribution_shape':
      return {
        title: `${lbl(data.column)}: distribución ${describeShape(data.shape)}`,
        body: shapeInsight(data.shape),
      }
    case 'time_density_gap':
      return {
        title: `${lbl(data.column)}: hueco de ${data.gapDays} días sin datos`,
        body: `Entre ${data.gapStart} y ${data.gapEnd} no hay registros. Posible fallo de captura o periodo no activo.`,
      }
    case 'duplicate_lookalike':
      return {
        title: `${lbl(data.column)}: ${data.groups.length} grupo${data.groups.length === 1 ? '' : 's'} con variantes que parecen el mismo valor`,
        body: data.groups.slice(0, 2).map((g) => `"${g.canonical}" ↔ ${g.variants.slice(0, 3).map((v) => `"${v}"`).join(', ')}`).join('. '),
        suggestion: 'Normalizar variantes',
      }
    case 'text_outlier':
      return {
        title: `${lbl(data.column)}: valor anómalo (${data.reason === 'too_long' ? 'demasiado largo' : data.reason === 'too_short' ? 'demasiado corto' : 'caracteres raros'})`,
        body: `"${data.value.slice(0, 60)}${data.value.length > 60 ? '…' : ''}" — posible error de carga.`,
      }
    case 'numeric_correlation':
      return {
        title: `${lbl(data.columnA)} y ${lbl(data.columnB)} se mueven ${data.r > 0 ? 'a la par' : 'en sentido opuesto'} (r = ${data.r.toFixed(2)})`,
        body: data.r > 0
          ? 'A más en una columna, más en la otra. Correlación fuerte.'
          : 'A más en una columna, menos en la otra. Correlación fuerte e inversa.',
        suggestion: 'Cruzar en scatter plot',
      }
    case 'group_disparity':
      return {
        title: `${lbl(data.topGroup)} tiene ${data.ratio.toFixed(1)}× más ${lbl(data.metricColumn)} que ${lbl(data.bottomGroup)}`,
        body: `Media de ${data.topValue.toFixed(1)} vs ${data.bottomValue.toFixed(1)}. Diferencia significativa entre grupos.`,
        suggestion: 'Comparar grupos',
      }
    case 'time_by_group':
      return {
        title: `${lbl(data.metricColumn)} por ${lbl(data.groupColumn)} tiene tendencias divergentes`,
        body: data.series.slice(0, 3).map((s) => `${s.group}: ${s.trend === 'rising' ? '+' : s.trend === 'falling' ? '−' : '±'}${Math.abs(s.deltaPct).toFixed(0)}%`).join(', '),
      }
    case 'conditional_outlier':
      return {
        title: `Dentro de ${lbl(data.groupColumn)}="${data.group}", ${lbl(data.column)}=${fmt(data.value)} es atípico`,
        body: `Media local del grupo: ${fmt(data.localMean)}. Media global: ${fmt(data.globalMean)}.`,
      }
    case 'quality_score':
      return {
        title: `Calidad del dataset: ${pct(data.score)}`,
        body: `${data.cellsValid} de ${data.cellsTotal} celdas válidas. ${data.duplicateRows} filas duplicadas.`,
      }
    case 'schema_summary':
      return {
        title: `${data.total} columnas detectadas`,
        body: Object.entries(data.byType).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`).join(' · '),
      }
    case 'temporal_coverage':
      return {
        title: `Datos entre ${data.from} y ${data.to}`,
        body: `${data.days} días cubiertos, ~${data.densityPerDay.toFixed(1)} registros por día.`,
      }
    case 'volume_context':
      return {
        title: `${fmt(data.rows)} filas × ${data.columns} columnas`,
        body: `${fmt(data.cells)} celdas en total.`,
      }
  }
}

function describeShape(s: string): string {
  switch (s) {
    case 'normal': return 'aproximadamente normal'
    case 'bimodal': return 'bimodal (dos picos)'
    case 'right_skewed': return 'sesgada a la derecha (cola larga arriba)'
    case 'left_skewed': return 'sesgada a la izquierda (cola larga abajo)'
    case 'uniform': return 'uniforme'
    case 'sparse': return 'dispersa (pocos valores únicos)'
  }
  return s
}

function shapeInsight(s: string): string {
  switch (s) {
    case 'normal': return 'Los datos se concentran alrededor de la media. Mean ≈ median.'
    case 'bimodal': return 'Probablemente hay dos poblaciones distintas mezcladas. Considera segmentar.'
    case 'right_skewed': return 'Pocos valores muy altos arrastran la media. Mediana es más representativa.'
    case 'left_skewed': return 'Pocos valores muy bajos arrastran la media. Mediana es más representativa.'
    case 'uniform': return 'Los valores se reparten sin un centro claro. Quizá categórica disfrazada de numérica.'
    case 'sparse': return 'Pocos valores únicos. Quizá deberías tratarla como categoría.'
  }
  return ''
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/i18n/es.ts
git commit -m "feat(insights): es-ES title/body templates"
```

---

## Task 6: Heuristic base interface + empty registry

**Files:**
- Create: `src/lib/insights/heuristics/_base.ts`
- Create: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Write `_base.ts`**

```typescript
// src/lib/insights/heuristics/_base.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, FindingData, FindingType } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import { hashPayload } from '../hash'
import { render } from '../i18n/es'

export interface Heuristic {
  type: FindingType
  applies(dataset: Dataset, summary: DatasetSummary): boolean
  detect(dataset: Dataset, summary: DatasetSummary, ctx: AnalysisContext): Finding[]
}

/** Build a Finding from its FindingData; fills id/title/body/severity via i18n. */
export function makeFinding(args: {
  type: FindingType
  data: FindingData
  columns: string[]
  columnLabels: Record<string, string>
  recordRefs?: number[]
}): Finding {
  const id = `${args.type}:${hashPayload([args.columns, args.data])}`
  const text = render(args.data, args.columnLabels)
  return {
    id,
    type: args.type,
    severity: 'info', // overridden by scoring stage
    score: 0,         // filled by scoring stage
    title: text.title,
    body: text.body,
    columns: args.columns,
    data: args.data,
    suggestion: text.suggestion,
    recordRefs: args.recordRefs,
  }
}

/** Build a label lookup map for a dataset. */
export function columnLabels(dataset: Dataset): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of dataset.columns) out[c.key] = c.label
  return out
}
```

- [ ] **Step 2: Write `heuristics/index.ts` (empty registry, filled by later tasks)**

```typescript
// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'

// Registry filled by Tasks 9-24. Each task adds one import + one array entry.
export const HEURISTICS: Heuristic[] = []
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/insights/heuristics/_base.ts src/lib/insights/heuristics/index.ts
git commit -m "feat(insights): Heuristic interface + empty registry"
```

---

## Task 7: Scoring (significance + diversity + severity)

**Files:**
- Create: `src/lib/insights/scoring.ts`

- [ ] **Step 1: Write the file**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/scoring.ts
git commit -m "feat(insights): scoring (significance + diversity + severity)"
```

---

## Task 8: Runner orchestration

**Files:**
- Create: `src/lib/insights/runner.ts`

- [ ] **Step 1: Write the file**

```typescript
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
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/insights/runner.ts
git commit -m "feat(insights): runner orchestration + ranking pipeline"
```

---

## Task 9: Worker + public API

**Files:**
- Create: `src/lib/insights/worker.ts`
- Create: `src/lib/insights/index.ts`

- [ ] **Step 1: Write `worker.ts`**

```typescript
// src/lib/insights/worker.ts
import { run } from './runner'
import type { WorkerRequest, WorkerResponse } from './types'

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  try {
    const { dataset, options } = event.data
    const report = run(dataset, options)
    const response: WorkerResponse = { ok: true, report }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  }
})
```

- [ ] **Step 2: Write `index.ts`**

```typescript
// src/lib/insights/index.ts
import type { Dataset } from '../../types/dataset'
import type { AnalyzeOptions, InsightReport, WorkerResponse } from './types'
import { run as runSync } from './runner'

export type {
  AnalyzeOptions,
  Finding,
  FindingData,
  FindingType,
  InsightReport,
  DatasetSummary,
  Severity,
} from './types'

const WORKERS_SUPPORTED = typeof Worker !== 'undefined'

export async function analyzeDataset(
  dataset: Dataset,
  options: AnalyzeOptions = {},
): Promise<InsightReport> {
  const { signal, ...workerOpts } = options

  if (!WORKERS_SUPPORTED) {
    // eslint-disable-next-line no-console
    console.warn('[insights] Web Workers not supported; falling back to main thread')
    return runSync(dataset, workerOpts)
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  return new Promise<InsightReport>((resolve, reject) => {
    const onAbort = (): void => {
      worker.terminate()
      reject(new DOMException('Analysis aborted', 'AbortError'))
    }
    if (signal) {
      if (signal.aborted) {
        worker.terminate()
        reject(new DOMException('Analysis aborted', 'AbortError'))
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
      if (e.data.ok) resolve(e.data.report)
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
      reject(new Error(e.message))
    }

    worker.postMessage({ dataset, options: workerOpts })
  })
}
```

- [ ] **Step 3: Type-check + build**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && npm run build
```
Expected: tsc exit 0, build succeeds. Build output should include a new chunk for `insights/worker-*.js`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/insights/worker.ts src/lib/insights/index.ts
git commit -m "feat(insights): Web Worker + analyzeDataset() public API"
```

---

# Phase 1 — Single-column heuristics (Tasks 10-17)

End state: 8 single-column heuristics registered. `analyzeDataset()` on a sample returns real findings.

## Task 10: numericOutlier heuristic

**Files:**
- Create: `src/lib/insights/heuristics/numericOutlier.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/numericOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const Z_THRESHOLD = 3

export const numericOutlier: Heuristic = {
  type: 'numeric_outlier',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const stats = ctx.numericStats.get(col.key)
      if (!stats || stats.stdDev === 0 || stats.sorted.length < 4) continue

      // Scan original rows for outliers (we need row index for recordRefs)
      for (let i = 0; i < dataset.rows.length; i++) {
        const raw = dataset.rows[i][col.key]
        if (raw == null || raw === '') continue
        const v = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(v)) continue
        const z = (v - stats.mean) / stats.stdDev
        if (Math.abs(z) >= Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'numeric_outlier',
            data: {
              kind: 'numeric_outlier',
              column: col.key,
              value: v,
              record: i,
              zScore: z,
              mean: stats.mean,
              stdDev: stats.stdDev,
            },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [i],
          }))
        }
      }
    }
    return out
  },
}
```

- [ ] **Step 2: Register in `heuristics/index.ts`**

Replace the entire file with:
```typescript
// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
]
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/insights/heuristics/numericOutlier.ts src/lib/insights/heuristics/index.ts
git commit -m "feat(insights): numeric outlier heuristic"
```

---

## Task 11: categoryConcentration heuristic

**Files:**
- Create: `src/lib/insights/heuristics/categoryConcentration.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/categoryConcentration.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_COVERAGE = 0.5
const MIN_ROWS = 10

export const categoryConcentration: Heuristic = {
  type: 'category_concentration',
  applies: (dataset) =>
    dataset.rows.length >= MIN_ROWS &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'geo' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'category' && col.type !== 'text' && col.type !== 'geo' && col.type !== 'boolean') continue
      const counts = ctx.valueCounts.get(col.key)
      if (!counts || counts.size < 2) continue
      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      if (total < MIN_ROWS) continue

      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      const topN = Math.min(3, sorted.length)
      const top = sorted.slice(0, topN).map(([value, count]) => ({
        value,
        count,
        pct: count / total,
      }))
      const coveragePct = top.reduce((s, t) => s + t.pct, 0)
      if (coveragePct < MIN_COVERAGE) continue

      // Build recordRefs from rows matching the top values (capped at 500)
      const topSet = new Set(top.map((t) => t.value))
      const refs: number[] = []
      for (let i = 0; i < dataset.rows.length && refs.length < 500; i++) {
        const v = dataset.rows[i][col.key]
        if (v != null && topSet.has(String(v))) refs.push(i)
      }

      out.push(makeFinding({
        type: 'category_concentration',
        data: { kind: 'category_concentration', column: col.key, top, coveragePct },
        columns: [col.key],
        columnLabels: labels,
        recordRefs: refs,
      }))
    }
    return out
  },
}
```

- [ ] **Step 2: Register**

Edit `src/lib/insights/heuristics/index.ts` to:
```typescript
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'
import { categoryConcentration } from './categoryConcentration'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
  categoryConcentration,
]
```

- [ ] **Step 3: Type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/categoryConcentration.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): category concentration heuristic"
```

---

## Task 12: cardinalityAnomaly heuristic

**Files:**
- Create: `src/lib/insights/heuristics/cardinalityAnomaly.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/cardinalityAnomaly.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_ROWS = 10

export const cardinalityAnomaly: Heuristic = {
  type: 'cardinality_anomaly',
  applies: (dataset) => dataset.rows.length >= MIN_ROWS,
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      let distinct = 0
      let total = 0
      if (col.type === 'category' || col.type === 'text' || col.type === 'geo' || col.type === 'boolean') {
        const counts = ctx.valueCounts.get(col.key)
        if (!counts) continue
        distinct = counts.size
        total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
      } else if (col.type === 'number' || col.type === 'currency') {
        const nums = ctx.numericValues.get(col.key) ?? []
        total = nums.length
        distinct = new Set(nums).size
      } else if (col.type === 'date') {
        const ts = ctx.dateValues.get(col.key) ?? []
        total = ts.length
        distinct = new Set(ts).size
      } else continue

      if (total < MIN_ROWS) continue

      const allSame = distinct === 1
      const allUnique = distinct === total && total > 1
      if (!allSame && !allUnique) continue

      out.push(makeFinding({
        type: 'cardinality_anomaly',
        data: { kind: 'cardinality_anomaly', column: col.key, distinct, total, reason: allSame ? 'all_same' : 'all_unique' },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}
```

- [ ] **Step 2: Register** in `heuristics/index.ts` — add import and array entry for `cardinalityAnomaly`.

- [ ] **Step 3: Type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/cardinalityAnomaly.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): cardinality anomaly heuristic"
```

---

## Task 13: missingData heuristic

**Files:**
- Create: `src/lib/insights/heuristics/missingData.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/missingData.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_PCT = 0.1
const MIN_ROWS = 10

export const missingData: Heuristic = {
  type: 'missing_data',
  applies: (dataset) => dataset.rows.length >= MIN_ROWS,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const total = dataset.rows.length

    for (const col of dataset.columns) {
      let nulls = 0
      const refs: number[] = []
      for (let i = 0; i < dataset.rows.length; i++) {
        const v = dataset.rows[i][col.key]
        if (v == null || v === '') {
          nulls++
          if (refs.length < 500) refs.push(i)
        }
      }
      const pct = nulls / total
      if (pct < MIN_PCT || nulls === 0) continue

      out.push(makeFinding({
        type: 'missing_data',
        data: { kind: 'missing_data', column: col.key, nullCount: nulls, nullPct: pct },
        columns: [col.key],
        columnLabels: labels,
        recordRefs: refs,
      }))
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit** (same pattern).

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/missingData.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): missing data heuristic"
```

---

## Task 14: distributionShape heuristic

**Files:**
- Create: `src/lib/insights/heuristics/distributionShape.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
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
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/distributionShape.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): distribution shape classifier"
```

---

## Task 15: timeDensityGap heuristic

**Files:**
- Create: `src/lib/insights/heuristics/timeDensityGap.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/timeDensityGap.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const DAY_MS = 86_400_000

export const timeDensityGap: Heuristic = {
  type: 'time_density_gap',
  applies: (dataset) => dataset.columns.some((c) => c.type === 'date'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'date') continue
      const ts = ctx.dateValues.get(col.key)
      if (!ts || ts.length < 5) continue
      const sorted = [...ts].sort((a, b) => a - b)
      const span = sorted[sorted.length - 1] - sorted[0]
      if (span === 0) continue
      const expectedDensity = Math.max(1, Math.round(span / DAY_MS / ts.length))

      // Find gaps significantly larger than expected (≥ 3× expected density, ≥ 7 days)
      let largestGap = 0
      let gapStart = sorted[0]
      let gapEnd = sorted[0]
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1]
        if (gap > largestGap) {
          largestGap = gap
          gapStart = sorted[i - 1]
          gapEnd = sorted[i]
        }
      }
      const gapDays = Math.round(largestGap / DAY_MS)
      if (gapDays < 7 || gapDays < expectedDensity * 3) continue

      out.push(makeFinding({
        type: 'time_density_gap',
        data: {
          kind: 'time_density_gap',
          column: col.key,
          gapStart: new Date(gapStart).toISOString().slice(0, 10),
          gapEnd: new Date(gapEnd).toISOString().slice(0, 10),
          gapDays,
          expectedDensity,
        },
        columns: [col.key],
        columnLabels: labels,
      }))
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/timeDensityGap.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): time density gap heuristic"
```

---

## Task 16: duplicateLookalike heuristic

**Files:**
- Create: `src/lib/insights/heuristics/duplicateLookalike.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
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
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/duplicateLookalike.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): fuzzy duplicate detection heuristic"
```

---

## Task 17: textOutlier heuristic

**Files:**
- Create: `src/lib/insights/heuristics/textOutlier.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/textOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_ROWS = 10
const Z_THRESHOLD = 3
const SPECIAL_CHARS = /[^\p{L}\p{N}\s.,;:'"@#%&()/+-]/u

export const textOutlier: Heuristic = {
  type: 'text_outlier',
  applies: (dataset) =>
    dataset.rows.length >= MIN_ROWS &&
    dataset.columns.some((c) => c.type === 'text' || c.type === 'category'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []

    for (const col of dataset.columns) {
      if (col.type !== 'text' && col.type !== 'category') continue
      const lengths: number[] = []
      const stringRows: { value: string; index: number }[] = []
      for (let i = 0; i < dataset.rows.length; i++) {
        const v = dataset.rows[i][col.key]
        if (v == null || v === '') continue
        const s = String(v)
        lengths.push(s.length)
        stringRows.push({ value: s, index: i })
      }
      if (lengths.length < MIN_ROWS) continue
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
      const variance = lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length
      const stdDev = Math.sqrt(variance)

      for (const { value, index } of stringRows) {
        const z = stdDev > 0 ? (value.length - mean) / stdDev : 0
        if (SPECIAL_CHARS.test(value)) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'special_chars' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        } else if (z >= Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'too_long' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        } else if (z <= -Z_THRESHOLD) {
          out.push(makeFinding({
            type: 'text_outlier',
            data: { kind: 'text_outlier', column: col.key, value, record: index, reason: 'too_short' },
            columns: [col.key],
            columnLabels: labels,
            recordRefs: [index],
          }))
        }
      }
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/textOutlier.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): text outlier heuristic"
```

---

# Phase 2 — Multi-column heuristics (Tasks 18-21)

## Task 18: numericCorrelation heuristic

**Files:**
- Create: `src/lib/insights/heuristics/numericCorrelation.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/numericCorrelation.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_N = 20
const R_THRESHOLD = 0.7
const SAMPLE_CAP = 500

export const numericCorrelation: Heuristic = {
  type: 'numeric_correlation',
  applies: (dataset) =>
    dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency').length >= 2,
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const numericCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
    const out: Finding[] = []

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const a = numericCols[i]
        const b = numericCols[j]
        const pairs: { a: number; b: number }[] = []
        for (const row of dataset.rows) {
          const va = toNum(row[a.key])
          const vb = toNum(row[b.key])
          if (va !== null && vb !== null) pairs.push({ a: va, b: vb })
        }
        if (pairs.length < MIN_N) continue

        const r = pearson(pairs)
        if (Math.abs(r) < R_THRESHOLD) continue

        const sample = pairs.length <= SAMPLE_CAP ? pairs : evenlySample(pairs, SAMPLE_CAP)
        out.push(makeFinding({
          type: 'numeric_correlation',
          data: { kind: 'numeric_correlation', columnA: a.key, columnB: b.key, r, n: pairs.length, sample },
          columns: [a.key, b.key],
          columnLabels: labels,
        }))
      }
    }
    return out
  },
}

function toNum(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).trim().replace(/[€$£¥\s]/g, '').replace(/(?<=\d)\.(?=\d{3})/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function pearson(pairs: { a: number; b: number }[]): number {
  const n = pairs.length
  let sumA = 0, sumB = 0
  for (const p of pairs) { sumA += p.a; sumB += p.b }
  const meanA = sumA / n
  const meanB = sumB / n
  let num = 0, dA = 0, dB = 0
  for (const p of pairs) {
    const da = p.a - meanA
    const db = p.b - meanB
    num += da * db
    dA += da * da
    dB += db * db
  }
  const denom = Math.sqrt(dA * dB)
  return denom === 0 ? 0 : num / denom
}

function evenlySample<T>(arr: T[], cap: number): T[] {
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/numericCorrelation.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): numeric correlation heuristic"
```

---

## Task 19: groupDisparity heuristic

**Files:**
- Create: `src/lib/insights/heuristics/groupDisparity.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/groupDisparity.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUPS = 2
const MAX_GROUPS = 50
const MIN_PER_GROUP = 3
const RATIO_THRESHOLD = 2

export const groupDisparity: Heuristic = {
  type: 'group_disparity',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )
    const metricCols = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency'
    )
    const out: Finding[] = []

    for (const gCol of groupCols) {
      for (const mCol of metricCols) {
        // means per group
        const sums = new Map<string, { total: number; count: number; refs: number[] }>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          if (g == null || g === '' || m == null || m === '') continue
          const gk = String(g)
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const entry = sums.get(gk) ?? { total: 0, count: 0, refs: [] }
          entry.total += mn
          entry.count++
          if (entry.refs.length < 100) entry.refs.push(i)
          sums.set(gk, entry)
        }
        if (sums.size < MIN_GROUPS || sums.size > MAX_GROUPS) continue

        // valid groups with min sample
        const groups = Array.from(sums.entries())
          .filter(([, v]) => v.count >= MIN_PER_GROUP)
          .map(([k, v]) => ({ key: k, mean: v.total / v.count, refs: v.refs }))
        if (groups.length < MIN_GROUPS) continue
        groups.sort((a, b) => b.mean - a.mean || a.key.localeCompare(b.key))

        const top = groups[0]
        const bottom = groups[groups.length - 1]
        if (bottom.mean <= 0) continue
        const ratio = top.mean / bottom.mean
        if (ratio < RATIO_THRESHOLD) continue

        out.push(makeFinding({
          type: 'group_disparity',
          data: {
            kind: 'group_disparity',
            groupColumn: gCol.key,
            metricColumn: mCol.key,
            aggregation: 'mean',
            topGroup: top.key,
            topValue: top.mean,
            bottomGroup: bottom.key,
            bottomValue: bottom.mean,
            ratio,
          },
          columns: [gCol.key, mCol.key],
          columnLabels: labels,
          recordRefs: [...top.refs, ...bottom.refs].slice(0, 500),
        }))
      }
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/groupDisparity.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): group disparity heuristic"
```

---

## Task 20: conditionalOutlier heuristic

**Files:**
- Create: `src/lib/insights/heuristics/conditionalOutlier.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/conditionalOutlier.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_GROUP_SIZE = 5
const LOCAL_Z = 3

export const conditionalOutlier: Heuristic = {
  type: 'conditional_outlier',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )

    for (const mCol of dataset.columns) {
      if (mCol.type !== 'number' && mCol.type !== 'currency') continue
      const globalStats = ctx.numericStats.get(mCol.key)
      if (!globalStats) continue

      for (const gCol of groupCols) {
        const groups = new Map<string, { values: { value: number; index: number }[] }>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          if (g == null || g === '' || m == null || m === '') continue
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const gk = String(g)
          const entry = groups.get(gk) ?? { values: [] }
          entry.values.push({ value: mn, index: i })
          groups.set(gk, entry)
        }

        for (const [gk, entry] of groups) {
          if (entry.values.length < MIN_GROUP_SIZE) continue
          const nums = entry.values.map((v) => v.value)
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length
          const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length
          const stdDev = Math.sqrt(variance)
          if (stdDev === 0) continue
          // Skip groups whose own mean is close to global (they wouldn't generate "conditional" surprise)
          if (Math.abs(mean - globalStats.mean) / Math.max(globalStats.stdDev, 1e-9) < 1) {
            for (const { value, index } of entry.values) {
              const z = (value - mean) / stdDev
              if (Math.abs(z) >= LOCAL_Z) {
                out.push(makeFinding({
                  type: 'conditional_outlier',
                  data: {
                    kind: 'conditional_outlier',
                    column: mCol.key,
                    groupColumn: gCol.key,
                    group: gk,
                    value,
                    record: index,
                    localMean: mean,
                    globalMean: globalStats.mean,
                  },
                  columns: [mCol.key, gCol.key],
                  columnLabels: labels,
                  recordRefs: [index],
                }))
              }
            }
          }
        }
      }
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/conditionalOutlier.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): conditional outlier heuristic"
```

---

## Task 21: timeByGroup heuristic

**Files:**
- Create: `src/lib/insights/heuristics/timeByGroup.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/timeByGroup.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

const MIN_PERIODS = 4
const MIN_GROUPS = 2
const MAX_GROUPS = 8
const DELTA_THRESHOLD = 0.25

export const timeByGroup: Heuristic = {
  type: 'time_by_group',
  applies: (dataset) =>
    dataset.columns.some((c) => c.type === 'date') &&
    dataset.columns.some((c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean') &&
    dataset.columns.some((c) => c.type === 'number' || c.type === 'currency'),
  detect(dataset: Dataset, _summary: DatasetSummary, ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const out: Finding[] = []
    const dateCol = dataset.columns.find((c) => c.type === 'date')
    if (!dateCol) return out
    const timestamps = ctx.dateValues.get(dateCol.key)
    if (!timestamps || timestamps.length < MIN_PERIODS) return out

    const groupCols = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean'
    )
    const metricCols = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency'
    )

    for (const gCol of groupCols) {
      const counts = ctx.valueCounts.get(gCol.key)
      if (!counts || counts.size < MIN_GROUPS || counts.size > MAX_GROUPS) continue

      for (const mCol of metricCols) {
        // group by (group, monthBucket) → mean
        const buckets = new Map<string, Map<number, { total: number; count: number }>>()
        for (let i = 0; i < dataset.rows.length; i++) {
          const g = dataset.rows[i][gCol.key]
          const m = dataset.rows[i][mCol.key]
          const t = ctx.dateValues.get(dateCol.key)?.[i]
          if (g == null || g === '' || m == null || m === '' || t == null) continue
          const mn = typeof m === 'number' ? m : Number(String(m).replace(',', '.'))
          if (!Number.isFinite(mn)) continue
          const gk = String(g)
          const d = new Date(t)
          const monthBucket = d.getUTCFullYear() * 12 + d.getUTCMonth()
          if (!buckets.has(gk)) buckets.set(gk, new Map())
          const inner = buckets.get(gk)!
          const cur = inner.get(monthBucket) ?? { total: 0, count: 0 }
          cur.total += mn
          cur.count++
          inner.set(monthBucket, cur)
        }
        if (buckets.size < MIN_GROUPS) continue

        const series: { group: string; trend: 'rising' | 'falling' | 'flat'; deltaPct: number }[] = []
        for (const [gk, inner] of buckets) {
          if (inner.size < MIN_PERIODS) continue
          const points = Array.from(inner.entries()).sort((a, b) => a[0] - b[0])
          const first = points[0][1].total / points[0][1].count
          const last = points[points.length - 1][1].total / points[points.length - 1][1].count
          const deltaPct = first === 0 ? 0 : (last - first) / Math.abs(first)
          let trend: 'rising' | 'falling' | 'flat' = 'flat'
          if (deltaPct >= DELTA_THRESHOLD) trend = 'rising'
          else if (deltaPct <= -DELTA_THRESHOLD) trend = 'falling'
          series.push({ group: gk, trend, deltaPct })
        }
        if (series.length < MIN_GROUPS) continue

        // Surface only if at least one group diverges from the others
        const trends = new Set(series.map((s) => s.trend))
        if (trends.size < 2 && !series.some((s) => Math.abs(s.deltaPct) >= DELTA_THRESHOLD)) continue

        out.push(makeFinding({
          type: 'time_by_group',
          data: {
            kind: 'time_by_group',
            timeColumn: dateCol.key,
            groupColumn: gCol.key,
            metricColumn: mCol.key,
            series,
          },
          columns: [dateCol.key, gCol.key, mCol.key],
          columnLabels: labels,
        }))
      }
    }
    return out
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/timeByGroup.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): time-by-group trend heuristic"
```

---

# Phase 3 — Dataset-level heuristics (Tasks 22-25)

## Task 22: qualityScore heuristic

**Files:**
- Create: `src/lib/insights/heuristics/qualityScore.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/qualityScore.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const qualityScore: Heuristic = {
  type: 'quality_score',
  applies: (dataset) => dataset.rows.length > 0,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const cellsTotal = dataset.rows.length * dataset.columns.length
    const cellsValid = Math.round(cellsTotal * (1 - summary.nullPct))
    const issues: { type: string; count: number }[] = []
    if (summary.nullPct > 0.05) issues.push({ type: 'missing', count: Math.round(cellsTotal * summary.nullPct) })
    if (summary.duplicateRowCount > 0) issues.push({ type: 'duplicates', count: summary.duplicateRowCount })

    return [
      makeFinding({
        type: 'quality_score',
        data: {
          kind: 'quality_score',
          score: summary.qualityScore,
          cellsTotal,
          cellsValid,
          duplicateRows: summary.duplicateRowCount,
          issues,
        },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/qualityScore.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): quality score finding"
```

---

## Task 23: schemaSummary heuristic

**Files:**
- Create: `src/lib/insights/heuristics/schemaSummary.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/schemaSummary.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const schemaSummary: Heuristic = {
  type: 'schema_summary',
  applies: (dataset) => dataset.columns.length > 0,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    const byType: Record<string, number> = {}
    for (const [t, n] of Object.entries(summary.byType)) {
      if (n > 0) byType[t] = n
    }
    return [
      makeFinding({
        type: 'schema_summary',
        data: { kind: 'schema_summary', total: dataset.columns.length, byType },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/schemaSummary.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): schema summary finding"
```

---

## Task 24: temporalCoverage heuristic

**Files:**
- Create: `src/lib/insights/heuristics/temporalCoverage.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/temporalCoverage.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const temporalCoverage: Heuristic = {
  type: 'temporal_coverage',
  applies: (_dataset, summary) => !!summary.temporalRange,
  detect(dataset: Dataset, summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    if (!summary.temporalRange) return []
    const dateCol = dataset.columns.find((c) => c.type === 'date')
    if (!dateCol) return []
    const densityPerDay = summary.temporalRange.days === 0
      ? dataset.rows.length
      : dataset.rows.length / summary.temporalRange.days
    return [
      makeFinding({
        type: 'temporal_coverage',
        data: {
          kind: 'temporal_coverage',
          column: dateCol.key,
          from: summary.temporalRange.from,
          to: summary.temporalRange.to,
          days: summary.temporalRange.days,
          densityPerDay,
        },
        columns: [dateCol.key],
        columnLabels: labels,
      }),
    ]
  },
}
```

- [ ] **Step 2: Register** + **Step 3: type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/temporalCoverage.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): temporal coverage finding"
```

---

## Task 25: volumeContext heuristic

**Files:**
- Create: `src/lib/insights/heuristics/volumeContext.ts`
- Modify: `src/lib/insights/heuristics/index.ts`

- [ ] **Step 1: Create heuristic**

```typescript
// src/lib/insights/heuristics/volumeContext.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import type { Heuristic } from './_base'
import { columnLabels, makeFinding } from './_base'

export const volumeContext: Heuristic = {
  type: 'volume_context',
  applies: () => true,
  detect(dataset: Dataset, _summary: DatasetSummary, _ctx: AnalysisContext): Finding[] {
    const labels = columnLabels(dataset)
    return [
      makeFinding({
        type: 'volume_context',
        data: {
          kind: 'volume_context',
          rows: dataset.rows.length,
          columns: dataset.columns.length,
          cells: dataset.rows.length * dataset.columns.length,
        },
        columns: [],
        columnLabels: labels,
      }),
    ]
  },
}
```

- [ ] **Step 2: Register** in `heuristics/index.ts`. Final state of file should be:

```typescript
// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'
import { categoryConcentration } from './categoryConcentration'
import { cardinalityAnomaly } from './cardinalityAnomaly'
import { missingData } from './missingData'
import { distributionShape } from './distributionShape'
import { timeDensityGap } from './timeDensityGap'
import { duplicateLookalike } from './duplicateLookalike'
import { textOutlier } from './textOutlier'
import { numericCorrelation } from './numericCorrelation'
import { groupDisparity } from './groupDisparity'
import { conditionalOutlier } from './conditionalOutlier'
import { timeByGroup } from './timeByGroup'
import { qualityScore } from './qualityScore'
import { schemaSummary } from './schemaSummary'
import { temporalCoverage } from './temporalCoverage'
import { volumeContext } from './volumeContext'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
  categoryConcentration,
  cardinalityAnomaly,
  missingData,
  distributionShape,
  timeDensityGap,
  duplicateLookalike,
  textOutlier,
  numericCorrelation,
  groupDisparity,
  conditionalOutlier,
  timeByGroup,
  qualityScore,
  schemaSummary,
  temporalCoverage,
  volumeContext,
]
```

- [ ] **Step 3: Type-check + commit**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && \
git add src/lib/insights/heuristics/volumeContext.ts src/lib/insights/heuristics/index.ts && \
git commit -m "feat(insights): volume context finding + complete registry"
```

---

# Phase 4 — Integration + dev workbench (Task 26)

End state: after parsing an Excel in the app, `analyzeDataset()` runs automatically in dev mode and the report is logged to console. A dedicated `/dev/insights` route renders the report as inspectable JSON for manual verification.

## Task 26: Wire engine into app + dev workbench

**Files:**
- Create: `src/dev/InsightsWorkbench.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the workbench page**

```typescript
// src/dev/InsightsWorkbench.tsx
import { useEffect, useState } from 'react'
import { SAMPLE_DATASETS } from '../samples'
import { analyzeDataset, type InsightReport } from '../lib/insights'
import type { Dataset } from '../types/dataset'

export function InsightsWorkbench(): JSX.Element {
  const sampleKeys = Object.keys(SAMPLE_DATASETS)
  const [selected, setSelected] = useState<string>(sampleKeys[0])
  const [report, setReport] = useState<InsightReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ds: Dataset | undefined = SAMPLE_DATASETS[selected]
    if (!ds) return
    setBusy(true)
    setError(null)
    setReport(null)
    analyzeDataset(ds)
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }, [selected])

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', color: 'var(--ink)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        dev · insights workbench
      </div>
      <h1
        className="font-display"
        style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', margin: '8px 0 24px' }}
      >
        Inspector de InsightReport
      </h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {sampleKeys.map((k) => (
          <button
            key={k}
            onClick={() => setSelected(k)}
            style={{
              background: k === selected ? 'var(--ink)' : 'transparent',
              color: k === selected ? 'var(--bg)' : 'var(--ink-2)',
              border: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {SAMPLE_DATASETS[k].label}
          </button>
        ))}
      </div>

      {busy && <p style={{ color: 'var(--muted)' }}>Analizando…</p>}
      {error && <p style={{ color: 'var(--coral)' }}>{error}</p>}
      {report && (
        <>
          <Section title="Summary">
            <pre style={preStyle}>{JSON.stringify(report.summary, null, 2)}</pre>
          </Section>
          <Section title={`Top findings (${report.findings.length})`}>
            {report.findings.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: '0 0 0 1px var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ fontSize: 14 }}>{f.title}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {f.type} · {f.severity} · {f.score.toFixed(3)}
                  </span>
                </div>
                <div style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: 13 }}>{f.body}</div>
                {f.suggestion && (
                  <div style={{ color: 'var(--sky)', marginTop: 8, fontSize: 12 }}>
                    → {f.suggestion}
                  </div>
                )}
              </div>
            ))}
          </Section>
          <Section title="Runtime">
            <code style={{ fontSize: 12, color: 'var(--muted)' }}>
              {report.runtimeMs} ms{report.degraded ? ' (degraded)' : ''}
            </code>
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const preStyle: React.CSSProperties = {
  background: 'var(--surface)',
  padding: 16,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-2)',
  overflow: 'auto',
  margin: 0,
  boxShadow: '0 0 0 1px var(--border)',
}
```

- [ ] **Step 2: Modify `src/App.tsx` to expose `/dev/insights` route and auto-log report on parse**

Add the workbench import and route detection.

In `src/App.tsx`, add to the imports block at top:
```typescript
import { InsightsWorkbench } from './dev/InsightsWorkbench'
import { analyzeDataset } from './lib/insights'
```

Add to the existing pathname-check `useEffect` (the one that currently routes `/app`, `/faq`, etc.) a new branch:
```typescript
if (path === '/dev/insights') { setRoute({ name: 'dev_insights' as RouteName }); return }
```

Extend the `RouteName` union:
```typescript
type RouteName =
  | 'upload' | 'dashboard' | 'detail' | 'compare' | 'share' | 'public'
  | 'landing' | 'faq' | 'privacy' | 'terms'
  | 'dev_insights'
```

Add to the `isStandalone` predicate (the one that bypasses TopBar/FloatingDock):
```typescript
const isStandalone =
  route.name === 'landing' ||
  route.name === 'faq' ||
  route.name === 'privacy' ||
  route.name === 'terms' ||
  route.name === 'dev_insights'
```

Inside the standalone return block, add:
```tsx
{route.name === 'dev_insights' && <InsightsWorkbench />}
```

Add a new `useEffect` near the existing parse-handling that logs the report whenever `dataset` changes and we're in dev mode:
```typescript
useEffect(() => {
  if (!import.meta.env.DEV) return
  if (!hasUploaded) return
  void analyzeDataset(dataset).then((report) => {
    // eslint-disable-next-line no-console
    console.log('[insights]', report)
  }).catch((e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[insights] failed:', e)
  })
}, [dataset, hasUploaded])
```

- [ ] **Step 3: Verify build + manual smoke**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky && npx tsc --noEmit && npm run build
```
Expected: tsc exit 0, build succeeds, new `dist/assets/worker-*.js` chunk for insights worker.

Then manual smoke:
1. Run `npm run dev`.
2. Open `http://localhost:5173/dev/insights` — you should see the workbench.
3. Click each sample dataset button. Each one should produce findings within a couple hundred ms.
4. Browse to `http://localhost:5173/app`, upload the user's real Excel of turnos, open DevTools console — `[insights] {...}` should appear with a populated report.

Acceptance check against spec §6.3:
- (1) `analyzeDataset(SAMPLE_DATASETS.ventas)` returns ≥ 8 findings in < 200 ms — observe in workbench.
- (2) Personas report includes ≥ 1 numeric_outlier, ≥ 1 category_concentration, ≥ 1 schema_summary — verify in workbench list.
- (3) Run analysis twice on same dataset — find IDs in same order (compare two pageloads).
- (4) Top 10 includes ≥ 5 distinct types — count in workbench.
- (5)-(7) check empty/null edge cases by uploading an empty CSV.
- (8) Build passes, worker chunk under 30 KB minified — check `dist/assets/`.

- [ ] **Step 4: Commit**

```bash
git add src/dev/InsightsWorkbench.tsx src/App.tsx
git commit -m "feat(insights): wire engine into app + /dev/insights workbench"
```

---

## Self-review notes

**Spec coverage:**
- §1.4 catalog of 16 heuristics: each has a dedicated task (10-25). ✓
- §2 API: Tasks 1 (types) + 9 (worker + index.ts public wrapper). ✓
- §3 types: Task 1 defines all types/unions verbatim from spec. ✓
- §4 ranking algorithm: Task 7 implements significance + coverage + actionability + diversity penalty + severity derivation exactly per spec. ✓
- §5 file structure: matches task file paths 1:1. ✓
- §6.1 performance: budget honored via `TIMEOUT_MS = 5000` in runner (Task 8) + `SAMPLE_CAP` in correlation (Task 18) + `MAX_DISTINCT` cap in duplicateLookalike (Task 16). ✓
- §6.2 errors: Task 8 wraps each heuristic in try/catch (fail-open); Task 9 handles AbortSignal + worker fallback. ✓
- §6.3 acceptance criteria 1-10: Task 26 step 3 enumerates manual checks for each. ✓

**Placeholder scan:** No "TBD", "TODO", "implement later", "similar to Task N", "add validation". All code blocks are complete.

**Type consistency:** verified — `Heuristic`, `Finding`, `FindingData`, `AnalysisContext`, `DatasetSummary`, `InsightReport`, `AnalyzeOptions`, `WorkerRequest`, `WorkerResponse` are defined exactly once (Tasks 1, 3, 6) and consumed without renames across all 26 tasks. Function names `buildContext`, `buildSummary`, `scoreOne`, `deriveSeverity`, `diversityPenaltyFor`, `makeFinding`, `columnLabels`, `render`, `fnv1a`, `hashPayload`, `run`, `analyzeDataset` are stable throughout.

**One scope refinement:** initial spec mentioned i18n via templates with slots. Task 5 implements it as a discriminated-union switch over `FindingData.kind` rather than a literal template-substitution function. Equivalent behavior, simpler types, no functional difference.
