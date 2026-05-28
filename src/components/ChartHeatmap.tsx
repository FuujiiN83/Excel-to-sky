import { Fragment } from 'react'

interface ChartHeatmapProps {
  /** Column labels, one per series. Rendered on both axes. */
  columns: ReadonlyArray<string>
  /** One number array per column. Arrays should all be the same length. */
  series: ReadonlyArray<ReadonlyArray<number>>
  /** Cell side in px. Defaults 36. */
  cellSize?: number
  /** Show the numeric correlation in each cell. Defaults true. */
  showValues?: boolean
  ariaLabel?: string
}

/**
 * Pearson correlation between two equal-length numeric arrays. Pairs where
 * either value is non-finite are dropped before computing. Returns 0 when the
 * remaining sample is empty or either variance is zero.
 */
export function pearson(xs: ReadonlyArray<number>, ys: ReadonlyArray<number>): number {
  const n = Math.min(xs.length, ys.length)
  let sx = 0
  let sy = 0
  let count = 0
  for (let i = 0; i < n; i++) {
    const x = xs[i]
    const y = ys[i]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    sx += x
    sy += y
    count++
  }
  if (count === 0) return 0
  const mx = sx / count
  const my = sy / count
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const x = xs[i]
    const y = ys[i]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const dx = x - mx
    const dy = y - my
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  if (denX === 0 || denY === 0) return 0
  return num / Math.sqrt(denX * denY)
}

/**
 * Build the lower-triangular + diagonal correlation matrix for the given
 * series. The output is symmetric (matrix[i][j] === matrix[j][i]).
 */
export function correlationMatrix(series: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const n = series.length
  const m: number[][] = Array.from({ length: n }, () => Array.from<number>({ length: n }).fill(0))
  for (let i = 0; i < n; i++) {
    m[i][i] = 1
    for (let j = i + 1; j < n; j++) {
      const r = pearson(series[i], series[j])
      m[i][j] = r
      m[j][i] = r
    }
  }
  return m
}

/**
 * Map a Pearson r in [-1, 1] to a CSS colour on the diverging
 * coral → surface → sky palette. r near 0 stays neutral, magnitudes near 1
 * saturate the chosen accent.
 */
function cellColor(r: number): string {
  const mag = Math.min(1, Math.abs(r))
  const hue = r >= 0 ? 'var(--sky)' : 'var(--coral, #F87171)'
  return `color-mix(in oklab, ${hue} ${(mag * 90).toFixed(1)}%, var(--surface))`
}

/**
 * Pure-CSS correlation heatmap (#64). Pass a list of numeric series with
 * matching column labels; we compute the Pearson matrix and render it as
 * a symmetric grid with per-cell colour and optional numeric overlay.
 */
export function ChartHeatmap({
  columns,
  series,
  cellSize = 36,
  showValues = true,
  ariaLabel,
}: ChartHeatmapProps): JSX.Element | null {
  if (columns.length === 0 || series.length !== columns.length) return null
  const matrix = correlationMatrix(series)
  const label =
    ariaLabel ?? `Mapa de calor de correlación con ${columns.length} columnas numéricas.`

  return (
    <div role="img" aria-label={label} style={{ display: 'inline-block' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `120px repeat(${columns.length}, ${cellSize}px)`,
          gap: 2,
        }}
      >
        {/* header row */}
        <div />
        {columns.map((c, i) => (
          <div
            key={`h-${i}`}
            title={c}
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              transform: 'rotate(-40deg)',
              transformOrigin: 'bottom left',
              whiteSpace: 'nowrap',
              alignSelf: 'end',
              padding: '0 0 4px',
              height: 60,
              overflow: 'hidden',
            }}
          >
            {c}
          </div>
        ))}
        {/* body */}
        {columns.map((rowLabel, i) => (
          <Fragment key={`row-${i}`}>
            <div
              key={`l-${i}`}
              style={{
                fontSize: 11,
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'right',
                paddingRight: 8,
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={rowLabel}
            >
              {rowLabel}
            </div>
            {columns.map((_, j) => {
              const r = matrix[i][j]
              return (
                <div
                  key={`c-${i}-${j}`}
                  title={`${columns[i]} × ${columns[j]} = ${r.toFixed(2)}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: cellColor(r),
                    border: '1px solid var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: Math.abs(r) > 0.55 ? 'var(--bg)' : 'var(--ink-2)',
                  }}
                >
                  {showValues ? r.toFixed(2) : ''}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
