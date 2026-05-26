import { SAMPLE_DATASETS } from '../samples'
import type { Dataset } from '../types/dataset'
import { UploadDropzone } from '../components/UploadDropzone'

interface UploadPageProps {
  onParsed: (dataset: Dataset) => void
  onUseSample: (sampleId: string) => void
}

export function UploadPage({ onParsed, onUseSample }: UploadPageProps): JSX.Element {
  return (
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
          className="text-muted"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          Beta abierta · ningún dato sale de tu navegador
        </div>
        <h1
          className="font-display text-ink"
          style={{
            fontSize: 'clamp(48px, 5.4vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 0.96,
            margin: 0,
          }}
        >
          Tu Excel,
          <br />
          <span
            style={{
              background:
                'linear-gradient(120deg, #2E6BFF 0%, #8B5CF6 50%, #FF7159 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            al cielo.
          </span>
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--ink-2)',
            lineHeight: 1.5,
            marginTop: 22,
            maxWidth: 480,
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
  )
}
