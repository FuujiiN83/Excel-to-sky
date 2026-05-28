import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Lightweight wrapper that gives any chart an inline-editable title (#76).
 * Click the title to edit, Enter or blur commits, Esc cancels. When
 * `storageKey` is provided the override is persisted in localStorage so the
 * user's renamed title survives reloads. Without it the title is purely
 * session-local.
 *
 * Keeping this as a wrapper (instead of an Edit-title prop on every chart)
 * means we don't have to touch ChartBar, ChartLine, ChartScatter, etc. —
 * callers opt in by wrapping the chart they want to label.
 */

interface ChartCardProps {
  title: string
  storageKey?: string
  caption?: string
  /** Optional toolbar slot (e.g. log-scale toggle, sort selector). */
  toolbar?: ReactNode
  children: ReactNode
}

function readStored(storageKey: string | undefined): string | null {
  if (!storageKey || typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(`ets-chart-title:${storageKey}`)
  } catch {
    return null
  }
}

function writeStored(storageKey: string | undefined, value: string | null): void {
  if (!storageKey || typeof window === 'undefined') return
  try {
    if (value === null) window.localStorage.removeItem(`ets-chart-title:${storageKey}`)
    else window.localStorage.setItem(`ets-chart-title:${storageKey}`, value)
  } catch {
    // best effort
  }
}

export function ChartCard({
  title,
  storageKey,
  caption,
  toolbar,
  children,
}: ChartCardProps): JSX.Element {
  const stored = readStored(storageKey)
  const [current, setCurrent] = useState(stored ?? title)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(current)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit(): void {
    const trimmed = draft.trim() || title
    setCurrent(trimmed)
    writeStored(storageKey, trimmed === title ? null : trimmed)
    setEditing(false)
  }

  function cancel(): void {
    setDraft(current)
    setEditing(false)
  }

  function resetToDefault(): void {
    setCurrent(title)
    writeStored(storageKey, null)
    setDraft(title)
  }

  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                else if (e.key === 'Escape') cancel()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--sky)',
                outline: 'none',
                color: 'var(--ink)',
                fontFamily: 'var(--font-display, inherit)',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                padding: '2px 0',
                width: '100%',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(current)
                setEditing(true)
              }}
              title="Click para renombrar"
              className="font-display"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--ink)',
                fontFamily: 'var(--font-display, inherit)',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                cursor: 'text',
                textAlign: 'left',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {current}
            </button>
          )}
          {caption && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{caption}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {storageKey && current !== title && !editing && (
            <button
              type="button"
              onClick={resetToDefault}
              title="Restablecer título original"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 11,
                cursor: 'pointer',
                padding: 4,
                fontFamily: 'inherit',
              }}
            >
              Restablecer
            </button>
          )}
          {toolbar}
        </div>
      </header>
      {children}
    </section>
  )
}
