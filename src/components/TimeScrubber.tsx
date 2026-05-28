import { useMemo, useState } from 'react'
import type { Dataset } from '../types/dataset'
import { rangeFilter, type Filter } from '../lib/filters'

/**
 * Date-range scrubber (#148). Reads the first date column from the dataset,
 * computes min/max in ms, and exposes a two-handle slider that emits a
 * `range` filter through the dashboard's FilterContext. When no date column
 * exists the component renders nothing — callers can mount it
 * unconditionally on the dashboard.
 */

const DATE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})/
function parseDate(raw: unknown): number | null {
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const s = String(raw).trim()
  if (!s) return null
  let m = DATE_DMY.exec(s)
  if (m) {
    const t = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))).getTime()
    return Number.isNaN(t) ? null : t
  }
  m = DATE_ISO.exec(s)
  if (m) {
    const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getTime()
    return Number.isNaN(t) ? null : t
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function fmtIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

interface TimeScrubberProps {
  dataset: Dataset
  /** Called when the user releases a handle. The caller pipes this into its filter store. */
  onCommit: (filter: Filter) => void
}

export function TimeScrubber({ dataset, onCommit }: TimeScrubberProps): JSX.Element | null {
  const dateCol = useMemo(() => dataset.columns.find((c) => c.type === 'date'), [dataset])
  const range = useMemo(() => {
    if (!dateCol) return null
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const row of dataset.rows) {
      const t = parseDate(row[dateCol.key])
      if (t === null) continue
      if (t < min) min = t
      if (t > max) max = t
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null
    return { min, max }
  }, [dataset, dateCol])

  const [lo, setLo] = useState<number | null>(null)
  const [hi, setHi] = useState<number | null>(null)

  if (!dateCol || !range) return null
  const lowVal = lo ?? range.min
  const highVal = hi ?? range.max

  function commit(): void {
    if (!dateCol || !range) return
    if (lowVal === range.min && highVal === range.max) return
    onCommit(
      rangeFilter(
        dateCol.key,
        lowVal,
        highVal,
        `${dateCol.label} (${fmtIsoDay(lowVal)} → ${fmtIsoDay(highVal)})`,
      ),
    )
    // Reset local handles so the next interaction starts fresh.
    setLo(null)
    setHi(null)
  }

  return (
    <section
      style={{
        marginTop: 14,
        marginBottom: 14,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.018)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Scrubber temporal — {dateCol.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
        <span style={{ color: 'var(--ink-2)', minWidth: 110 }}>
          {fmtIsoDay(lowVal)} → {fmtIsoDay(highVal)}
        </span>
        <input
          type="range"
          min={range.min}
          max={range.max}
          value={lowVal}
          step={86_400_000}
          onChange={(e) => setLo(Math.min(Number(e.target.value), highVal))}
          onMouseUp={commit}
          onTouchEnd={commit}
          style={{ flex: 1, accentColor: 'var(--sky)' }}
          aria-label="Desde"
        />
        <input
          type="range"
          min={range.min}
          max={range.max}
          value={highVal}
          step={86_400_000}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lowVal))}
          onMouseUp={commit}
          onTouchEnd={commit}
          style={{ flex: 1, accentColor: 'var(--sky)' }}
          aria-label="Hasta"
        />
      </div>
    </section>
  )
}
