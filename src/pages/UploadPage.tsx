import { useState } from 'react'
import { SAMPLE_DATASETS } from '../samples'

interface UploadPageProps {
  onLoad: (datasetId: string) => void
}

export function UploadPage({ onLoad }: UploadPageProps): JSX.Element {
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  function simulateLoad(id: string): void {
    setLoading(id)
    setProgress(0)
    let p = 0
    const itv = setInterval(() => {
      p += 6 + Math.random() * 14
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(itv)
        setTimeout(() => onLoad(id), 220)
      }
    }, 60)
  }

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
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            simulateLoad('personas')
          }}
          style={{
            position: 'relative',
            border: `2px dashed ${drag ? 'var(--sky)' : 'var(--border-strong)'}`,
            background: drag ? 'var(--sky-soft)' : 'var(--surface)',
            borderRadius: 28,
            padding: '54px 36px',
            textAlign: 'center',
            transition: 'all .2s ease',
            boxShadow: drag
              ? '0 22px 60px -28px rgba(46,107,255,0.45)'
              : 'var(--shadow)',
          }}
        >
          <div
            className="inline-flex"
            style={{ position: 'relative', marginBottom: 18 }}
          >
            <div
              className="bg-surface-2 border border-border"
              style={{
                width: 64,
                height: 80,
                borderRadius: 10,
                transform: 'rotate(-6deg) translateX(8px)',
              }}
            />
            <div
              className="bg-surface border border-border-strong grid place-items-center font-mono"
              style={{
                width: 64,
                height: 80,
                borderRadius: 10,
                position: 'absolute',
                left: 14,
                top: 6,
                fontWeight: 700,
                color: 'var(--mint)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <span
                style={{
                  background: 'var(--mint-soft)',
                  padding: '3px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                .xlsx
              </span>
            </div>
          </div>
          <div
            className="font-display text-ink"
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Arrastra tu Excel aquí
          </div>
          <div className="text-muted" style={{ fontSize: 14, marginTop: 6 }}>
            o{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                simulateLoad('personas')
              }}
              style={{ color: 'var(--sky)', fontWeight: 500 }}
            >
              busca un archivo
            </a>{' '}
            en tu equipo · .xlsx, .csv, .ods · hasta 25 MB
          </div>
          {loading && (
            <div
              style={{
                marginTop: 24,
                maxWidth: 400,
                marginLeft: 'auto',
                marginRight: 'auto',
                textAlign: 'left',
              }}
            >
              <div
                className="flex justify-between text-muted"
                style={{ fontSize: 12, marginBottom: 6 }}
              >
                <span>Analizando columnas…</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--sky)',
                    borderRadius: 999,
                    transition: 'width .12s linear',
                  }}
                />
              </div>
            </div>
          )}
        </div>

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
              onClick={() => simulateLoad(ds.id)}
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
