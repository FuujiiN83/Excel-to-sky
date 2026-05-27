import { useEffect, useRef, useState } from 'react'
import { fmtNumber } from '../lib/stats'

interface AnimatedNumberProps {
  /** Target value. When this changes, the displayed number interpolates from the previous value to this one. */
  value: number
  /** Animation duration in ms. Default 600. */
  durationMs?: number
  /** Custom formatter; defaults to fmtNumber from lib/stats (respects the locale setting). */
  format?: (n: number) => string
  /** Inline style override. */
  className?: string
}

/**
 * Interpolates the displayed number from its previous value to `value` over
 * `durationMs` using requestAnimationFrame and an ease-out curve.
 *
 * Honours prefers-reduced-motion by snapping straight to the target.
 */
export function AnimatedNumber({
  value,
  durationMs = 600,
  format = fmtNumber,
  className,
}: AnimatedNumberProps): JSX.Element {
  const [display, setDisplay] = useState<number>(value)
  const fromRef = useRef<number>(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplay(value)
      return
    }
    const prefersReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (prefersReduce || durationMs <= 0) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    const from = fromRef.current
    const to = value
    if (from === to) return
    const startedAt = performance.now()

    function step(now: number): void {
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step)
      } else {
        fromRef.current = to
        rafRef.current = null
      }
    }

    rafRef.current = window.requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [value, durationMs])

  return <span className={className}>{format(display)}</span>
}
