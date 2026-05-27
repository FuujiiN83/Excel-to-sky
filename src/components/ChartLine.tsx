import type { Accent } from '../types/dataset'

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
}: ChartLineProps): JSX.Element | null {
  if (!points || points.length === 0) return null
  const max = Math.max(...points.map((p) => p.y), 1)
  const w = 600
  const coords = points.map((p, i) => [
    (i / Math.max(1, points.length - 1)) * w,
    height - (p.y / max) * (height - 30) - 18,
  ])
  const path = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
    .join(' ')
  const area = `${path} L ${w} ${height} L 0 ${height} Z`
  const stroke = `var(--${accent})`
  const gradId = `chart-line-grad-${accent}`
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
