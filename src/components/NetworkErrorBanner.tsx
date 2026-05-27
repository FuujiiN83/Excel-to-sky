import { useEffect, useState } from 'react'
import { subscribeNetworkErrors, type NetworkErrorEvent } from '../lib/networkError'

interface VisibleError extends NetworkErrorEvent {
  /** When this error was first surfaced to the user (UI clock, not the event ts). */
  shownAt: number
}

/**
 * Anchored bottom banner that surfaces the latest network failure. The first
 * error is shown until the user dismisses it; subsequent errors replace its
 * content. Auto-hides after 12 s of inactivity even if not dismissed, so a
 * one-off blip doesn't stick to the viewport forever.
 */
export function NetworkErrorBanner(): JSX.Element | null {
  const [current, setCurrent] = useState<VisibleError | null>(null)

  useEffect(() => {
    return subscribeNetworkErrors((e) => {
      setCurrent({ ...e, shownAt: Date.now() })
    })
  }, [])

  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(() => {
      setCurrent((c) => (c && c.shownAt === current.shownAt ? null : c))
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [current])

  if (!current) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 88,
        zIndex: 110,
        maxWidth: 540,
        marginInline: 'auto',
        background: 'var(--surface, rgba(20,22,28,0.95))',
        color: 'var(--ink)',
        borderLeft: '3px solid var(--coral)',
        boxShadow: '0 0 0 1px var(--border-strong), 0 18px 40px -16px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--coral)',
            marginBottom: 4,
          }}
        >
          {current.context}
          {current.status ? ` · HTTP ${current.status}` : ''}
        </div>
        <div style={{ color: 'var(--ink-2)' }}>{current.message}</div>
      </div>
      <button
        onClick={() => setCurrent(null)}
        aria-label="Cerrar aviso"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          padding: 4,
          fontSize: 16,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  )
}
