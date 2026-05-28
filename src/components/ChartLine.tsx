import type { Accent } from '../types/dataset'
import { ChartEmptyState } from './ChartEmptyState'

export interface LinePoint {
  x: number | string
  y: number
}

interface ChartLineProps {
  points: LinePoint[]
  accent?: Accent
  height?: number
  /** Show x-axis labels under the chart. */
  showLabels?: boolean
  /** Accessible description. If omitted, one is derived from the data. */
  ariaLabel?: string
  /** Overlay a linear-regression trend line (#66). */
  trendline?: boolean
  /** Render the Y axis on a log scale (#77). Falls back to linear when any y ≤ 0. */
  logScale?: boolean
  /** Free-form annotations pinned to data points (#78). */
  annotations?: ReadonlyArray<LineAnnotation>
}

export interface LineAnnotation {
  /** Index into points[] to anchor the marker. */
  pointIndex: number
  /** Short label shown next to the marker. */
  text: string
  /** Text placement relative to the marker. Defaults to 'above'. */
  placement?: 'above' | 'below'
}

/**
 * Ordinary-least-squares trendline coefficients for a series indexed by its
 * position (0..n-1). Returns null when the series is too short to fit a line.
 */
function linearTrend(values: number[]): { slope: number; intercept: number } | null {
  const n = values.length
  if (n < 2) return null
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function defaultLineAria(points: LinePoint[]): string {
  if (points.length === 0) return 'Gráfico de líneas vacío.'
  const ys = points.map((p) => p.y)
  const first = ys[0]
  const last = ys[ys.length - 1]
  const max = Math.max(...ys)
  const min = Math.min(...ys)
  const trend = last > first ? 'al alza' : last < first ? 'a la baja' : 'estable'
  return `Gráfico de líneas con ${points.length} puntos, tendencia ${trend}. Inicio ${first}, fin ${last}, máximo ${max}, mínimo ${min}.`
}

/**
 * Pure SVG line chart with gradient area fill, ported from legacy LineChart.
 * Accepts a series of {x, y} points; x may be a string (e.g., "2026-04").
 */
export function ChartLine({
  points,
  accent = 'sky',
  height = 200,
  showLabels = true,
  ariaLabel,
  trendline = false,
  logScale = false,
  annotations,
}: ChartLineProps): JSX.Element {
  if (!points || points.length === 0) return <ChartEmptyState kind="line" height={height} />
  const ys = points.map((p) => p.y)
  // Log scale needs every value > 0. Silently fall back to linear when the
  // series contains zeros or negatives so the chart never blows up.
  const useLog = logScale && ys.every((v) => v > 0)
  const toScale = (v: number): number => (useLog ? Math.log10(Math.max(v, Number.MIN_VALUE)) : v)
  const scaledYs = ys.map(toScale)
  const max = Math.max(...scaledYs, useLog ? Math.log10(1) : 1)
  const min = useLog ? Math.min(...scaledYs) : 0
  const range = max - min || 1
  const w = 600
  const coords = points.map((p, i) => [
    (i / Math.max(1, points.length - 1)) * w,
    height - ((toScale(p.y) - min) / range) * (height - 30) - 18,
  ])
  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${w} ${height} L 0 ${height} Z`
  const stroke = `var(--${accent})`
  const gradId = `chart-line-grad-${accent}`
  const trend = trendline ? linearTrend(scaledYs) : null
  const trendCoords = trend
    ? [
        [0, height - ((trend.intercept - min) / range) * (height - 30) - 18],
        [
          w,
          height -
            ((trend.intercept + trend.slope * (points.length - 1) - min) / range) * (height - 30) -
            18,
        ],
      ]
    : null
  const label = ariaLabel ?? defaultLineAria(points)

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1="0"
            x2={w}
            y1={height * p}
            y2={height * p}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r="3.5"
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth="2"
          />
        ))}
        {trendCoords && (
          <line
            x1={trendCoords[0][0]}
            y1={trendCoords[0][1]}
            x2={trendCoords[1][0]}
            y2={trendCoords[1][1]}
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray="6 5"
            opacity="0.8"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {annotations?.map((a, i) => {
          const c = coords[a.pointIndex]
          if (!c) return null
          const above = (a.placement ?? 'above') === 'above'
          const ty = above ? c[1] - 10 : c[1] + 18
          return (
            <g key={i}>
              <line
                x1={c[0]}
                y1={c[1]}
                x2={c[0]}
                y2={above ? c[1] - 4 : c[1] + 4}
                stroke="var(--ink-2)"
                strokeWidth="1"
              />
              <circle cx={c[0]} cy={c[1]} r="2" fill="var(--ink)" />
              <text
                x={c[0]}
                y={ty}
                fontSize="10"
                fill="var(--ink-2)"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {a.text}
              </text>
            </g>
          )
        })}
      </svg>
      {showLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          {points.map((p, i) => (
            <span key={i}>{String(p.x)}</span>
          ))}
        </div>
      )}
    </div>
  )
}
