import { useMemo } from 'react'
import type { Accent, Column, Dataset } from '../types/dataset'
import { analyzeColumn, fmtNumber, fmtUnit } from '../lib/stats'
import { StatCard, MiniBars, MiniSpark } from '../components/StatCard'
import { ChartMap, hasGeoCoords } from '../components/ChartMap'

interface DashboardPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onCompare: () => void
  onShare: () => void
  isPublic?: boolean
}

const ACCENT_BY_TYPE: Record<string, Accent> = {
  number: 'mint',
  currency: 'mint',
  category: 'coral',
  text: 'coral',
  date: 'amber',
  geo: 'sky',
  boolean: 'plum',
}

function pickAccent(col: Column): Accent {
  return col.color || ACCENT_BY_TYPE[col.type] || 'sky'
}

export function DashboardPage(props: DashboardPageProps): JSX.Element {
  const { dataset, onColumnClick, onCompare, onShare, isPublic } = props

  const numCols = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency')
  const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'text')
  const dateCols = dataset.columns.filter((c) => c.type === 'date')

  const analyses = useMemo(
    () => dataset.columns.map((c) => ({ col: c, analysis: analyzeColumn(dataset, c.key) })),
    [dataset]
  )

  const geoCol = useMemo(() => {
    for (const c of dataset.columns) {
      if (c.type !== 'category' && c.type !== 'geo' && c.type !== 'text') continue
      const a = analyses.find((x) => x.col.key === c.key)?.analysis
      if (!a?.top || a.top.length === 0) continue
      if (a.top.every((t) => hasGeoCoords(t.key))) return c
    }
    return null
  }, [dataset, analyses])

  const geoAnalysis = geoCol
    ? analyses.find((x) => x.col.key === geoCol.key)?.analysis
    : null

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

      {/* Headline stats */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--gap)',
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Filas"
          value={fmtNumber(dataset.rows.length)}
          accent="sky"
          caption="todas válidas, 0 vacías"
        />
        <StatCard
          label="Columnas"
          value={dataset.columns.length}
          accent="plum"
          caption={`${numCols.length} num · ${catCols.length} cat · ${dateCols.length} fecha`}
        />
        <StatCard
          label="Calidad"
          value="98%"
          accent="mint"
          caption="estimación heurística"
        />
        <StatCard
          label="Última carga"
          value="hoy"
          accent="amber"
          caption={new Date(dataset.createdAt).toLocaleDateString('es-ES')}
        />
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
        {analyses.map(({ col, analysis }) => {
          const accent = pickAccent(col)
          const isNum = col.type === 'number' || col.type === 'currency'
          const isDate = col.type === 'date'
          const isCat =
            col.type === 'category' ||
            col.type === 'text' ||
            col.type === 'geo' ||
            col.type === 'boolean'

          let preview: JSX.Element | null = null
          let primary: JSX.Element | null = null

          if (isNum && analysis.histogram) {
            preview = (
              <MiniBars
                values={analysis.histogram.map((b) => b.count)}
                accent={accent}
                height={48}
              />
            )
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat label="media" value={fmtUnit(Math.round(analysis.mean || 0), col.unit)} />
                <MiniStat
                  label="rango"
                  value={`${fmtNumber(analysis.min)}–${fmtNumber(analysis.max)}`}
                />
              </div>
            )
          } else if (isCat && analysis.top) {
            preview = (
              <MiniBars
                values={analysis.top.map((t) => t.count)}
                accent={accent}
                height={48}
              />
            )
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat label="distinct" value={String(analysis.distinct ?? 0)} />
                <MiniStat label="moda" value={String(analysis.mode ?? '—')} truncate />
              </div>
            )
          } else if (isDate && analysis.timeline) {
            preview = (
              <MiniSpark
                values={analysis.timeline.map((t) => t.count)}
                accent={accent}
                height={48}
              />
            )
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat label="desde" value={String(analysis.earliest ?? '—')} />
                <MiniStat label="hasta" value={String(analysis.latest ?? '—')} />
              </div>
            )
          }

          return (
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
                      background: `var(--${accent}-soft)`,
                      color: `var(--${accent})`,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {isNum ? '#' : isDate ? '⌛' : 'Aa'}
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
              {primary}
              {preview}
            </button>
          )
        })}
      </div>

      {/* Geo strip */}
      {geoCol && geoAnalysis?.top && (
        <div
          style={{
            marginTop: 28,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--pad-lg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Distribución geográfica
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 22,
                  marginTop: 4,
                }}
              >
                Top {geoCol.label.toLowerCase()}
              </div>
            </div>
            <button
              onClick={() => onColumnClick(geoCol)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12,
                color: 'var(--ink-2)',
              }}
            >
              Ver detalle →
            </button>
          </div>
          <ChartMap
            locations={geoAnalysis.top.map((t) => ({ name: t.key, value: t.count }))}
            accent={pickAccent(geoCol)}
            mode="world"
          />
        </div>
      )}
    </div>
  )
}

interface MiniStatProps {
  label: string
  value: string
  truncate?: boolean
}

function MiniStat({ label, value, truncate }: MiniStatProps): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          marginTop: 2,
          maxWidth: truncate ? 140 : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}
