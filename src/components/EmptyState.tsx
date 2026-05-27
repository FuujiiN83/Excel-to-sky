import type { ReactNode } from 'react'

export type EmptyStateVariant = 'no-dashboards' | 'no-data' | 'no-charts' | 'no-share'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  body?: string
  action?: ReactNode
  /** Compact mode renders a smaller illustration, suited for sidebars. */
  compact?: boolean
}

export function EmptyState({
  variant = 'no-data',
  title,
  body,
  action,
  compact = false,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: compact ? '32px 20px' : '56px 32px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        gap: 18,
      }}
    >
      <div
        aria-hidden
        style={{
          width: compact ? 64 : 96,
          height: compact ? 64 : 96,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--muted)',
        }}
      >
        <Illustration variant={variant} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 440 }}>
        <div
          className="font-display"
          style={{
            fontSize: compact ? 15 : 18,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </div>
        {body && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{body}</div>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function Illustration({ variant }: { variant: EmptyStateVariant }): JSX.Element {
  const stroke = 'currentColor'
  const props = {
    viewBox: '0 0 96 96',
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (variant === 'no-dashboards') {
    return (
      <svg {...props}>
        <rect x="14" y="22" width="68" height="52" />
        <line x1="14" y1="34" x2="82" y2="34" />
        <line x1="34" y1="22" x2="34" y2="74" strokeDasharray="3 4" />
        <rect x="42" y="44" width="12" height="20" stroke="var(--sky)" />
        <rect x="58" y="38" width="12" height="26" stroke="var(--mint)" />
        <line x1="20" y1="80" x2="76" y2="80" strokeDasharray="2 4" />
      </svg>
    )
  }
  if (variant === 'no-charts') {
    return (
      <svg {...props}>
        <line x1="16" y1="76" x2="80" y2="76" />
        <line x1="16" y1="20" x2="16" y2="76" />
        <polyline
          points="24,64 36,56 48,60 60,40 72,46"
          stroke="var(--sky)"
          strokeDasharray="3 5"
        />
        <circle cx="60" cy="40" r="3" stroke="var(--plum)" />
      </svg>
    )
  }
  if (variant === 'no-share') {
    return (
      <svg {...props}>
        <circle cx="48" cy="48" r="34" strokeDasharray="3 5" />
        <path d="M36 48 L 60 48 M 50 38 L 60 48 L 50 58" stroke="var(--sky)" />
        <line x1="20" y1="20" x2="76" y2="76" stroke="var(--coral)" />
      </svg>
    )
  }
  // no-data
  return (
    <svg {...props}>
      <rect x="20" y="24" width="56" height="48" />
      <line x1="20" y1="40" x2="76" y2="40" />
      <line x1="36" y1="24" x2="36" y2="72" strokeDasharray="3 4" />
      <line x1="52" y1="40" x2="52" y2="72" strokeDasharray="3 4" />
      <text
        x="48"
        y="60"
        textAnchor="middle"
        fontSize="14"
        fill="var(--muted)"
        fontFamily="var(--font-mono, monospace)"
        stroke="none"
      >
        ?
      </text>
    </svg>
  )
}
