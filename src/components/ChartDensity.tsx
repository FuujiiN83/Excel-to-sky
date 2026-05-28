import type { Accent } from '../types/dataset'

interface ChartDensityProps {
  values: ReadonlyArray<number>
  accent?: Accent
  height?: number
  /** Number of grid points evaluated across the data range. Default 80. */
  resolution?: number
  /** Manual bandwidth (h). Defaults to Silverman's rule of thumb. */
  bandwidth?: number
  ariaLabel?: string
  /** Show the median tick at the foot of the curve. Defaults true. */
  showMedianTick?: boolean
}

/**
 * Silverman's rule of thumb for Gaussian kernel bandwidth on roughly normal
 * data: h ≈ 1.06 · σ · n^(-1/5). Falls back to a tiny epsilon when σ is 0
 * so the estimator doesn't collapse to a Dirac spike.
 */
function silvermanBandwidth(values: ReadonlyArray<number>): number {
  const n = values.length
  if (n === 0) return 1
  let mean = 0
  for (const v of values) mean += v
  mean /= n
  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  const sd = Math.sqrt(variance / Math.max(1, n - 1))
  return Math.max(1e-6, 1.06 * sd * Math.pow(n, -1 / 5))
}

function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI)
}

export interface DensityCurve {
  xs: ReadonlyArray<number>
  ys: ReadonlyArray<number>
  median: number
}

/**
 * Evaluate a Gaussian kernel density estimate on a uniform grid spanning the
 * sample range. Exported so insights / dev tools can reuse the curve without
 * mounting the SVG component.
 */
export function kernelDensityEstimate(
  values: ReadonlyArray<number>,
  resolution = 80,
  bandwidth?: number,
): DensityCurve | null {
  const cleaned = values.filter((v) => Number.isFinite(v))
  if (cleaned.length < 4) return null
  const sorted = cleaned.slice().sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  if (max === min) return null
  const h = bandwidth ?? silvermanBandwidth(cleaned)
  const step = (max - min) / (resolution - 1)
  const xs: number[] = []
  const ys: number[] = []
  const norm = 1 / (cleaned.length * h)
  for (let i = 0; i < resolution; i++) {
    const x = min + step * i
    let sum = 0
    for (const v of cleaned) sum += gaussianKernel((x - v) / h)
    xs.push(x)
    ys.push(sum * norm)
  }
  const median = sorted[Math.floor(sorted.length / 2)]
  return { xs, ys, median }
}

/**
 * Pure SVG kernel-density plot (#63). Estimates a smooth Gaussian KDE for a
 * single numeric series and draws it as a filled gradient curve. Useful when
 * a histogram's bin choice obscures the underlying shape.
 */
export function ChartDensity({
  values,
  accent = 'sky',
  height = 180,
  resolution = 80,
  bandwidth,
  ariaLabel,
  showMedianTick = true,
}: ChartDensityProps): JSX.Element | null {
  const curve = kernelDensityEstimate(values, resolution, bandwidth)
  if (!curve) return null
  const stroke = `var(--${accent})`
  const gradId = `ets-density-${accent}`
  const w = 600
  const pad = { l: 24, r: 12, t: 14, b: 24 }
  const innerW = w - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const xMin = curve.xs[0]
  const xMax = curve.xs[curve.xs.length - 1]
  const yMax = Math.max(...curve.ys, 1e-9)
  const px = (x: number): number => pad.l + ((x - xMin) / (xMax - xMin || 1)) * innerW
  const py = (y: number): number => pad.t + innerH - (y / yMax) * innerH
  const pts = curve.xs.map((x, i) => [px(x), py(curve.ys[i])])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${px(xMax)} ${pad.t + innerH} L ${px(xMin)} ${pad.t + innerH} Z`
  const label = ariaLabel ?? `Densidad estimada. Rango ${xMin.toFixed(2)}–${xMax.toFixed(2)}.`

  return (
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
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={pad.l}
        x2={w - pad.r}
        y1={pad.t + innerH}
        y2={pad.t + innerH}
        stroke="var(--border-strong)"
      />
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {showMedianTick && (
        <g>
          <line
            x1={px(curve.median)}
            x2={px(curve.median)}
            y1={pad.t + innerH - 10}
            y2={pad.t + innerH + 4}
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
          <text
            x={px(curve.median)}
            y={pad.t + innerH + 16}
            fontSize="10"
            fill="var(--ink-2)"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            med {curve.median.toFixed(1)}
          </text>
        </g>
      )}
      <text
        x={pad.l}
        y={height - 8}
        fontSize="10"
        fill="var(--muted)"
        fontFamily="var(--font-mono)"
      >
        {xMin.toFixed(1)}
      </text>
      <text
        x={w - pad.r}
        y={height - 8}
        fontSize="10"
        fill="var(--muted)"
        fontFamily="var(--font-mono)"
        textAnchor="end"
      >
        {xMax.toFixed(1)}
      </text>
    </svg>
  )
}
