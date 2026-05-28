import { useMemo } from 'react'
import type { CellValue, Dataset } from '../types/dataset'
import type { SceneChart as SceneChartHint } from '../lib/story/types'
import { ChartBar, type Bar } from './ChartBar'
import { ChartLine } from './ChartLine'
import { ChartScatter } from './ChartScatter'
import { ChartBoxPlot } from './ChartBoxPlot'
import { ChartDensity } from './ChartDensity'
import { ChartHeatmap } from './ChartHeatmap'
import { ChartStackedBar, type StackedGroup } from './ChartStackedBar'
import { ChartEmptyState } from './ChartEmptyState'

/**
 * Materialise a Scene's chart hint into the actual chart component
 * (sub-project #3/#4 polish). Every scene the composer emits carries a
 * `{ kind, columns }` hint; this component reads the kind, walks the
 * dataset to derive the right shape (top categories, time-aggregated
 * series, finite pairs, etc.) and mounts the matching SVG primitive.
 *
 * Aggregation cost is memoised per (dataset, hint). Stories with a dozen
 * scenes mount a dozen charts on the same dataset — each computation is
 * bounded to its scene's columns so the runtime stays small.
 */

interface SceneChartProps {
  dataset: Dataset
  hint: SceneChartHint
}

const TOP_N = 8
const SCATTER_CAP = 600

