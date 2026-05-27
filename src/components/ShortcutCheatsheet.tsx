import { useEffect } from 'react'

interface Shortcut {
  keys: string[]
  description: string
  /** Future / aspirational shortcut not yet wired. */
  planned?: boolean
}

const SHORTCUTS: ReadonlyArray<{ group: string; items: Shortcut[] }> = [
  {
    group: 'Globales',
    items: [
      { keys: ['?'], description: 'Mostrar / ocultar esta ayuda' },
      { keys: ['Esc'], description: 'Cerrar diálogo o vista modal' },
    ],
  },
  {
    group: 'Navegación',
    items: [
      { keys: ['g', 'u'], description: 'Ir a Subir', planned: true },
      { keys: ['g', 'd'], description: 'Ir al Dashboard', planned: true },
      { keys: ['g', 'c'], description: 'Ir a Comparar', planned: true },
      { keys: ['g', 's'], description: 'Ir a Compartir', planned: true },
      { keys: ['/'], description: 'Buscar columnas', planned: true },
    ],
  },
  {
    group: 'Dashboard',
    items: [
      { keys: ['Tab'], description: 'Recorrer columnas con el teclado' },
      { keys: ['Enter'], description: 'Abrir detalle de la columna enfocada' },
    ],
  },
]

interface ShortcutCheatsheetProps {
  open: boolean
  onClose: () => void
}

export function ShortcutCheatsheet({ open, onClose }: ShortcutCheatsheetProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          padding: '28px 32px',
          maxWidth: 560,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Ayuda
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                margin: '4px 0 0',
              }}
            >
              Atajos de teclado
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--sky)',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginBottom: 10,
                }}
              >
                {g.group}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {g.items.map((item) => (
                  <li
                    key={item.description}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      paddingBottom: 8,
                      borderBottom: '1px dashed var(--border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: item.planned ? 'var(--muted)' : 'var(--ink-2)',
                      }}
                    >
                      {item.description}
                      {item.planned && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--muted)',
                          }}
                        >
                          próximamente
                        </span>
                      )}
                    </span>
                    <KeyCombo keys={item.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p
          style={{
            marginTop: 22,
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          Pulsa <Kbd>?</Kbd> en cualquier momento para abrir esta ventana o <Kbd>Esc</Kbd> para
          cerrarla.
        </p>
      </div>
    </div>
  )
}

function KeyCombo({ keys }: { keys: string[] }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {keys.map((k, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Kbd>{k}</Kbd>
          {i < keys.length - 1 && (
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>luego</span>
          )}
        </span>
      ))}
    </span>
  )
}

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 22,
        padding: '2px 6px',
        background: 'var(--surface-2, rgba(255,255,255,0.06))',
        border: '1px solid var(--border-strong)',
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.3)',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 11,
        color: 'var(--ink)',
      }}
    >
      {children}
    </kbd>
  )
}
