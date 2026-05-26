import type { Dataset } from '../types/dataset'

interface ColumnDetailPageProps {
  dataset: Dataset
  columnKey: string
  onPickColumn: (key: string) => void
  onBack: () => void
}

export function ColumnDetailPage(props: ColumnDetailPageProps): JSX.Element {
  const { dataset, columnKey, onPickColumn, onBack } = props
  const col = dataset.columns.find((c) => c.key === columnKey) || dataset.columns[0]

  const isNum = col.type === 'number' || col.type === 'currency'
  const isDate = col.type === 'date'

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Column tabs */}
      <div
        className="flex flex-wrap"
        style={{ gap: 8, marginBottom: 22 }}
      >
        <button
          onClick={onBack}
          className="inline-flex items-center border border-border text-muted"
          style={{
            background: 'transparent',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            gap: 6,
          }}
        >
          ← Dashboard
        </button>
        {dataset.columns.map((c) => {
          const active = c.key === col.key
          return (
            <button
              key={c.key}
              onClick={() => onPickColumn(c.key)}
              className="inline-flex items-center"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'var(--border-strong)' : 'transparent',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                color: active ? 'var(--ink)' : 'var(--muted)',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--ink-2)',
                }}
              />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Title */}
      <div className="flex items-center" style={{ gap: 16, marginBottom: 28 }}>
        <div
          className="grid place-items-center font-display"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--surface-2)',
            color: 'var(--ink-2)',
            fontWeight: 700,
            fontSize: 24,
          }}
        >
          {isNum ? '#' : isDate ? '⌛' : 'Aa'}
        </div>
        <div>
          <div
            className="text-muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Columna · {col.type}
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(36px, 4vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '4px 0 0',
            }}
          >
            {col.label}
          </h1>
        </div>
      </div>

      {/* Stat grids by column type — placeholders for Task 7 */}
      {isNum && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 'var(--gap)',
              marginBottom: 22,
            }}
          >
            {['Máximo', 'Mínimo', 'Media', 'Mediana', 'Moda', 'Rango'].map((label) => (
              <div key={label} className="rounded border border-border p-4">
                Stat placeholder: {label}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)' }}
          >
            <div className="rounded border border-border p-4">
              Chart placeholder: histogram (distribución)
            </div>
            <div className="rounded border border-border p-4">
              Chart placeholder: top/bottom values
            </div>
          </div>
        </>
      )}

      {!isNum && !isDate && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--gap)',
              marginBottom: 22,
            }}
          >
            {['Predominante', 'Menos común', 'Valores únicos', 'Concentración'].map((label) => (
              <div key={label} className="rounded border border-border p-4">
                Stat placeholder: {label}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gap)' }}
          >
            <div className="rounded border border-border p-4">
              Chart placeholder: distribución (bars/map)
            </div>
            <div className="rounded border border-border p-4">
              Chart placeholder: donut (reparto)
            </div>
          </div>
        </>
      )}

      {isDate && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--gap)',
              marginBottom: 22,
            }}
          >
            {['Más antiguo', 'Más reciente', 'Días distintos', 'Periodos'].map((label) => (
              <div key={label} className="rounded border border-border p-4">
                Stat placeholder: {label}
              </div>
            ))}
          </div>
          <div className="rounded border border-border p-4">
            Chart placeholder: line chart (línea temporal)
          </div>
        </>
      )}
    </div>
  )
}
