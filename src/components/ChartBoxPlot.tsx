import type { Accent } from '../types/dataset'

export interface BoxStats {
  min: number
  max: number
  q1: number
  median: number
  q3: number
  outliers: ReadonlyArray<number>
}

interface ChartBoxPlotProps {
  values: ReadonlyArray<number>
  accent?: Accent
  height?: number
  ariaLabel?: string
  /** Show the numeric quartile labels above the box. Defaults true. */
  showLabels?: boolean
}

/**
 * Compute the five-number summary plus Tukey outliers (points beyond
 * 1.5 × IQR from Q1/Q3). Returns null for series shorter than 4 values
 * since the IQR is not defined.
 */
export function computeBoxStats(values: ReadonlyArray<number>): BoxStats | null {
  const cleaned = values
    .filter((v) => Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b)
  if (cleaned.length < 4) return null
  const q1 = quantile(cleaned, 0.25)
  const median = quantile(cleaned, 0.5)
  const q3 = quantile(cleaned, 0.75)
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr
  const inside = cleaned.filter((v) => v >= lowerFence && v <= upperFence)
  const outliers = cleaned.filter((v) => v < lowerFence || v > upperFence)
  return {
    min: inside.length > 0 ? inside[0] : cleaned[0],
    max: inside.length > 0 ? inside[inside.length - 1] : cleaned[cleaned.length - 1],
    q1,
    median,
    q3,
    outliers,
  }
}

function quantile(sorted: ReadonlyArray<number>, q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (base + 1 < sorted.length) return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  return sorted[base]
}

/**
 * Horizontal SVG box-and-whisker plot for a single numeric series (#62).
 * Whiskers extend to the most extreme values within 1.5 × IQR, points beyond
 * render as discrete outlier dots.
 */
export function ChartBoxPlot({
  values,
  accent = 'sky',
  height = 110,
  ariaLabel,
  showLabels = true,
}: ChartBoxPlotProps): JSX.Element | null {
  const stats = computeBoxStats(values)
  if (!stats) return null
  const stroke = `var(--${accent})`
  const w = 600
  const pad = { l: 16, r: 16, t: 30, b: 24 }
  const innerW = w - pad.l - pad.r
  // Domain spans whiskers plus outliers so every dot stays inside the canvas.
  const allMins = [stats.min, ...stats.outliers]
  const allMaxs = [stats.max, ...stats.outliers]
  const xMin = Math.min(...allMins, stats.q1)
  const xMax = Math.max(...allMaxs, stats.q3)
  const range = xMax - xMin || 1
  const xs = (v: number): number => pad.l + ((v - xMin) / range) * innerW
  const midY = pad.t + (height - pad.t - pad.b) / 2
  const boxH = 22
  const label =
    ariaLabel ??
    `Box plot. Mediana ${stats.median.toFixed(2)}, IQR ${stats.q1.toFixed(2)}–${stats.q3.toFixed(2)}, ${stats.outliers.length} valores atípicos.`

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {/* whisker line */}
      <line
        x1={xs(stats.min)}
        x2={xs(stats.max)}
        y1={midY}
        y2={midY}
        stroke={stroke}
        strokeWidth="1.5"
      />
      {/* whisker caps */}
      <line
        x1={xs(stats.min)}
        x2={xs(stats.min)}
        y1={midY - boxH / 2 + 4}
        y2={midY + boxH / 2 - 4}
        stroke={stroke}
      />
      <line
        x1={xs(stats.max)}
        x2={xs(stats.max)}
        y1={midY - boxH / 2 + 4}
        y2={midY + boxH / 2 - 4}
        stroke={stroke}
      />
      {/* IQR box */}
      <rect
        x={xs(stats.q1)}
        y={midY - boxH / 2}
        width={Math.max(2, xs(stats.q3) - xs(stats.q1))}
        height={boxH}
        fill={stroke}
        fillOpacity="0.18"
        stroke={stroke}
      />
      {/* median */}
      <line
        x1={xs(stats.median)}
        x2={xs(stats.median)}
        y1={midY - boxH / 2}
        y2={midY + boxH / 2}
        stroke="var(--ink)"
        strokeWidth="2"
      />
      {/* outliers */}
      {stats.outliers.map((v, i) => (
        <circle
          key={i}
          cx={xs(v)}
          cy={midY}
          r="2.6"
          fill="var(--coral, #F87171)"
          fillOpacity="0.8"
        />
      ))}
      {showLabels && (
        <>
          <text
            x={xs(stats.q1)}
            y={pad.t - 8}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            Q1 {stats.q1.toFixed(1)}
          </text>
          <text
            x={xs(stats.median)}
            y={pad.t - 8}
            fontSize="10"
            fill="var(--ink-2)"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            med {stats.median.toFixed(1)}
          </text>
          <text
            x={xs(stats.q3)}
            y={pad.t - 8}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            Q3 {stats.q3.toFixed(1)}
          </text>
        </>
      )}
      <text
        x={xs(stats.min)}
        y={height - 8}
        fontSize="10"
        fill="var(--muted)"
        fontFamily="var(--font-mono)"
        textAnchor="start"
      >
        {stats.min.toFixed(1)}
      </text>
      <text
        x={xs(stats.max)}
        y={height - 8}
        fontSize="10"
        fill="var(--muted)"
        fontFamily="var(--font-mono)"
        textAnchor="end"
      >
        {stats.max.toFixed(1)}
      </text>
    </svg>
  )
}
