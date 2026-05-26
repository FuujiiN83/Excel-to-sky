import { useEffect, useState } from 'react'
import { SAMPLE_DATASETS } from '../samples'
import type { Dataset } from '../types/dataset'
import { UploadDropzone } from '../components/UploadDropzone'
import { listLocalDashboards, type LocalDashboard } from '../lib/localDb'

interface UploadPageProps {
  onParsed: (dataset: Dataset) => void
  onUseSample: (sampleId: string) => void
  hasActiveDashboard?: boolean
  onReturnToDashboard?: () => void
}

export function UploadPage({
  onParsed,
  onUseSample,
  hasActiveDashboard,
  onReturnToDashboard,
}: UploadPageProps): JSX.Element {
  const [mine, setMine] = useState<LocalDashboard[]>([])

  useEffect(() => {
    void listLocalDashboards().then(setMine)
  }, [])

  const created = mine.filter((d) => d.owner === 'created')
  const visited = mine.filter((d) => d.owner === 'visited')

  return (
    <>
    {hasActiveDashboard && onReturnToDashboard && (
      <div
        style={{
          padding: '16px 64px 0',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <button
          onClick={onReturnToDashboard}
          className="bg-surface border border-border text-ink"
          style={{
            borderRadius: 999,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Volver al dashboard actual
        </button>
      </div>
    )}
    <div
      className="grid"
      style={{
        minHeight: 'calc(100vh - 64px)',
        gridTemplateColumns: '1fr 1.1fr',
      }}
    >
      {/* Left — pitch */}
      <div
        className="flex flex-col justify-center"
        style={{ padding: '80px 64px 60px', maxWidth: 640 }}
      >
        <div
          className="inline-flex items-center"
          style={{
            alignSelf: 'flex-start',
            gap: 8,
            padding: '5px 12px 5px 5px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.025)',
            boxShadow: '0 0 0 1px var(--border)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--mint-soft)',
              color: 'var(--mint)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            ●
          </span>
          Beta abierta
        </div>
        <h1
          className="font-display text-ink"
          style={{
            fontSize: 'clamp(44px, 5vw, 68px)',
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          Tu Excel,
          <br />
          <span
            style={{
              background: 'linear-gradient(120deg, var(--sky) 0%, var(--plum) 50%, var(--mint) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              fontWeight: 600,
            }}
          >
            con sentido.
          </span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--ink-2)',
            lineHeight: 1.6,
            marginTop: 18,
            maxWidth: 460,
          }}
        >
          Suelta una hoja de cálculo y conviértela en un dashboard navegable.
          Detectamos cada columna, calculamos sus estadísticas y elegimos la
          visualización que mejor cuenta la historia.
        </p>
        <ul
          className="flex flex-col"
          style={{ listStyle: 'none', padding: 0, margin: '34px 0 0', gap: 10 }}
        >
          {(
            [
              ['Auto', 'Detecta tipos: número, fecha, categoría, texto, geo.'],
              ['Stats', 'MAX, MIN, MODA, MEDIA, rango y outliers para cada columna.'],
              ['Share', 'Un link público y la historia queda contada en 1 clic.'],
            ] as const
          ).map(([k, t]) => (
            <li key={k} className="flex items-center" style={{ gap: 14 }}>
              <span
                className="font-mono bg-surface border border-border text-ink"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                {k}
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right — drop zone + samples */}
      <div
        className="flex flex-col justify-center"
        style={{ padding: '60px 64px 60px 0', gap: 18 }}
      >
        <UploadDropzone onParsed={onParsed} />

        <div
          className="flex items-center text-muted"
          style={{ gap: 12, fontSize: 12 }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span>o prueba con un ejemplo</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
        >
          {Object.values(SAMPLE_DATASETS).map((ds) => (
            <button
              key={ds.id}
              onClick={() => onUseSample(ds.id)}
              className="bg-surface border border-border flex flex-col text-left"
              style={{
                borderRadius: 16,
                padding: 16,
                gap: 6,
                transition: 'all .15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: 20 }}>📊</div>
              <div
                className="text-ink"
                style={{ fontWeight: 600, fontSize: 14 }}
              >
                {ds.label}
              </div>
              <div
                className="text-muted font-mono"
                style={{ fontSize: 11 }}
              >
                {ds.rows.length} filas · {ds.columns.length} cols
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>

    {(created.length > 0 || visited.length > 0) && (
      <section className="mt-12" style={{ maxWidth: 1024, margin: '48px auto', padding: '0 64px' }}>
        <h2 className="font-display text-xl mb-4" style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Mis dashboards
        </h2>
        {created.length > 0 && (
          <>
            <p className="text-muted text-sm mb-2" style={{ fontSize: 13, marginBottom: 8 }}>
              Creados por ti
            </p>
            <ul
              className="grid grid-cols-2 gap-2 mb-6"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {created.map((d) => (
                <li key={d.slug}>
                  <button
                    onClick={() => {
                      window.location.pathname = `/d/${d.slug}`
                    }}
                    className="w-full text-left rounded border border-border p-3 hover:border-ink transition-colors"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      padding: 12,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <p className="font-medium" style={{ fontWeight: 500, margin: 0 }}>
                      {d.name}
                    </p>
                    <p
                      className="text-muted text-xs font-mono"
                      style={{ fontSize: 11, color: 'var(--ink-2)', margin: 0 }}
                    >
                      {d.slug}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {visited.length > 0 && (
          <>
            <p className="text-muted text-sm mb-2" style={{ fontSize: 13, marginBottom: 8 }}>
              Vistos recientemente
            </p>
            <ul
              className="grid grid-cols-2 gap-2"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {visited.map((d) => (
                <li key={d.slug}>
                  <button
                    onClick={() => {
                      window.location.pathname = `/d/${d.slug}`
                    }}
                    className="w-full text-left rounded border border-border p-3 hover:border-ink transition-colors"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      padding: 12,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <p className="font-medium" style={{ fontWeight: 500, margin: 0 }}>
                      {d.name}
                    </p>
                    <p
                      className="text-muted text-xs font-mono"
                      style={{ fontSize: 11, color: 'var(--ink-2)', margin: 0 }}
                    >
                      {d.slug}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    )}
    </>
  )
}
