import { useRef, useState } from 'react'
import { exportSvgElementAsPng, exportSvgElementAsSvg } from '../lib/exportChart'
import { pushToast } from '../lib/toast'

interface ChartExportButtonProps {
  /** Filename stem (no extension). */
  baseName: string
  /** When the consumer wraps the chart with this component, the ref points to the wrapped <svg>. */
  children: React.ReactNode
}

/**
 * Wraps a chart and exposes a small 'Exportar' menu (PNG / SVG). The wrapped
 * children must contain exactly one <svg> at any depth — the first one is
 * picked. Use the ChartExportButton.Anchor below for raw-SVG charts that
 * don't have a single root.
 */
export function ChartExportButton({ baseName, children }: ChartExportButtonProps): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function findSvg(): SVGSVGElement | null {
    return wrapperRef.current?.querySelector('svg') ?? null
  }

  async function exportAs(kind: 'png' | 'svg'): Promise<void> {
    const svg = findSvg()
    if (!svg) {
      pushToast('No se encuentra un SVG dentro del gráfico.', 'error', 4000)
      return
    }
    setBusy(true)
    setOpen(false)
    try {
      if (kind === 'svg') {
        exportSvgElementAsSvg(svg, baseName)
      } else {
        await exportSvgElementAsPng(svg, baseName)
      }
      pushToast(`Gráfico exportado como ${kind.toUpperCase()}.`, 'success', 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo exportar.'
      pushToast(msg, 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {children}
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Exportar gráfico"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--muted)',
            padding: '3px 8px',
            fontSize: 10,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          ⬇
        </button>
        {open && (
          <div
            role="menu"
            onMouseLeave={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 30,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 120,
            }}
          >
            <button
              type="button"
              onClick={() => void exportAs('png')}
              role="menuitem"
              style={menuItem}
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => void exportAs('svg')}
              role="menuitem"
              style={menuItem}
            >
              SVG
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const menuItem = {
  background: 'transparent',
  border: 'none',
  padding: '8px 12px',
  textAlign: 'left' as const,
  fontFamily: 'inherit',
  fontSize: 12,
  color: 'var(--ink)',
  cursor: 'pointer',
}
