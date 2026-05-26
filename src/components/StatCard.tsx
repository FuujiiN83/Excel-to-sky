import type { Accent } from '../types/dataset'

interface StatCardProps {
  label: string
  value: string | number
  accent?: Accent
  caption?: string
  /** Show solid soft-accent background (legacy "accent" flag on GiantStat). */
  highlight?: boolean
  /** Optional single-char glyph rendered inside an accent chip. */
  icon?: string
}

export function StatCard({
  label,
  value,
  accent = 'sky',
  caption,
  highlight = false,
  icon,
}: StatCardProps): JSX.Element {
  return (
    <div
      style={{
        background: highlight ? `var(--${accent}-soft)` : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--pad-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 138,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && (
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `var(--${accent})`,
              display: 'grid',
              placeItems: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {icon}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 4.4vw, 64px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          marginTop: 'auto',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {caption && (
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{caption}</div>
      )}
    </div>
  )
}

// ---------- Small co-located visualisations for use inside cards ----------

interface MiniBarsProps {
  values: number[]
  accent?: Accent
  height?: number
}

export function MiniBars({ values, accent = 'sky', height = 36 }: MiniBarsProps): JSX.Element {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, width: '100%' }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: `var(--${accent})`,
            borderRadius: 3,
            opacity: 0.35 + 0.65 * (v / max),
          }}
        />
      ))}
    </div>
  )
}

interface MiniSparkProps {
  values: number[]
  accent?: Accent
  height?: number
}

export function MiniSpark({ values, accent = 'sky', height = 36 }: MiniSparkProps): JSX.Element {
  if (values.length === 0) {
    return <div style={{ height }} />
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 100
  const h = 100
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - ((v - min) / range) * h * 0.9 - 5,
  ])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  const stroke = `var(--${accent})`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <path d={area} fill={stroke} opacity="0.15" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
