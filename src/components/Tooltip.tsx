import { useEffect, useState, type ReactNode } from 'react'

/**
 * Lightweight pointer-anchored tooltip (#72). Designed for chart overlays:
 * the caller controls when it's open by toggling the `open` flag, and the
 * tooltip positions itself near the cursor without escaping the viewport.
 *
 * Rendered into a top-level container, not an SVG <title> — that lets us
 * embed mini-charts and arbitrary React content inside the tooltip body.
 */

interface TooltipProps {
  open: boolean
  /** Anchor point in client coordinates. */
  x: number
  y: number
  children: ReactNode
  /** Maximum tooltip width in px. Defaults 240. */
  maxWidth?: number
}

export function Tooltip({
  open,
  x,
  y,
  children,
  maxWidth = 240,
}: TooltipProps): JSX.Element | null {
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (!open) return
    if (typeof window === 'undefined') return
    // Clamp so we never escape the viewport. Prefer the bottom-right of the
    // cursor, flip if we'd overflow.
    const margin = 12
    const wantLeft = x + margin
    const wantTop = y + margin
    const innerW = window.innerWidth
    const innerH = window.innerHeight
    const finalLeft =
      wantLeft + maxWidth + margin > innerW ? Math.max(margin, x - maxWidth - margin) : wantLeft
    const finalTop = wantTop + 120 > innerH ? Math.max(margin, y - 120) : wantTop
    setPos({ left: finalLeft, top: finalTop })
  }, [open, x, y, maxWidth])

  if (!open) return null

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 999,
        maxWidth,
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 18px 36px -16px rgba(0,0,0,0.55)',
        padding: 10,
        pointerEvents: 'none',
        fontSize: 12,
        color: 'var(--ink)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Convenience helper that renders a labelled stat + a tiny SVG sparkline
 * inside a tooltip body. Useful for the bar/point-hover case where we want
 * to show the value alongside its context (#72).
 */
interface TooltipSparkProps {
  title: string
  value: string
  values: ReadonlyArray<number>
  accent?: string
}

export function TooltipSpark({
  title,
  value,
  values,
  accent = 'var(--sky)',
}: TooltipSparkProps): JSX.Element {
  const w = 180
  const h = 36
  if (values.length < 2) {
    return (
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
      </div>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const path = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w
      const y = h - ((v - min) / (max - min)) * h
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{title}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, marginBottom: 6 }}>{value}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden style={{ display: 'block' }}>
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
