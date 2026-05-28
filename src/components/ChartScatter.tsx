import type { Accent } from '../types/dataset'

export interface ScatterPoint {
  x: number
  y: number
  label?: string
}

interface ChartScatterProps {
  points: ScatterPoint[]
  accent?: Accent
  height?: number
  xLabel?: string
  yLabel?: string
  /** Accessible description. If omitted, one is derived from the data. */
  ariaLabel?: string
  /** Overlay a linear regression line plus a small R² badge (#65). */
  regression?: boolean
  /** Free-form labelled annotations pinned to point indices (#78). */
  annotations?: ReadonlyArray<ScatterAnnotation>
}

export interface ScatterAnnotation {
  pointIndex: number
  text: string
}

interface RegressionFit {
  slope: number
  intercept: number
  r2: number
}

/**
 * Ordinary-least-squares fit for (x, y) pairs plus the coefficient of
 * determination R². Returns null when the cloud is degenerate (n < 2 or
 * Σ(x - x̄)² = 0, meaning every x is identical so no line can be fit).
 */
function fitRegression(points: ReadonlyArray<{ x: number; y: number }>): RegressionFit | null {
  const n = points.length
  if (n < 2) return null
  let sx = 0
  let sy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let denX = 0
  let denY = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  if (denX === 0) return null
  const slope = num / denX
  const intercept = my - slope * mx
  const r2 = denY === 0 ? 1 : (num * num) / (denX * denY)
  return { slope, intercept, r2 }
}

function defaultScatterAria(points: ScatterPoint[], xLabel?: string, yLabel?: string): string {
  if (points.length === 0) return 'Diagrama de dispersión vacío.'
  const cross = xLabel && yLabel ? ` cruzando ${yLabel} (Y) frente a ${xLabel} (X)` : ''
  return `Diagrama de dispersión con ${points.length} puntos${cross}.`
}

/**
 * Pure SVG scatter plot. Used by ComparePage to cross two numeric columns.
 */
export function ChartScatter({
  points,
  accent = 'sky',
  height = 280,
  xLabel,
  yLabel,
  ariaLabel,
  regression = false,
  annotations,
}: ChartScatterProps): JSX.Element | null {
  if (!points || points.length === 0) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const w = 600
  const pad = { l: 36, r: 12, t: 12, b: 28 }
  const innerW = w - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const stroke = `var(--${accent})`

  function px(x: number): number {
    return pad.l + ((x - xMin) / xRange) * innerW
  }
  function py(y: number): number {
    return pad.t + innerH - ((y - yMin) / yRange) * innerH
  }

  const label = ariaLabel ?? defaultScatterAria(points, xLabel, yLabel)

  const fit = regression ? fitRegression(points) : null

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
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={`h-${i}`}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * p}
            y2={pad.t + innerH * p}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={`v-${i}`}
            x1={pad.l + innerW * p}
            x2={pad.l + innerW * p}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {/* axes */}
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + innerH} stroke="var(--border-strong)" />
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + innerH}
          y2={pad.t + innerH}
          stroke="var(--border-strong)"
        />
        {/* points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={px(p.x)}
            cy={py(p.y)}
            r="4"
            fill={stroke}
            fillOpacity="0.55"
            stroke={stroke}
            strokeWidth="1"
          />
        ))}
        {fit && (
          <line
            x1={px(xMin)}
            y1={py(fit.intercept + fit.slope * xMin)}
            x2={px(xMax)}
            y2={py(fit.intercept + fit.slope * xMax)}
            stroke={stroke}
            strokeWidth="1.6"
            strokeDasharray="6 5"
            opacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {fit && (
          <text
            x={w - pad.r}
            y={pad.t + 12}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            R² = {fit.r2.toFixed(2)}
          </text>
        )}
        {annotations?.map((a, i) => {
          const p = points[a.pointIndex]
          if (!p) return null
          const cx = px(p.x)
          const cy = py(p.y)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="6" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
              <text
                x={cx + 10}
                y={cy + 3}
                fontSize="10"
                fill="var(--ink-2)"
                fontFamily="var(--font-mono)"
              >
                {a.text}
              </text>
            </g>
          )
        })}
        {/* axis ticks */}
        <text
          x={pad.l}
          y={height - 6}
          fontSize="10"
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
        >
          {Math.round(xMin)}
        </text>
        <text
          x={w - pad.r}
          y={height - 6}
          fontSize="10"
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
          textAnchor="end"
        >
          {Math.round(xMax)}
        </text>
        <text x={4} y={pad.t + 10} fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">
          {Math.round(yMax)}
        </text>
        <text
          x={4}
          y={pad.t + innerH}
          fontSize="10"
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
        >
          {Math.round(yMin)}
        </text>
      </svg>
      {(xLabel || yLabel) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 6,
          }}
        >
          <span>{yLabel ? `↑ ${yLabel}` : ''}</span>
          <span>{xLabel ? `${xLabel} →` : ''}</span>
        </div>
      )}
    </div>
  )
}
