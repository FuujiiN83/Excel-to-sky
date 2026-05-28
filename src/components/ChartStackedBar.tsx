import type { Accent } from '../types/dataset'

export interface StackedGroup {
  /** Group label rendered under the column. */
  label: string
  /** Stacked segments rendered bottom-to-top. */
  segments: ReadonlyArray<StackedSegment>
}

export interface StackedSegment {
  /** Segment identifier (also used as the legend label). */
  key: string
  value: number
}

interface ChartStackedBarProps {
  groups: ReadonlyArray<StackedGroup>
  /**
   * Optional explicit ordering for segments. When omitted we infer the order
   * from the first group's segments. Useful when not every group has every
   * segment but you still want consistent stacking.
   */
  segmentOrder?: ReadonlyArray<string>
  /** Accent palette used to colour segments. Defaults sky → mint → plum → … */
  accents?: ReadonlyArray<Accent>
  /** Render each group as 100% of itself (percentage view). Defaults false. */
  normalize?: boolean
  height?: number
  ariaLabel?: string
  /** Show segment legend below the chart. Defaults true. */
  showLegend?: boolean
}

const DEFAULT_ACCENTS: ReadonlyArray<Accent> = [
  'sky',
  'mint',
  'plum',
  'amber',
  'rose',
  'lime',
  'coral',
]

function inferSegmentOrder(groups: ReadonlyArray<StackedGroup>): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const g of groups) {
    for (const s of g.segments) {
      if (seen.has(s.key)) continue
      seen.add(s.key)
      order.push(s.key)
    }
  }
  return order
}

function describe(groups: ReadonlyArray<StackedGroup>, normalize: boolean): string {
  if (groups.length === 0) return 'Gráfico apilado vacío.'
  return `Gráfico de barras apiladas con ${groups.length} grupos${normalize ? ', normalizadas al 100%' : ''}.`
}

/**
 * Pure SVG stacked column chart (#67). Each group renders one column composed
 * of segments stacked bottom-to-top. Pass `normalize` to switch to a 100%
 * stacked view where every column reaches the same height — useful for
 * comparing composition across groups with very different totals.
 */
export function ChartStackedBar({
  groups,
  segmentOrder,
  accents = DEFAULT_ACCENTS,
  normalize = false,
  height = 240,
  ariaLabel,
  showLegend = true,
}: ChartStackedBarProps): JSX.Element | null {
  if (!groups || groups.length === 0) return null
  const order = segmentOrder ?? inferSegmentOrder(groups)
  const totals = groups.map((g) => g.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0))
  const globalMax = Math.max(...totals, 1)

  const w = 600
  const pad = { l: 32, r: 12, t: 12, b: 32 }
  const innerW = w - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const gap = 8
  const colW = (innerW - gap * (groups.length - 1)) / groups.length

  const label = ariaLabel ?? describe(groups, normalize)

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
        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * p}
            y2={pad.t + innerH * p}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {/* baseline */}
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + innerH}
          y2={pad.t + innerH}
          stroke="var(--border-strong)"
        />
        {groups.map((g, gi) => {
          const total = totals[gi]
          const denom = normalize ? total || 1 : globalMax
          const x = pad.l + gi * (colW + gap)
          let cursor = pad.t + innerH
          const segmentsByKey = new Map(g.segments.map((s) => [s.key, s.value]))
          return (
            <g key={gi}>
              {order.map((key, oi) => {
                const v = Math.max(0, segmentsByKey.get(key) ?? 0)
                if (v === 0) return null
                const h = (v / denom) * innerH
                cursor -= h
                const accent = accents[oi % accents.length]
                return (
                  <rect
                    key={key}
                    x={x}
                    y={cursor}
                    width={colW}
                    height={h}
                    fill={`var(--${accent})`}
                    fillOpacity={0.85 - oi * 0.06}
                  />
                )
              })}
              <text
                x={x + colW / 2}
                y={height - 10}
                fontSize="10"
                fill="var(--muted)"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {g.label}
              </text>
            </g>
          )
        })}
      </svg>
      {showLegend && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {order.map((key, i) => {
            const accent = accents[i % accents.length]
            return (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: `var(--${accent})`,
                    opacity: 0.85 - i * 0.06,
                  }}
                  aria-hidden
                />
                {key}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
