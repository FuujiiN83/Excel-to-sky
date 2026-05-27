import { useState } from 'react'

interface PrivacyBadgeProps {
  /** When true, the badge shows the local-only-mode indicator. */
  localOnly?: boolean
}

/**
 * Persistent bottom-left chip that reminds the user where the current
 * session's data lives. Click to expand into a tiny panel with the per-storage
 * breakdown.
 */
export function PrivacyBadge({ localOnly = false }: PrivacyBadgeProps): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 22,
        zIndex: 49,
      }}
    >
      {open && (
        <div
          role="region"
          aria-label="Estado de privacidad"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: 320,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            padding: '14px 16px',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ink-2)',
          }}
        >
          <div
            className="font-display"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              marginBottom: 6,
            }}
          >
            Tus datos no salen de aquí
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <Row label="Parseo" value="Local · Web Worker" tone="ok" />
            <Row label="Análisis" value="Local · sin LLM" tone="ok" />
            <Row label="Historial" value="IndexedDB del navegador" tone="ok" />
            <Row
              label="Compartir"
              value={localOnly ? 'Desactivado (solo-local)' : 'Solo si pulsas Compartir'}
              tone="info"
            />
            <Row label="Anuncios" value="Ninguno por ahora" tone="ok" />
          </ul>
          <p style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            Más detalles en la página de Privacidad.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Tus datos no salen del navegador. Click para más detalles."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 8px',
          background: 'rgba(14, 16, 21, 0.78)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid var(--border-strong)',
          color: 'var(--mint)',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            background: 'var(--mint)',
            boxShadow: '0 0 0 3px rgba(94, 226, 192, 0.15)',
          }}
        />
        {localOnly ? 'Solo local' : 'Local'}
      </button>
    </div>
  )
}

interface RowProps {
  label: string
  value: string
  tone: 'ok' | 'info'
}

function Row({ label, value, tone }: RowProps): JSX.Element {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span
        style={{
          color: 'var(--muted)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: tone === 'ok' ? 'var(--mint)' : 'var(--sky)',
          fontSize: 12,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </li>
  )
}
