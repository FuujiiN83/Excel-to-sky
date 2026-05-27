import { useEffect, useState } from 'react'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** When true, the confirm button is styled in coral to mark a destructive action. */
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/** Module-level setter wired up by <ConfirmModalHost />. */
let publish: ((p: PendingConfirm | null) => void) | null = null

/**
 * Promise-based replacement for window.confirm() with our own styling and
 * keyboard semantics. Usage:
 *
 *   const ok = await confirm({ title: '¿Borrar?', destructive: true })
 *   if (ok) doIt()
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!publish) {
      // No host mounted — fall back to native confirm so the call still works
      // in tests or pre-mount edge cases.
      resolve(window.confirm(opts.title))
      return
    }
    publish({ ...opts, resolve })
  })
}

/**
 * Mount this component once at the app root. It listens for `confirm()` calls
 * and renders the modal.
 */
export function ConfirmModalHost(): JSX.Element | null {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  useEffect(() => {
    publish = setPending
    return () => {
      publish = null
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        pending?.resolve(false)
        setPending(null)
      } else if (e.key === 'Enter') {
        pending?.resolve(true)
        setPending(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  if (!pending) return null

  function close(ok: boolean): void {
    pending?.resolve(ok)
    setPending(null)
  }

  const destructive = pending.destructive === true

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ets-confirm-title"
      onClick={() => close(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: 'rgba(0,0,0,0.6)',
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
          padding: '24px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,0.7)',
        }}
      >
        <h2
          id="ets-confirm-title"
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          {pending.title}
        </h2>
        {pending.body && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
              margin: '12px 0 0',
            }}
          >
            {pending.body}
          </p>
        )}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => close(false)}
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--border-strong)',
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {pending.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            autoFocus
            style={{
              background: destructive ? 'var(--coral)' : 'var(--ink)',
              color: destructive ? '#fff' : 'var(--bg)',
              border: 'none',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {pending.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
