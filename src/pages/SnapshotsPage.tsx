import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from '../types/dataset'
import {
  deleteSnapshot,
  diffDatasets,
  diffToCsv,
  listSnapshots,
  saveSnapshot,
  type DatasetSnapshot,
} from '../lib/snapshots'
import { pushToast } from '../lib/toast'

/**
 * Snapshot manager (#151 side-by-side, #152 time-travel slider). Lists every
 * saved snapshot for the current dataset, lets the user pick two to diff
 * side-by-side, and offers a scrubber that jumps the "after" pick across
 * the history. Also surfaces a "Guardar snapshot" button so the user can
 * pin the current state explicitly.
 */

interface SnapshotsPageProps {
  dataset: Dataset
  onBack: () => void
}

export function SnapshotsPage({ dataset, onBack }: SnapshotsPageProps): JSX.Element {
  const [snapshots, setSnapshots] = useState<DatasetSnapshot[]>([])
  const [beforeKey, setBeforeKey] = useState<string | null>(null)
  const [afterKey, setAfterKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refresh()
  }, [dataset.id])

  async function refresh(): Promise<void> {
    const list = await listSnapshots(dataset.id)
    setSnapshots(list)
    if (list.length >= 2) {
      setBeforeKey(list[1].key)
      setAfterKey(list[0].key)
    } else if (list.length === 1) {
      setBeforeKey(list[0].key)
      setAfterKey(null)
    }
  }

  async function onSave(): Promise<void> {
    setBusy(true)
    try {
      await saveSnapshot(dataset)
      await refresh()
      pushToast('Snapshot guardado.', 'success', 3000)
    } catch {
      pushToast('No se pudo guardar el snapshot.', 'error', 4000)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(key: string): Promise<void> {
    await deleteSnapshot(key)
    await refresh()
  }

  const before = snapshots.find((s) => s.key === beforeKey) ?? null
  const after = snapshots.find((s) => s.key === afterKey) ?? null

  const diff = useMemo(() => {
    if (!before || !after) return null
    return diffDatasets(before.dataset, after.dataset)
  }, [before, after])

  function downloadDiffCsv(): void {
    if (!before || !after || !diff) return
    const csv = diffToCsv(diff, before.dataset, after.dataset)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diff-${dataset.id}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '40px 28px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        ← Volver al dashboard
      </button>
      <header style={{ marginTop: 14, marginBottom: 28 }}>
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(28px, 3vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Historial de snapshots
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8, maxWidth: 640 }}>
          Cada subida del mismo dataset deja un snapshot persistente en este navegador. Elige dos
          puntos del historial para comparar fila a fila. Se conservan los últimos 8 por dataset.
        </p>
      </header>

      <section style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={busy}
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: 'none',
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {busy ? 'Guardando…' : 'Guardar snapshot del dataset actual'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'} guardados
        </span>
      </section>

      {snapshots.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          Aún no hay snapshots. Guarda el primero para empezar a comparar versiones.
        </p>
      ) : (
        <>
          <SnapshotList snapshots={snapshots} onDelete={(k) => void onDelete(k)} />
          {snapshots.length >= 2 && (
            <>
              <TimeTravelSlider
                snapshots={snapshots}
                afterKey={afterKey}
                beforeKey={beforeKey}
                onChangeAfter={setAfterKey}
                onChangeBefore={setBeforeKey}
              />
              <SideBySide before={before} after={after} diff={diff} onDownload={downloadDiffCsv} />
            </>
          )}
        </>
      )}
    </div>
  )
}

interface SnapshotListProps {
  snapshots: DatasetSnapshot[]
  onDelete: (key: string) => void
}

function SnapshotList({ snapshots, onDelete }: SnapshotListProps): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
        marginBottom: 36,
      }}
    >
      {snapshots.map((s) => (
        <article
          key={s.key}
          style={{
            border: '1px solid var(--border)',
            padding: 14,
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            {new Date(s.createdAt).toLocaleString('es-ES')}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.label}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {s.rowCount} filas · {s.columnCount} columnas
          </span>
          <button
            type="button"
            onClick={() => onDelete(s.key)}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              color: 'var(--coral, #F87171)',
              fontSize: 11,
              cursor: 'pointer',
              padding: 0,
              marginTop: 4,
              fontFamily: 'inherit',
            }}
          >
            Eliminar
          </button>
        </article>
      ))}
    </div>
  )
}

