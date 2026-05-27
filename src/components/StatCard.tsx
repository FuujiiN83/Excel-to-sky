import type { ReactNode } from 'react'
import type { Accent } from '../types/dataset'

// Scale value font-size down for long string values so they don't overflow the card.
function valueFontSize(value: string | number | ReactNode): string {
  const len = typeof value === 'string' || typeof value === 'number' ? String(value).length : 6
  if (len <= 4) return 'clamp(30px, 3vw, 42px)'
  if (len <= 8) return 'clamp(24px, 2.4vw, 32px)'
  if (len <= 14) return 'clamp(18px, 1.7vw, 24px)'
  if (len <= 24) return 'clamp(15px, 1.3vw, 19px)'
  return 'clamp(13px, 1.1vw, 16px)'
}

interface StatCardProps {
  label: string
  /**
   * The displayed value. Accepts a string/number for plain rendering or any
   * ReactNode (e.g. <AnimatedNumber />) for richer presentations.
   */
  value: string | number | ReactNode
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
        padding: 6,
        borderRadius: 0,
        background: highlight
          ? `linear-gradient(135deg, var(--${accent}-soft), transparent 70%)`
          : 'rgba(255,255,255,0.025)',
        boxShadow: '0 0 0 1px var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 0,
          padding: 'var(--pad)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minHeight: 96,
          position: 'relative',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 0,
                background: `var(--${accent}-soft)`,
                color: `var(--${accent})`,
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 600,
                boxShadow: `inset 0 0 0 1px var(--border)`,
              }}
            >
              {icon}
            </div>
          )}
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            {label}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: valueFontSize(value),
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
            marginTop: 'auto',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </div>
        {caption && (
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.01em' }}>
            {caption}
          </div>
        )}
      </div>
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
            borderRadius: 0,
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
