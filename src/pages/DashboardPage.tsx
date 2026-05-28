import { useEffect, useMemo } from 'react'
import { recordDatasetShape } from '../lib/lastShape'
import { DataTable } from '../components/DataTable'
import { detectDomain } from '../lib/domains'
import type { Accent, Column, Dataset } from '../types/dataset'
import { analyzeColumn, fmtDate, fmtNumber, fmtUnit } from '../lib/stats'
import { StatCard, MiniSpark } from '../components/StatCard'
import { ChartMap, hasGeoCoords } from '../components/ChartMap'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { ExportMenu } from '../components/ExportMenu'
import { SubtypeBadge } from '../components/SubtypeBadge'
import { useSettings } from '../lib/SettingsContext'
import { accentForPalette } from '../lib/palette'
import { FilterProvider, useDashboardFilters } from '../lib/filterContext'
import { equalsFilter } from '../lib/filters'
import { FilterBreadcrumbs } from '../components/FilterBreadcrumbs'

interface DashboardPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onCompare: () => void
  onShare: () => void
  onStory?: () => void
  onSnapshots?: () => void
  isPublic?: boolean
}

const ACCENT_BY_TYPE: Record<string, Accent> = {
  number: 'mint',
  currency: 'mint',
  category: 'plum',
  text: 'sky',
  date: 'sky',
  geo: 'sky',
  boolean: 'plum',
}

function naturalAccent(col: Column): Accent {
  return col.color || ACCENT_BY_TYPE[col.type] || 'sky'
}

export function DashboardPage(props: DashboardPageProps): JSX.Element {
  // FilterProvider wraps the body so column-card chart clicks, table cell
  // clicks and the breadcrumb chain all share one source of truth. We key
  // it by dataset.id so loading a different dataset resets the chain.
  return (
    <FilterProvider key={props.dataset.id}>
      <DashboardBody {...props} />
    </FilterProvider>
  )
}

