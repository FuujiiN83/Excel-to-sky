import { useMemo } from 'react'
import type { Accent, Column, Dataset } from '../types/dataset'
import { analyzeColumn, fmtDate, fmtNumber, fmtUnit } from '../lib/stats'
import type { ColumnAnalysis } from '../lib/stats'
import { StatCard } from '../components/StatCard'
import { ChartBar } from '../components/ChartBar'
import { ChartLine } from '../components/ChartLine'
import { ChartMap, hasGeoCoords } from '../components/ChartMap'

interface ColumnDetailPageProps {
  dataset: Dataset
  columnKey: string
  onPickColumn: (key: string) => void
  onBack: () => void
}

function pickAccent(col: Column): Accent {
  return col.color || 'sky'
}

export function ColumnDetailPage(props: ColumnDetailPageProps): JSX.Element {
  const { dataset, columnKey, onPickColumn, onBack } = props
  const col = dataset.columns.find((c) => c.key === columnKey) || dataset.columns[0]
  const analysis = useMemo(() => analyzeColumn(dataset, col.key), [dataset, col.key])

  const isNum = col.type === 'number' || col.type === 'currency'
  const isDate = col.type === 'date'
  const isCat = !isNum && !isDate
  const accent = pickAccent(col)
  const isGeo =
    isCat &&
    !!analysis.top &&
    analysis.top.length > 0 &&
    analysis.top.every((t) => hasGeoCoords(t.key))

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Column tabs */}
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 22 }}>
        <button
          onClick={onBack}
          className="inline-flex items-center border border-border text-muted"
          style={{
            background: 'transparent',
            borderRadius: 0,
            padding: '6px 10px',
            fontSize: 12,
            gap: 6,
          }}
        >
          ← Dashboard
        </button>
        {dataset.columns.map((c) => {
          const active = c.key === col.key
          const cAccent = pickAccent(c)
          return (
            <button
              key={c.key}
              onClick={() => onPickColumn(c.key)}
              className="inline-flex items-center"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'var(--border-strong)' : 'transparent',
                borderRadius: 0,
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
                  borderRadius: 0,
                  background: `var(--${cAccent})`,
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
            width: 40,
            height: 40,
            borderRadius: 0,
            background: `var(--${accent}-soft)`,
            color: `var(--${accent})`,
            fontWeight: 700,
            fontSize: 18,
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
            {col.unit && ` · en ${col.unit}`}
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(26px, 2.8vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '4px 0 0',
            }}
          >
            {col.label}
          </h1>
        </div>
      </div>

      {isNum && <NumberDetail analysis={analysis} col={col} accent={accent} />}
      {isCat && <CategoryDetail analysis={analysis} col={col} accent={accent} isGeo={isGeo} />}
      {isDate && <DateDetail analysis={analysis} col={col} accent={accent} />}
    </div>
  )
}

// ---------- Type-specific sub-views ----------

interface DetailViewProps {
  analysis: ColumnAnalysis
  col: Column
  accent: Accent
}

function NumberDetail({ analysis, col, accent }: DetailViewProps): JSX.Element {
  const histogram = analysis.histogram || []
  const histogramBars = histogram.map((b) => ({
    label: String(Math.round(b.lo)),
    value: b.count,
  }))
  const topBucket = [...histogram]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((b) => ({
      label: `${fmtUnit(Math.round(b.lo), col.unit)}–${fmtUnit(Math.round(b.hi), col.unit)}`,
      value: b.count,
    }))
  const bottomBucket = [...histogram]
    .sort((a, b) => a.count - b.count)
    .slice(0, 5)
    .map((b) => ({
      label: `${fmtUnit(Math.round(b.lo), col.unit)}–${fmtUnit(Math.round(b.hi), col.unit)}`,
      value: b.count,
    }))

  return (
    <>
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 'var(--gap)',
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Máximo"
          value={fmtUnit(analysis.max, col.unit)}
          accent={accent}
          highlight
        />
        <StatCard label="Mínimo" value={fmtUnit(analysis.min, col.unit)} accent={accent} />
        <StatCard
          label="Media"
          value={fmtUnit(
            analysis.mean !== undefined ? Math.round(analysis.mean * 10) / 10 : undefined,
            col.unit,
          )}
          accent={accent}
        />
        <StatCard label="Mediana" value={fmtUnit(analysis.median, col.unit)} accent={accent} />
        <StatCard label="Moda" value={fmtUnit(analysis.mode, col.unit)} accent={accent} />
        <StatCard label="Rango" value={fmtUnit(analysis.range, col.unit)} accent={accent} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)' }}>
        <Card
          title="Distribución"
          sub={`${histogram.length} intervalos · ${fmtNumber(analysis.count)} valores`}
        >
          <ChartBar
            bars={histogramBars}
            accent={accent}
            orientation="vertical"
            footer={{
              min: fmtUnit(analysis.min, col.unit),
              mean: fmtUnit(
                analysis.mean !== undefined ? Math.round(analysis.mean) : undefined,
                col.unit,
              ),
              max: fmtUnit(analysis.max, col.unit),
            }}
          />
        </Card>
        <Card title="Más altos" sub="top 5">
          <ChartBar bars={topBucket} accent={accent} orientation="horizontal" />
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px dashed var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Más bajos
            </div>
            <ChartBar bars={bottomBucket} accent="plum" orientation="horizontal" />
          </div>
        </Card>
      </div>
    </>
  )
}

