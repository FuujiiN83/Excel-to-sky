import { useEffect } from 'react'
import type { Column, Dataset } from '../types/dataset'
import { DashboardPage } from './DashboardPage'
import { installOGImage } from '../lib/ogImage'

interface PublicViewPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onExit: () => void
}

export function PublicViewPage(props: PublicViewPageProps): JSX.Element {
  const { dataset, onColumnClick, onExit } = props

  // Stamp a canvas-rendered 1200×630 OG card into the live document meta
  // tags (#155). Doesn't help server-side crawlers — they read the static
  // /og-default.svg — but it lets browser-side "share to X" buttons pick up
  // a dataset-specific image when the user is already viewing the page.
  useEffect(() => {
    void installOGImage(dataset)
  }, [dataset])

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        className="border-b border-border"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--sky) 18%, var(--bg)) 0%, var(--bg) 70%)',
          padding: '18px 28px 22px',
        }}
      >
        <div
          className="flex justify-between items-center"
          style={{ maxWidth: 1400, margin: '0 auto' }}
        >
          <div className="flex items-center" style={{ gap: 14 }}>
            <div
              className="rounded"
              style={{
                width: 24,
                height: 24,
                background: 'linear-gradient(155deg, #2E6BFF 0%, #8B5CF6 60%, #FF7159 100%)',
              }}
            />
            <span
              className="bg-surface border border-border text-muted"
              style={{
                borderRadius: 0,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              VISTA PÚBLICA · SOLO LECTURA
            </span>
          </div>
          <div className="flex" style={{ gap: 10 }}>
            <button
              onClick={onExit}
              className="bg-surface border border-border"
              style={{
                color: 'var(--ink-2)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ← Volver al editor
            </button>
            <button
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Descargar PDF
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 0 6px' }}>
          <div
            className="text-muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Compartido por Lucía Méndez · 21 may 2026
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(40px, 4.6vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '8px 0 0',
            }}
          >
            {dataset.label.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
          </h1>
        </div>
      </div>
      <DashboardPage
        dataset={dataset}
        onColumnClick={onColumnClick}
        onCompare={() => {}}
        onShare={() => {}}
        isPublic
      />
      <div
        className="text-muted border-t border-border"
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: 12,
        }}
      >
        Hecho con{' '}
        <span className="text-ink-2" style={{ fontWeight: 600 }}>
          Excel to Sky
        </span>{' '}
        · convierte tus hojas de cálculo en dashboards
      </div>
    </div>
  )
}
