import { useEffect, useState } from 'react'
import {
  clearAuditEntries,
  startNetworkAudit,
  subscribeAudit,
  type NetworkAuditEntry,
} from '../lib/networkAudit'

/**
 * Dev-only floating panel listing every fetch the page has made. Mount this
 * inside an `import.meta.env.DEV` guard so it never ships to production.
 */
export function NetworkAuditPanel(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ReadonlyArray<NetworkAuditEntry>>([])

  useEffect(() => {
    startNetworkAudit()
    return subscribeAudit((es) => setEntries(es))
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Panel de auditoría de red"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 22,
          zIndex: 60,
          padding: '6px 10px',
          background: 'rgba(14, 16, 21, 0.78)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid var(--border-strong)',
          color: 'var(--sky)',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Net · {entries.length}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Auditoría de red"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 56,
            zIndex: 61,
            width: 'min(520px, 92vw)',
            maxHeight: '60vh',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              Network · {entries.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={clearAuditEntries}
                style={panelBtn}
                aria-label="Borrar registro"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={panelBtn}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {entries.length === 0 ? (
              <p style={{ padding: 20, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                Sin peticiones de red aún. Esto es buena señal: significa que el parseo y los
                insights están corriendo en local.
              </p>
            ) : (
              entries
                .slice()
                .reverse()
                .map((e) => (
                  <div
                    key={e.id}
                    style={{
                      padding: '6px 14px',
                      borderBottom: '1px dashed var(--border)',
                      fontSize: 11,
                      color: 'var(--ink-2)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 10,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        color: statusColor(e.status),
                        minWidth: 36,
                        fontWeight: 600,
                      }}
                    >
                      {e.status}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ color: 'var(--muted)' }}>{e.method} </span>
                      {e.url}
                      <span style={{ color: 'var(--muted)' }}> · {e.origin}</span>
                    </span>
                    <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {e.durationMs}ms
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

function statusColor(s: NetworkAuditEntry['status']): string {
  if (s === 'error') return 'var(--coral)'
  if (typeof s === 'number') {
    if (s >= 500) return 'var(--coral)'
    if (s >= 400) return 'var(--amber, #FBBF24)'
    if (s >= 300) return 'var(--sky)'
    return 'var(--mint)'
  }
  return 'var(--ink)'
}

const panelBtn = {
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  color: 'var(--ink-2)',
  fontSize: 10,
  padding: '3px 8px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}
