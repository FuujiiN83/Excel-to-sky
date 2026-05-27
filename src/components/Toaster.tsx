import { useEffect, useState } from 'react'
import { subscribeToasts, type Toast } from '../lib/toast'

export function Toaster(): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev, t])
      if (t.timeoutMs > 0) {
        window.setTimeout(() => dismiss(t.id), t.timeoutMs)
      }
    })
  }, [])

  function dismiss(id: string): void {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: 96,
        right: 16,
        zIndex: 95,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps): JSX.Element {
  const accent = KIND_ACCENT[toast.kind]
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onClick={onClose}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        background: 'var(--surface, rgba(20,22,28,0.94))',
        color: 'var(--ink)',
        borderLeft: `3px solid ${accent}`,
        boxShadow: '0 0 0 1px var(--border-strong), 0 18px 40px -16px rgba(0,0,0,0.6)',
        padding: '10px 14px',
        minWidth: 240,
        maxWidth: 360,
        fontSize: 13,
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          marginTop: 6,
          background: accent,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{toast.message}</span>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          fontSize: 14,
          lineHeight: 1,
          padding: 2,
          marginLeft: 4,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  )
}

const KIND_ACCENT: Record<Toast['kind'], string> = {
  info: 'var(--sky)',
  success: 'var(--mint)',
  error: 'var(--coral)',
}
