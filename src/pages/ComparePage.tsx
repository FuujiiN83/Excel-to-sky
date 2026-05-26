import { useMemo, useState } from 'react'
import type { Accent, Column, Dataset } from '../types/dataset'
import { coercePairs, fmtUnit, groupAggregate } from '../lib/stats'
import { StatCard } from '../components/StatCard'
import { ChartBar } from '../components/ChartBar'
import { ChartScatter } from '../components/ChartScatter'

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

function aggLabel(a: Aggregation): string {
  return AGG_OPTIONS.find((o) => o.value === a)?.label || a
}

function pickAccent(col: Column): Accent {
  return col.color || 'sky'
}

export function ComparePage({ dataset, onBack }: ComparePageProps): JSX.Element {
  const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
  const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'text')
  const dateCols = dataset.columns.filter((c) => c.type === 'date')

  const defaultGroup = catCols[0] || dataset.columns[0]
  const defaultMetric = numCols[0] || dataset.columns[1] || dataset.columns[0]
  const defaultScatterY = numCols[1] || numCols[0] || dataset.columns[0]

  const [groupKey, setGroupKey] = useState(defaultGroup.key)
  const [metricKey, setMetricKey] = useState(defaultMetric.key)
  const [agg, setAgg] = useState<Aggregation>('avg')
  const [scatterX, setScatterX] = useState(defaultMetric.key)
  const [scatterY, setScatterY] = useState(defaultScatterY.key)

  const groupCol = dataset.columns.find((c) => c.key === groupKey) || defaultGroup
  const metricCol = dataset.columns.find((c) => c.key === metricKey) || defaultMetric
  const xCol = dataset.columns.find((c) => c.key === scatterX) || defaultMetric
  const yCol = dataset.columns.find((c) => c.key === scatterY) || defaultScatterY

  const grouped = useMemo(() => {
    const aggregates = groupAggregate(dataset, groupKey, metricKey)
    return [...aggregates].sort((a, b) => (b[agg] as number) - (a[agg] as number))
  }, [dataset, groupKey, metricKey, agg])

  const top = grouped.slice(0, 12)
  const winner = grouped[0]
  const loser = grouped[grouped.length - 1]

  const scatterPoints = useMemo(
    () => coercePairs(dataset, scatterX, scatterY),
    [dataset, scatterX, scatterY]
  )

  const metricAccent = pickAccent(metricCol)
  const groupAccent = pickAccent(groupCol)

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

      {/* Controls — group / agg / metric */}
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
        <span className="text-muted" style={{ padding: '6px 10px', fontSize: 12 }}>
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
        <span className="text-muted" style={{ padding: '6px 10px', fontSize: 12 }}>
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
        <span className="text-muted" style={{ padding: '6px 10px', fontSize: 12 }}>
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

      {/* Headline */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1.4fr 1fr 1fr',
          gap: 'var(--gap)',
          marginBottom: 22,
        }}
      >
        <StatCard
          label={`${
            agg === 'count'
              ? 'Mayor recuento'
              : agg === 'sum'
                ? 'Mayor suma'
                : agg === 'min'
                  ? 'Menor valor'
                  : agg === 'max'
                    ? 'Mayor valor'
                    : 'Mayor media'
          } de ${metricCol.label.toLowerCase()}`}
          value={winner ? winner.key : '—'}
          accent={metricAccent}
          highlight
          caption={
            winner
              ? `${fmtUnit(Math.round((winner[agg] as number) * 10) / 10, metricCol.unit)} · ${winner.count} filas`
              : undefined
          }
        />
        <StatCard
          label="Menor"
          value={loser ? loser.key : '—'}
          accent={groupAccent}
          caption={
            loser
              ? `${fmtUnit(Math.round((loser[agg] as number) * 10) / 10, metricCol.unit)}`
              : undefined
          }
        />
        <StatCard
          label="Spread"
          value={
            winner && loser
              ? `${Math.round(((winner[agg] as number) / Math.max(1, loser[agg] as number)) * 10) / 10}×`
              : '—'
          }
          accent="amber"
          caption="diferencia entre top y bottom"
        />
      </div>

      <Card
        title={`${aggLabel(agg)} de ${metricCol.label.toLowerCase()} por ${groupCol.label.toLowerCase()}`}
        sub={`${top.length} grupos`}
      >
        <ChartBar
          bars={top.map((g) => ({
            label: g.key,
            value: Math.round((g[agg] as number) * 10) / 10,
          }))}
          accent={metricAccent}
          orientation="horizontal"
        />
      </Card>

      <div
        className="grid"
        style={{
          marginTop: 22,
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--gap)',
        }}
      >
        <Card title="Volumen por grupo" sub="cuántas filas tiene cada uno">
          <ChartBar
            bars={top.map((g) => ({ label: g.key, value: g.count }))}
            accent={groupAccent}
            orientation="horizontal"
          />
        </Card>
        <Card title="Dispersión" sub="cruzar dos métricas numéricas">
          {/* Scatter controls */}
          <div
            className="flex flex-wrap items-center"
            style={{ gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}
          >
            <span>X</span>
            <select
              value={scatterX}
              onChange={(e) => setScatterX(e.target.value)}
              className="bg-surface-2 border border-border rounded"
              style={{ padding: '4px 8px', fontSize: 12, color: 'var(--ink)' }}
            >
              {numCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <span>Y</span>
            <select
              value={scatterY}
              onChange={(e) => setScatterY(e.target.value)}
              className="bg-surface-2 border border-border rounded"
              style={{ padding: '4px 8px', fontSize: 12, color: 'var(--ink)' }}
            >
              {numCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <ChartScatter
            points={scatterPoints}
            accent={pickAccent(yCol)}
            xLabel={xCol.label}
            yLabel={yCol.label}
          />
        </Card>
      </div>
    </div>
  )
}

interface CardProps {
  title: string
  sub?: string
  children: React.ReactNode
}

function Card({ title, sub, children }: CardProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--pad-lg)',
      }}
    >
      <div style={{ marginBottom: 18 }}>
        {sub && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {sub}
          </div>
        )}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 22,
            marginTop: 4,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
      </div>
      {children}
    </div>
  )
}
