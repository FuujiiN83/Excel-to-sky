import { useEffect, useState } from 'react'
import {
  APP_VERSION,
  CHANGELOG,
  getLastSeenVersion,
  markVersionSeen,
  unseenChangelog,
  type ChangelogEntry,
} from '../lib/changelog'

/**
 * Mount-once-and-decide modal that surfaces the changelog entries the user
 * hasn't seen yet. On a first visit (no stored marker) we just record the
 * current version silently — new users skip the wall of historical entries.
 */
export function ChangelogModal(): JSX.Element | null {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)

  useEffect(() => {
    const last = getLastSeenVersion()
    if (!last) {
      // First visit: don't show anything, but pin the current version so the
      // next release will be flagged for this browser.
      markVersionSeen(APP_VERSION)
      return
    }
    if (last === APP_VERSION) return
    const unseen = unseenChangelog()
    if (unseen.length === 0) return
    setEntries(unseen)
  }, [])

  function dismiss(): void {
    markVersionSeen(APP_VERSION)
    setEntries(null)
  }

  useEffect(() => {
    if (!entries) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entries])

  if (!entries) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ets-changelog-title"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 190,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          padding: '32px 36px',
          maxWidth: 560,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--sky)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          Qué hay nuevo · v{APP_VERSION}
        </div>
        <h2
          id="ets-changelog-title"
          className="font-display"
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.025em',
            margin: '6px 0 24px',
          }}
        >
          Cambios desde tu última visita
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {entries.map((entry) => (
            <section key={entry.version}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  className="font-display"
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {entry.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  v{entry.version} · {entry.date}
                </div>
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
                {entry.highlights.map((h) => (
                  <li
                    key={h}
                    style={{
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      lineHeight: 1.55,
                      paddingLeft: 14,
                      position: 'relative',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        width: 6,
                        height: 1,
                        background: 'var(--sky)',
                      }}
                    />
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Listado completo en{' '}
            <a
              href="https://github.com/FuujiiN83/Excel-to-sky/releases"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--sky)' }}
            >
              GitHub Releases
            </a>
            .
          </span>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

// Exported only for tests / debugging — production code reaches it via ChangelogModal.
export { CHANGELOG }