interface CategoryDetailProps extends DetailViewProps {
  isGeo: boolean
}

function CategoryDetail({ analysis, accent, isGeo }: CategoryDetailProps): JSX.Element {
  const top = analysis.top || []
  const distinct = analysis.distinct || 0
  const count = analysis.count || 1
  const top3Pct = Math.round((top.slice(0, 3).reduce((s, t) => s + t.count, 0) / count) * 100)
  const modeCount = analysis.modeCount || 0

  return (
    <>
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--gap)',
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Predominante"
          value={String(analysis.mode ?? '—')}
          accent={accent}
          highlight
          caption={`${modeCount} apariciones (${Math.round((modeCount / count) * 100)}%)`}
        />
        <StatCard
          label="Menos común"
          value={String(analysis.least ?? '—')}
          accent={accent}
          caption={`${analysis.leastCount ?? 0} aparición${analysis.leastCount === 1 ? '' : 'es'}`}
        />
        <StatCard
          label="Valores únicos"
          value={distinct}
          accent={accent}
          caption={`sobre ${fmtNumber(count)} entradas`}
        />
        <StatCard
          label="Concentración"
          value={`${top3Pct}%`}
          accent={accent}
          caption="top 3 / total"
        />
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: isGeo ? '1.5fr 1fr' : '1.4fr 1fr', gap: 'var(--gap)' }}
      >
        <Card
          title={isGeo ? 'Mapa de distribución' : 'Distribución'}
          sub={`top ${top.length} de ${distinct}`}
        >
          {isGeo ? (
            <ChartMap
              locations={top.map((t) => ({ name: t.key, value: t.count }))}
              accent={accent}
              mode="world"
            />
          ) : (
            <ChartBar
              bars={top.map((t) => ({ label: t.key, value: t.count }))}
              accent={accent}
              orientation="horizontal"
            />
          )}
        </Card>
        <Card title="Reparto" sub="proporción del total">
          <ChartBar
            bars={top.slice(0, 6).map((t) => ({ label: t.key, value: t.count }))}
            accent={accent}
            orientation="horizontal"
          />
        </Card>
      </div>
    </>
  )
}

function DateDetail({ analysis, accent }: DetailViewProps): JSX.Element {
  const timeline = analysis.timeline || []
  return (
    <>
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--gap)',
          marginBottom: 22,
        }}
      >
        <StatCard label="Más antiguo" value={fmtDate(analysis.earliest)} accent={accent} />
        <StatCard label="Más reciente" value={fmtDate(analysis.latest)} accent={accent} highlight />
        <StatCard label="Días distintos" value={analysis.distinct ?? 0} accent={accent} />
        <StatCard
          label="Periodos"
          value={timeline.length}
          accent={accent}
          caption="meses con actividad"
        />
      </div>
      <Card title="Línea temporal" sub="conteo por mes">
        <ChartLine points={timeline.map((p) => ({ x: p.key, y: p.count }))} accent={accent} />
      </Card>
    </>
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
        borderRadius: 0,
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