function toNum(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number(
    String(raw)
      .trim()
      .replace(/[€$£¥\s]/g, '')
      .replace(/(?<=\d)\.(?=\d{3})/g, '')
      .replace(',', '.'),
  )
  return Number.isFinite(n) ? n : null
}

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/
function parseDate(raw: unknown): number | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const s = String(raw).trim()
  if (!s) return null
  let m = DATE_DMY.exec(s)
  if (m) {
    const t = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))).getTime()
    return Number.isNaN(t) ? null : t
  }
  m = DATE_ISO.exec(s)
  if (m) {
    const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getTime()
    return Number.isNaN(t) ? null : t
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function labelOf(dataset: Dataset, key: string): string {
  return dataset.columns.find((c) => c.key === key)?.label ?? key
}

function columnType(dataset: Dataset, key: string): string | null {
  return dataset.columns.find((c) => c.key === key)?.type ?? null
}

function evenlySample<T>(arr: ReadonlyArray<T>, cap: number): T[] {
  if (arr.length <= cap) return arr.slice()
  const step = arr.length / cap
  const out: T[] = []
  for (let i = 0; i < cap; i++) out.push(arr[Math.floor(i * step)])
  return out
}

export function SceneChart({ dataset, hint }: SceneChartProps): JSX.Element {
  const node = useMemo(() => buildChart(dataset, hint), [dataset, hint])
  return node
}

function buildChart(dataset: Dataset, hint: SceneChartHint): JSX.Element {
  const cols = hint.columns
  switch (hint.kind) {
    case 'bar': {
      // Two flavours: single-column → top value counts; two-column
      // (groupCol, metricCol) → mean of metric per top group.
      if (cols.length >= 2) {
        const [groupKey, metricKey] = cols
        const buckets = new Map<string, number[]>()
        for (const row of dataset.rows) {
          const g = row[groupKey]
          if (g == null || g === '') continue
          const v = toNum(row[metricKey])
          if (v === null) continue
          const k = String(g)
          if (!buckets.has(k)) buckets.set(k, [])
          buckets.get(k)!.push(v)
        }
        const bars: Bar[] = Array.from(buckets.entries())
          .map(([label, values]) => ({
            label,
            value: values.reduce((s, v) => s + v, 0) / values.length,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, TOP_N)
        if (bars.length === 0) return <ChartEmptyState kind="bar" height={220} />
        return (
          <ChartBar
            bars={bars}
            orientation="horizontal"
            ariaLabel={`Media de ${labelOf(dataset, metricKey)} por ${labelOf(dataset, groupKey)}`}
          />
        )
      }
      const counts = new Map<string, number>()
      for (const row of dataset.rows) {
        const v = row[cols[0]]
        if (v == null || v === '') continue
        const k = String(v)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      const bars: Bar[] = Array.from(counts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_N)
      if (bars.length === 0) return <ChartEmptyState kind="bar" height={220} />
      return (
        <ChartBar
          bars={bars}
          orientation="horizontal"
          ariaLabel={`Top ${bars.length} valores de ${labelOf(dataset, cols[0])}`}
        />
      )
    }

    case 'line': {
      if (cols.length < 2) return <ChartEmptyState kind="line" height={200} />
      const [timeKey, metricKey] = cols
      const points: { x: number; v: number }[] = []
      for (const row of dataset.rows) {
        const t = parseDate(row[timeKey])
        if (t === null) continue
        const v = toNum(row[metricKey])
        if (v === null) continue
        points.push({ x: t, v })
      }
      if (points.length < 2) return <ChartEmptyState kind="line" height={200} />
      points.sort((a, b) => a.x - b.x)
      // Bucket per month so the line reads cleanly even on wide datasets.
      const byMonth = new Map<string, number[]>()
      for (const p of points) {
        const d = new Date(p.x)
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        if (!byMonth.has(key)) byMonth.set(key, [])
        byMonth.get(key)!.push(p.v)
      }
      const linePoints = Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, values]) => ({
          x: month,
          y: values.reduce((s, v) => s + v, 0) / values.length,
        }))
      return (
        <ChartLine
          points={linePoints}
          ariaLabel={`${labelOf(dataset, metricKey)} en el tiempo`}
          trendline
        />
      )
    }

    case 'scatter': {
      if (cols.length < 2) return <ChartEmptyState kind="scatter" height={280} />
      const [aKey, bKey] = cols
      const pairs: { x: number; y: number }[] = []
      for (const row of dataset.rows) {
        const a = toNum(row[aKey])
        const b = toNum(row[bKey])
        if (a === null || b === null) continue
        pairs.push({ x: a, y: b })
      }
      if (pairs.length < 4) return <ChartEmptyState kind="scatter" height={280} />
      const sample = evenlySample(pairs, SCATTER_CAP)
      return (
        <ChartScatter
          points={sample}
          xLabel={labelOf(dataset, aKey)}
          yLabel={labelOf(dataset, bKey)}
          regression
        />
      )
    }

    case 'box': {
      if (cols.length < 1) return <ChartEmptyState kind="box" height={140} />
      const values: number[] = []
      for (const row of dataset.rows) {
        const v = toNum(row[cols[0]])
        if (v !== null) values.push(v)
      }
      if (values.length < 4) return <ChartEmptyState kind="box" height={140} />
      return (
        <ChartBoxPlot values={values} ariaLabel={`Distribución de ${labelOf(dataset, cols[0])}`} />
      )
    }

    case 'density': {
      if (cols.length < 1) return <ChartEmptyState kind="density" height={200} />
      const values: number[] = []
      for (const row of dataset.rows) {
        const v = toNum(row[cols[0]])
        if (v !== null) values.push(v)
      }
      if (values.length < 4) return <ChartEmptyState kind="density" height={200} />
      return <ChartDensity values={values} ariaLabel={`Densidad de ${labelOf(dataset, cols[0])}`} />
    }

    case 'heatmap': {
      const numericKeys = cols.filter((k) => {
        const t = columnType(dataset, k)
        return t === 'number' || t === 'currency'
      })
      if (numericKeys.length < 2) return <ChartEmptyState kind="heatmap" height={240} />
      const series = numericKeys.map((k) =>
        dataset.rows.map((row) => toNum(row[k])).filter((v): v is number => v !== null),
      )
      const minLen = Math.min(...series.map((s) => s.length))
      if (minLen < 4) return <ChartEmptyState kind="heatmap" height={240} />
      const truncated = series.map((s) => s.slice(0, minLen))
      return (
        <ChartHeatmap
          columns={numericKeys.map((k) => labelOf(dataset, k))}
          series={truncated}
          cellSize={40}
        />
      )
    }

    case 'stacked': {
      if (cols.length < 2) return <ChartEmptyState kind="stacked" height={260} />
      const [groupKey, segmentKey] = cols
      const groups = new Map<string, Map<string, number>>()
      for (const row of dataset.rows) {
        const g = row[groupKey]
        const s = row[segmentKey]
        if (g == null || s == null) continue
        const gk = String(g)
        const sk = String(s)
        if (!groups.has(gk)) groups.set(gk, new Map())
        const inner = groups.get(gk)!
        inner.set(sk, (inner.get(sk) ?? 0) + 1)
      }
      const built: StackedGroup[] = Array.from(groups.entries())
        .map(([label, segMap]) => ({
          label,
          segments: Array.from(segMap.entries()).map(([key, value]) => ({ key, value })),
        }))
        .sort((a, b) => sumSegments(b.segments) - sumSegments(a.segments))
        .slice(0, TOP_N)
      if (built.length === 0) return <ChartEmptyState kind="stacked" height={260} />
      return <ChartStackedBar groups={built} normalize />
    }

    case 'stat':
    default:
      // 'stat' is the intro/closing placeholder slot. The Scene text already
      // surfaces the headline numbers; render nothing here so the scene
      // stays type-prose.
      return <></>
  }
}

function sumSegments(segments: ReadonlyArray<{ value: number }>): number {
  let s = 0
  for (const seg of segments) s += seg.value
  return s
}

/** Stable handler — defined outside the component to satisfy lint rules. */
function _cellEq(_a: CellValue, _b: CellValue): boolean {
  return _a === _b
}
void _cellEq