function DashboardBody(props: DashboardPageProps): JSX.Element {
  const { dataset, onColumnClick, onCompare, onShare, onStory, onSnapshots, isPublic } = props
  const { filters, add, remove, clear, undo, redo, canUndo, canRedo, apply } = useDashboardFilters()
  // Cross-filtering applies the active filter chain to the dataset before any
  // downstream component touches it. Analyses, sparklines, geo strip and the
  // virtualised table all read from the narrowed copy (#143).
  const filtered = useMemo(() => apply(dataset).dataset, [apply, dataset])
  const columnLabelByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of dataset.columns) m.set(c.key, c.label)
    return m
  }, [dataset])
  function onValueClicked(col: Column, value: string): void {
    add(equalsFilter(col.key, value, columnLabelByKey.get(col.key) ?? col.key))
  }
  const { settings } = useSettings()
  const pickAccent = (col: Column): Accent => accentForPalette(settings.palette, naturalAccent(col))

  // Group columns by type. Cached by dataset identity so we don't re-walk all
  // columns on every render (e.g. when an unrelated prop changes upstream).
  // Snapshot the dataset shape so the next upload can render an optimistic
  // skeleton based on what the user typically loads (#186). Best-effort —
  // localStorage failures don't break the render.
  useEffect(() => {
    const numeric = dataset.columns.filter(
      (c) => c.type === 'number' || c.type === 'currency',
    ).length
    const categorical = dataset.columns.filter(
      (c) => c.type === 'category' || c.type === 'text' || c.type === 'boolean' || c.type === 'geo',
    ).length
    const date = dataset.columns.filter((c) => c.type === 'date').length
    const other = dataset.columns.length - numeric - categorical - date
    recordDatasetShape({
      rows: dataset.rows.length,
      columns: dataset.columns.length,
      typeMix: { numeric, categorical, date, other: Math.max(0, other) },
    })
  }, [dataset])

  const { numCols, catCols, dateCols } = useMemo(
    () => ({
      numCols: dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency'),
      catCols: dataset.columns.filter((c) => c.type === 'category' || c.type === 'text'),
      dateCols: dataset.columns.filter((c) => c.type === 'date'),
    }),
    [dataset],
  )

  const analyses = useMemo(
    () => filtered.columns.map((c) => ({ col: c, analysis: analyzeColumn(filtered, c.key) })),
    [filtered],
  )

  // Detect the domain pack matching this dataset (sub-project #2 wire-up).
  // Cached per dataset identity so we don't re-walk packs on unrelated renders.
  const domain = useMemo(() => detectDomain(dataset), [dataset])

  // Row-order numeric values per column, capped to keep the sparkline cheap on
  // very wide datasets. Used by the per-card header sparklines (#71).
  const sparkSeriesByKey = useMemo(() => {
    const map = new Map<string, number[]>()
    const MAX = 200
    const stride = Math.max(1, Math.ceil(filtered.rows.length / MAX))
    for (const col of filtered.columns) {
      if (col.type !== 'number' && col.type !== 'currency') continue
      const series: number[] = []
      for (let i = 0; i < filtered.rows.length; i += stride) {
        const v = Number(filtered.rows[i][col.key])
        if (Number.isFinite(v)) series.push(v)
      }
      if (series.length >= 2) map.set(col.key, series)
    }
    return map
  }, [filtered])

  // Index analyses by column key so per-column lookups inside the JSX become
  // O(1) instead of an Array.find walk over every column on every render.
  const analysisByKey = useMemo(() => {
    const map = new Map<string, (typeof analyses)[number]['analysis']>()
    for (const entry of analyses) map.set(entry.col.key, entry.analysis)
    return map
  }, [analyses])

  const geoCol = useMemo(() => {
    for (const c of filtered.columns) {
      if (c.type !== 'category' && c.type !== 'geo' && c.type !== 'text') continue
      const a = analysisByKey.get(c.key)
      if (!a?.top || a.top.length === 0) continue
      if (a.top.every((t) => hasGeoCoords(t.key))) return c
    }
    return null
  }, [filtered, analysisByKey])

  const geoAnalysis = geoCol ? (analysisByKey.get(geoCol.key) ?? null) : null

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Title bar */}
      <div
        className="flex justify-between"
        style={{ alignItems: 'flex-end', gap: 20, marginBottom: 28 }}
      >
        <div>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
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
            {domain && (
              <span
                title={`Pack detectado: ${domain.pack.description}`}
                style={{
                  background: 'var(--sky-soft, rgba(77,158,250,0.14))',
                  color: 'var(--sky)',
                  fontWeight: 600,
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {domain.pack.label}
              </span>
            )}
            {!isPublic && (
              <span
                style={{
                  background: 'var(--mint-soft)',
                  color: 'var(--mint)',
                  fontWeight: 600,
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 0,
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
              fontSize: 'clamp(26px, 2.8vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Resumen del dataset
          </h1>
          <p className="text-muted" style={{ marginTop: 8, maxWidth: 600, fontSize: 15 }}>
            Hemos detectado {dataset.columns.length} columnas en {dataset.rows.length} filas. Toca
            una tarjeta para ver sus estadísticas completas.
          </p>
        </div>
        {!isPublic && (
          <div className="flex" style={{ gap: 10 }}>
            <button
              onClick={onCompare}
              className="bg-surface border border-border"
              style={{
                color: 'var(--ink-2)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Comparar columnas
            </button>
            {onStory && (
              <button
                onClick={onStory}
                className="bg-surface border border-border"
                style={{
                  color: 'var(--ink-2)',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Leer como historia
              </button>
            )}
            {onSnapshots && (
              <button
                onClick={onSnapshots}
                className="bg-surface border border-border"
                style={{
                  color: 'var(--ink-2)',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Snapshots
              </button>
            )}
            <ExportMenu dataset={dataset} />
            <button
              onClick={onShare}
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

      <FilterBreadcrumbs filters={filters} onRemove={remove} onClear={clear} />
      {(canUndo || canRedo) && filters.length === 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 14,
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: canUndo ? 'var(--ink-2)' : 'var(--muted)',
              padding: '3px 10px',
              fontSize: 11,
              cursor: canUndo ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            ← Deshacer
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: canRedo ? 'var(--ink-2)' : 'var(--muted)',
              padding: '3px 10px',
              fontSize: 11,
              cursor: canRedo ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            Rehacer →
          </button>
          <span>⌘Z / ⌘⇧Z</span>
        </div>
      )}

      {/* Headline stats */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 40,
        }}
      >
        <StatCard
          label="Filas"
          value={<AnimatedNumber value={filtered.rows.length} />}
          accent="sky"
          caption={
            filters.length > 0
              ? `${filtered.rows.length} / ${dataset.rows.length} (filtrado)`
              : 'todas válidas, 0 vacías'
          }
        />
        <StatCard
          label="Columnas"
          value={<AnimatedNumber value={filtered.columns.length} />}
          accent="plum"
          caption={`${numCols.length} num · ${catCols.length} cat · ${dateCols.length} fecha`}
        />
        <StatCard label="Calidad" value="98%" accent="mint" caption="estimación heurística" />
        <StatCard
          label="Última carga"
          value="hoy"
          accent="sky"
          caption={new Date(dataset.createdAt).toLocaleDateString('es-ES')}
        />
      </div>

      {/* Column grid */}
      <div className="flex justify-between items-center" style={{ margin: '4px 4px 14px' }}>
        <div
          className="font-display"
          style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em' }}
        >
          Columnas detectadas
        </div>
        <div className="flex text-muted" style={{ gap: 8, fontSize: 12 }}>
          <span>Número ({numCols.length})</span>
          <span>Categoría ({catCols.length})</span>
          <span>Fecha ({dateCols.length})</span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
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

          if (isNum) {
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat
                  label="media"
                  value={fmtUnit(Math.round((analysis.mean || 0) * 10) / 10, col.unit)}
                />
                <MiniStat
                  label="rango"
                  value={`${fmtNumber(analysis.min)}–${fmtNumber(analysis.max)}`}
                />
              </div>
            )
            preview =
              analysis.histogram && analysis.histogram.length > 0 ? (
                <LabeledBars
                  items={analysis.histogram.slice(0, 4).map((b) => ({
                    label: `${fmtNumber(b.lo)}–${fmtNumber(b.hi)}`,
                    count: b.count,
                  }))}
                  accent={accent}
                  totalForPercent={analysis.count}
                />
              ) : null
          } else if (isCat) {
            const top = analysis.top ?? []
            const allUnique = analysis.distinct != null && analysis.distinct === analysis.count
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat label="únicos" value={String(analysis.distinct ?? 0)} />
                <MiniStat
                  label="moda"
                  value={allUnique ? '—' : String(analysis.mode ?? '—')}
                  truncate
                />
              </div>
            )
            preview = allUnique ? (
              <EmptyPreview text={`Todos los ${analysis.count} valores son distintos`} />
            ) : top.length > 0 ? (
              <LabeledBars
                items={top.slice(0, 3).map((t) => ({ label: String(t.key), count: t.count }))}
                accent={accent}
                totalForPercent={analysis.count}
                onItemClick={(label) => onValueClicked(col, label)}
              />
            ) : (
              <EmptyPreview text="Sin datos" />
            )
          } else if (isDate) {
            primary = (
              <div style={{ display: 'flex', gap: 18 }}>
                <MiniStat label="desde" value={fmtDate(analysis.earliest)} />
                <MiniStat label="hasta" value={fmtDate(analysis.latest)} />
              </div>
            )
            preview =
              analysis.timeline && analysis.timeline.length > 0 ? (
                <MiniSpark
                  values={analysis.timeline.map((t) => t.count)}
                  accent={accent}
                  height={44}
                />
              ) : null
          }

          return (
            <button
              key={col.key}
              onClick={() => onColumnClick(col)}
              className="bg-surface flex flex-col text-left"
              style={{
                border: 'none',
                boxShadow: '0 0 0 1px var(--border)',
                borderRadius: 0,
                padding: 22,
                gap: 18,
                minHeight: 200,
                transition: 'box-shadow .2s ease, background .2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-strong)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px var(--border)'
                e.currentTarget.style.background = 'var(--surface)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span
                    className="inline-flex items-center justify-center font-mono"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 0,
                      background: `var(--${accent}-soft)`,
                      color: `var(--${accent})`,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {isNum ? '#' : isDate ? '⌛' : 'Aa'}
                  </span>
                  <div className="text-ink" style={{ fontWeight: 600, fontSize: 15 }}>
                    {col.label}
                  </div>
                  {isNum && sparkSeriesByKey.has(col.key) && (
                    <div
                      aria-hidden
                      style={{ width: 56, marginLeft: 4, opacity: 0.7 }}
                      title="Tendencia por orden de fila"
                    >
                      <MiniSpark
                        values={sparkSeriesByKey.get(col.key) ?? []}
                        accent={accent}
                        height={18}
                      />
                    </div>
                  )}
                </div>
                <div
                  className="text-muted flex items-center"
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    gap: 6,
                  }}
                >
                  {col.subtype && <SubtypeBadge subtype={col.subtype} />}
                  {col.type}
                </div>
              </div>
              {primary}
              {preview}
              <div
                aria-hidden
                style={{
                  marginTop: 'auto',
                  paddingTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                <span>Ver detalle</span>
                <span style={{ color: `var(--${accent})`, fontSize: 14 }}>→</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Virtualised data table (#39-#60 backlog). Lives below the column
          grid so the dashboard stays the entry point and the table is the
          drill-down surface. */}
      <section style={{ marginTop: 40 }}>
        <div className="flex justify-between items-center" style={{ margin: '4px 4px 14px' }}>
          <div
            className="font-display"
            style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em' }}
          >
            Filas
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            ⌘K para buscar · click en una celda para filtrar por ese valor
          </span>
        </div>
        <DataTable dataset={filtered} />
      </section>

      {/* Geo strip */}
      {geoCol && geoAnalysis?.top && (
        <div
          style={{
            marginTop: 28,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 0,
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
                borderRadius: 0,
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

interface LabeledBarsProps {
  items: { label: string; count: number }[]
  accent: Accent
  totalForPercent: number
  onItemClick?: (label: string) => void
}

function LabeledBars({
  items,
  accent,
  totalForPercent,
  onItemClick,
}: LabeledBarsProps): JSX.Element {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => {
        const pct = Math.max(2, (it.count / max) * 100)
        const share = totalForPercent > 0 ? Math.round((it.count / totalForPercent) * 100) : 0
        const clickable = !!onItemClick
        return (
          <div
            key={i}
            onClick={
              clickable
                ? (e) => {
                    e.stopPropagation()
                    onItemClick(it.label)
                  }
                : undefined
            }
            title={clickable ? `Filtrar por ${it.label}` : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              cursor: clickable ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                flex: '0 0 90px',
                color: 'var(--ink-2)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={it.label}
            >
              {it.label}
            </div>
            <div
              style={{
                flex: 1,
                height: 6,
                background: 'rgba(255,255,255,0.04)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: `var(--${accent})`,
                  opacity: 0.55 + 0.45 * (it.count / max),
                }}
              />
            </div>
            <div
              className="font-mono"
              style={{
                flex: '0 0 auto',
                color: 'var(--ink-2)',
                fontWeight: 500,
                fontSize: 11,
                minWidth: 30,
                textAlign: 'right',
              }}
            >
              {it.count}
            </div>
            <div
              style={{
                flex: '0 0 36px',
                color: 'var(--muted)',
                fontSize: 10,
                textAlign: 'right',
              }}
            >
              {share}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyPreview({ text }: { text: string }): JSX.Element {
  return (
    <div
      style={{
        padding: '12px 0',
        fontSize: 11,
        color: 'var(--muted)',
        fontStyle: 'italic',
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </div>
  )
}