interface TimeTravelSliderProps {
  snapshots: DatasetSnapshot[]
  beforeKey: string | null
  afterKey: string | null
  onChangeBefore: (k: string) => void
  onChangeAfter: (k: string) => void
}

function TimeTravelSlider({
  snapshots,
  beforeKey,
  afterKey,
  onChangeBefore,
  onChangeAfter,
}: TimeTravelSliderProps): JSX.Element {
  const newestFirst = snapshots.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const idxBefore = newestFirst.findIndex((s) => s.key === beforeKey)
  const idxAfter = newestFirst.findIndex((s) => s.key === afterKey)
  return (
    <section
      style={{
        border: '1px solid var(--border)',
        padding: 18,
        background: 'rgba(255,255,255,0.015)',
        marginBottom: 28,
      }}
      aria-label="Selector temporal"
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 14,
        }}
      >
        Time-travel
      </div>
      <SliderRow
        label="Antes"
        index={idxBefore}
        max={newestFirst.length - 1}
        onChange={(i) => onChangeBefore(newestFirst[i].key)}
        snapshots={newestFirst}
      />
      <SliderRow
        label="Después"
        index={idxAfter}
        max={newestFirst.length - 1}
        onChange={(i) => onChangeAfter(newestFirst[i].key)}
        snapshots={newestFirst}
      />
    </section>
  )
}

interface SliderRowProps {
  label: string
  index: number
  max: number
  onChange: (i: number) => void
  snapshots: DatasetSnapshot[]
}

function SliderRow({ label, index, max, onChange, snapshots }: SliderRowProps): JSX.Element {
  const safe = index < 0 ? 0 : index
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
      <span style={{ width: 70, fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={safe}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--sky)' }}
      />
      <span
        className="font-mono"
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          minWidth: 160,
          textAlign: 'right',
        }}
      >
        {snapshots[safe] ? new Date(snapshots[safe].createdAt).toLocaleDateString('es-ES') : '—'}
      </span>
    </div>
  )
}

interface SideBySideProps {
  before: DatasetSnapshot | null
  after: DatasetSnapshot | null
  diff: ReturnType<typeof diffDatasets> | null
  onDownload: () => void
}

function SideBySide({ before, after, diff, onDownload }: SideBySideProps): JSX.Element | null {
  if (!before || !after || !diff) return null
  return (
    <section style={{ marginBottom: 28 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h2
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Comparativa side-by-side
        </h2>
        <button
          type="button"
          onClick={onDownload}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--ink-2)',
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Descargar diff CSV
        </button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Side label="Antes" snapshot={before} />
        <Side label="Después" snapshot={after} />
      </div>
      <DiffSummary diff={diff} />
    </section>
  )
}

function Side({ label, snapshot }: { label: string; snapshot: DatasetSnapshot }): JSX.Element {
  return (
    <article
      style={{
        border: '1px solid var(--border)',
        padding: 16,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {label} · {new Date(snapshot.createdAt).toLocaleString('es-ES')}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{snapshot.label}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {snapshot.rowCount} filas · {snapshot.columnCount} columnas
      </span>
    </article>
  )
}

function DiffSummary({ diff }: { diff: ReturnType<typeof diffDatasets> }): JSX.Element {
  return (
    <div
      style={{
        marginTop: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      <Stat label="Filas añadidas" value={diff.added.length} accent="mint" />
      <Stat label="Filas eliminadas" value={diff.removed.length} accent="coral" />
      <Stat label="Celdas modificadas" value={diff.changed.length} accent="sky" />
      <Stat label="Columnas nuevas" value={diff.newColumns.length} accent="plum" />
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'mint' | 'coral' | 'sky' | 'plum'
}): JSX.Element {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        padding: 12,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      <span
        className="font-display"
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: accent === 'coral' ? 'var(--coral, #F87171)' : `var(--${accent})`,
        }}
      >
        {value.toLocaleString('es-ES')}
      </span>
    </div>
  )
}
