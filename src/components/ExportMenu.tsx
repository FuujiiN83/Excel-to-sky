import { useEffect, useRef, useState } from 'react'
import type { Dataset } from '../types/dataset'
import { exportDataset, type ExportFormat } from '../lib/exportDataset'
import { pushToast } from '../lib/toast'

interface ExportMenuProps {
  dataset: Dataset
}

const FORMATS: ReadonlyArray<{ value: ExportFormat; label: string; sub: string }> = [
  { value: 'csv', label: 'CSV', sub: 'separado por comas, RFC 4180' },
  { value: 'json', label: 'JSON', sub: 'objetos por fila, listado completo' },
  { value: 'xlsx', label: 'XLSX', sub: 'Excel moderno (recomendado)' },
]

/**
 * Tiny dropdown button: 'Exportar ▾' opens a 220 px popover with the three
 * download options. Click outside or Esc closes it. Successful download
 * pushes a green toast.
 */
export function ExportMenu({ dataset }: ExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent): void {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function pick(format: ExportFormat): Promise<void> {
    setOpen(false)
    try {
      await exportDataset(dataset, format)
      pushToast(`Exportado como ${format.toUpperCase()}.`, 'success', 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo exportar.'
      pushToast(msg, 'error', 5000)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="bg-surface border border-border"
        style={{
          color: 'var(--ink-2)',
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Exportar
        <span aria-hidden style={{ fontSize: 10, opacity: 0.7 }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 70,
            width: 240,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {FORMATS.map((f) => (
            <button
              key={f.value}
              role="menuitem"
              type="button"
              onClick={() => void pick(f.value)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--ink)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
