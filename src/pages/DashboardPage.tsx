import type { Column, Dataset } from '../types/dataset'

interface DashboardPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onCompare: () => void
  onShare: () => void
  isPublic?: boolean
}

export function DashboardPage(props: DashboardPageProps): JSX.Element {
  const { dataset, onColumnClick, onCompare, onShare, isPublic } = props

  const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
  const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'text')
  const dateCols = dataset.columns.filter((c) => c.type === 'date')

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Title bar */}
      <div
        className="flex justify-between"
        style={{ alignItems: 'flex-end', gap: 20, marginBottom: 28 }}
      >
        <div>
          <div
            className="flex items-center"
            style={{ gap: 10, marginBottom: 8 }}
          >
            <span
              className="text-muted"
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {dataset.label}
            </span>
            {!isPublic && (
              <span
                style={{
                  background: 'var(--mint-soft)',
                  color: 'var(--mint)',
                  fontWeight: 600,
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Sincronizado
              </span>
            )}
          </div>
          <h1
            className="font-display text-ink"
            style={{
              fontSize: 'clamp(36px, 4vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Resumen del dataset
          </h1>
          <p
            className="text-muted"
            style={{ marginTop: 8, maxWidth: 600, fontSize: 15 }}
          >
            Hemos detectado {dataset.columns.length} columnas en {dataset.rows.length} filas. Toca una tarjeta para ver sus estadísticas completas.
          </p>
        </div>
        {!isPublic && (
          <div className="flex" style={{ gap: 10 }}>
            <button
              onClick={onCompare}
              className="bg-surface border border-border rounded-full"
              style={{
                color: 'var(--ink-2)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Comparar columnas
            </button>
            <button
              onClick={onShare}
              className="rounded-full"
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Compartir dashboard
            </button>
          </div>
        )}
      </div>

      {/* Headline stats — placeholders for Task 7 */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--gap)',
          marginBottom: 28,
        }}
      >
        <div className="rounded border border-border p-4">
          Stat placeholder: Filas ({dataset.rows.length})
        </div>
        <div className="rounded border border-border p-4">
          Stat placeholder: Columnas ({dataset.columns.length} · {numCols.length} num · {catCols.length} cat · {dateCols.length} fecha)
        </div>
        <div className="rounded border border-border p-4">
          Stat placeholder: Calidad
        </div>
        <div className="rounded border border-border p-4">
          Stat placeholder: Última carga
        </div>
      </div>

      {/* Column grid */}
      <div
        className="flex justify-between items-center"
        style={{ margin: '4px 4px 14px' }}
      >
        <div
          className="font-display"
          style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em' }}
        >
          Columnas detectadas
        </div>
        <div
          className="flex text-muted"
          style={{ gap: 8, fontSize: 12 }}
        >
          <span>Número ({numCols.length})</span>
          <span>Categoría ({catCols.length})</span>
          <span>Fecha ({dateCols.length})</span>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }}
      >
        {dataset.columns.map((col) => (
          <button
            key={col.key}
            onClick={() => onColumnClick(col)}
            className="bg-surface border border-border flex flex-col text-left"
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--pad)',
              gap: 14,
              transition: 'all .2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center" style={{ gap: 10 }}>
                <span
                  className="inline-flex items-center justify-center font-mono"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'var(--surface-2)',
                    color: 'var(--ink-2)',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {col.type === 'number' || col.type === 'currency'
                    ? '#'
                    : col.type === 'date'
                      ? '⌛'
                      : 'Aa'}
                </span>
                <div
                  className="text-ink"
                  style={{ fontWeight: 600, fontSize: 15 }}
                >
                  {col.label}
                </div>
              </div>
              <div
                className="text-muted"
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {col.type}
              </div>
            </div>
            <div className="rounded border border-border p-4">
              Chart placeholder: {col.type === 'number' || col.type === 'currency'
                ? 'histogram'
                : col.type === 'date'
                  ? 'sparkline'
                  : 'mini-bars'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
