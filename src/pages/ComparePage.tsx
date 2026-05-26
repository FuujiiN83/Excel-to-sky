import { useState } from 'react'
import type { Dataset } from '../types/dataset'

interface ComparePageProps {
  dataset: Dataset
  onBack: () => void
}

type Aggregation = 'avg' | 'sum' | 'count' | 'max' | 'min'

const AGG_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: 'avg', label: 'media' },
  { value: 'sum', label: 'suma' },
  { value: 'count', label: 'recuento' },
  { value: 'max', label: 'máximo' },
  { value: 'min', label: 'mínimo' },
]

export function ComparePage({ dataset, onBack }: ComparePageProps): JSX.Element {
  const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
  const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'text')
  const dateCols = dataset.columns.filter((c) => c.type === 'date')

  const defaultGroup = catCols[0] || dataset.columns[0]
  const defaultMetric = numCols[0] || dataset.columns[1] || dataset.columns[0]

  const [groupKey, setGroupKey] = useState(defaultGroup.key)
  const [metricKey, setMetricKey] = useState(defaultMetric.key)
  const [agg, setAgg] = useState<Aggregation>('avg')

  const groupCol = dataset.columns.find((c) => c.key === groupKey) || defaultGroup
  const metricCol = dataset.columns.find((c) => c.key === metricKey) || defaultMetric

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <button
        onClick={onBack}
        className="border border-border text-muted"
        style={{
          background: 'transparent',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          marginBottom: 22,
        }}
      >
        ← Dashboard
      </button>

      <div style={{ marginBottom: 24 }}>
        <div
          className="text-muted"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Gráficos comparativos
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Cruza columnas y mira qué pasa.
        </h1>
      </div>

      {/* Controls */}
      <div
        className="flex flex-wrap items-center bg-surface border border-border"
        style={{
          gap: 10,
          borderRadius: 999,
          padding: 8,
          marginBottom: 24,
          width: 'fit-content',
        }}
      >
        <span
          className="text-muted"
          style={{ padding: '6px 10px', fontSize: 12 }}
        >
          Agrupar por
        </span>
        <select
          value={groupKey}
          onChange={(e) => setGroupKey(e.target.value)}
          className="bg-surface-2 border border-border rounded-full"
          style={{
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          {[...catCols, ...dateCols].map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <span
          className="text-muted"
          style={{ padding: '6px 10px', fontSize: 12 }}
        >
          Mostrar
        </span>
        <select
          value={agg}
          onChange={(e) => setAgg(e.target.value as Aggregation)}
          className="bg-surface-2 border border-border rounded-full"
          style={{
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          {AGG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          className="text-muted"
          style={{ padding: '6px 10px', fontSize: 12 }}
        >
          de
        </span>
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          className="bg-surface-2 border border-border rounded-full"
          style={{
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          {numCols.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Headline — placeholders for Task 7 */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1.4fr 1fr 1fr',
          gap: 'var(--gap)',
          marginBottom: 22,
        }}
      >
        <div className="rounded border border-border p-4">
          Stat placeholder: ganador ({metricCol.label} por {groupCol.label})
        </div>
        <div className="rounded border border-border p-4">
          Stat placeholder: menor
        </div>
        <div className="rounded border border-border p-4">
          Stat placeholder: spread
        </div>
      </div>

      <div className="rounded border border-border p-4">
        Chart placeholder: horizontal bars — {agg} de {metricCol.label} por {groupCol.label}
      </div>

      <div
        className="grid"
        style={{
          marginTop: 22,
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--gap)',
        }}
      >
        <div className="rounded border border-border p-4">
          Chart placeholder: volumen por grupo
        </div>
        <div className="rounded border border-border p-4">
          Insight placeholder: lo que destaca
        </div>
      </div>
    </div>
  )
}
