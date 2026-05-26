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

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
      >
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
        <line
          x1={pad.l}
          x2={pad.l}
          y1={pad.t}
          y2={pad.t + innerH}
          stroke="var(--border-strong)"
        />
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
        <text
          x={4}
          y={pad.t + 10}
          fontSize="10"
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
        >
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
