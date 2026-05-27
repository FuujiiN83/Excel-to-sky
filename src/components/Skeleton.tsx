import type { CSSProperties } from 'react'

interface SkeletonProps {
  /** Width — accepts any CSS dimension. Defaults to 100% of the container. */
  width?: number | string
  /** Height — px or any CSS dimension. Defaults to 14px (one line of body text). */
  height?: number | string
  /** Border-radius. The theme is rectangular, so the default is 0. */
  radius?: number
  /** Override the inline style for edge cases. */
  style?: CSSProperties
  /** Reads as 'Cargando…' for screen readers. */
  label?: string
}

/**
 * Shimmer skeleton placeholder. Use one per future text/element so the layout
 * doesn't reflow when real content arrives. Honours prefers-reduced-motion by
 * pinning to a static low-opacity surface (no infinite gradient sweep).
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 0,
  style,
  label = 'Cargando…',
}: SkeletonProps): JSX.Element {
  return (
    <span
      role="status"
      aria-label={label}
      aria-busy="true"
      className="ets-skeleton"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}
