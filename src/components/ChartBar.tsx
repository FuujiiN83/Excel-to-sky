import { useState } from 'react'
import type { Accent } from '../types/dataset'
import { fmtNumber } from '../lib/stats'
import { ChartEmptyState } from './ChartEmptyState'

export interface Bar {
  label: string
  value: number
}

type Orientation = 'vertical' | 'horizontal'
export type BarSort = 'incoming' | 'value-desc' | 'value-asc' | 'label-asc'

interface ChartBarProps {
  bars: Bar[]
  accent?: Accent
  orientation?: Orientation
  /** Show the numeric value next to each bar (horizontal only). */
  showCount?: boolean
  /** Show min/mean/max footer (vertical histogram-style). */
  footer?: { min: string; mean: string; max: string }
  /** Optional cap on bar count rendered. */
  limit?: number
  /** Height in px for vertical mode, ignored for horizontal. */
  height?: number
  /** Accessible description. If omitted, one is derived from the data. */
  ariaLabel?: string
  /** Render a small toolbar with a sort selector. Defaults to false to keep
   *  cards quiet; the column-detail page opts in. */
  showSort?: boolean
  /**
   * Vertical mode only: render the value axis on a log10 scale (#77). Silently
   * falls back to linear when any bar value is ≤ 0 — log of zero or negatives
   * would otherwise produce a chart with missing bars.
   */
  logScale?: boolean
}

const SORT_OPTIONS: ReadonlyArray<{ value: BarSort; label: string }> = [
  { value: 'incoming', label: 'Orden original' },
  { value: 'value-desc', label: 'Valor ↓' },
  { value: 'value-asc', label: 'Valor ↑' },
  { value: 'label-asc', label: 'Etiqueta A→Z' },
]

function applySort(bars: Bar[], sort: BarSort): Bar[] {
  switch (sort) {
    case 'value-desc':
      return [...bars].sort((a, b) => b.value - a.value)
    case 'value-asc':
      return [...bars].sort((a, b) => a.value - b.value)
    case 'label-asc':
      return [...bars].sort((a, b) => a.label.localeCompare(b.label))
    case 'incoming':
    default:
      return bars
  }
}

function defaultBarAria(bars: Bar[]): string {
  if (bars.length === 0) return 'Gráfico de barras vacío.'
  const max = Math.max(...bars.map((b) => b.value))
  const min = Math.min(...bars.map((b) => b.value))
  const top = bars.reduce((a, b) => (b.value > a.value ? b : a))
  return `Gráfico de barras con ${bars.length} categorías. Valor máximo ${fmtNumber(max)} en "${top.label}", mínimo ${fmtNumber(min)}.`
}

/**
 * Pure SVG/HTML bar chart. Vertical renders a histogram-style column chart,
 * horizontal renders the legacy HorizontalBars layout (label + bar + value).
 */
export function ChartBar({
  bars,
  accent = 'sky',
  orientation = 'horizontal',
  showCount = true,
  footer,
  limit,
  height = 220,
  ariaLabel,
  showSort = false,
  logScale = false,
}: ChartBarProps): JSX.Element {
  const [sort, setSort] = useState<BarSort>('incoming')
  if (!bars || bars.length === 0) return <ChartEmptyState kind="bar" height={height} />
  const sorted = applySort(bars, sort)
  const visible = limit ? sorted.slice(0, limit) : sorted
  const stroke = `var(--${accent})`
  const label = ariaLabel ?? defaultBarAria(visible)

  const toolbar = showSort ? <SortToolbar sort={sort} onChange={setSort} /> : null

  if (orientation === 'vertical') {
    // Log scale needs every bar value > 0. When any is ≤ 0 we silently fall
    // back to linear to avoid the disappearing-bar trap.
    const useLog = logScale && visible.every((b) => b.value > 0)
    const scaledValues = visible.map((b) =>
      useLog ? Math.log10(Math.max(b.value, Number.MIN_VALUE)) : b.value,
    )
    const scaledMax = Math.max(...scaledValues, 1)
    const scaledMin = useLog ? Math.min(...scaledValues, 0) : 0
    const scaledRange = scaledMax - scaledMin || 1
    return (
      <div role="img" aria-label={label}>
        {toolbar}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height,
            padding: '0 0 8px',
          }}
        >
          {visible.map((b, i) => {
            const pct = ((scaledValues[i] - scaledMin) / scaledRange) * 100
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                  }}
                >
                  {b.value}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(2, pct)}%`,
                    background: `linear-gradient(180deg, ${stroke}, color-mix(in oklab, ${stroke} 70%, white))`,
                    borderRadius: 0,
                    transition: 'height .4s cubic-bezier(.2,.8,.2,1)',
                  }}
                />
              </div>
            )
          })}
        </div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--muted)',
              paddingTop: 4,
              borderTop: '1px dashed var(--border)',
            }}
          >
            <span>{footer.min}</span>
            <span>{footer.mean}</span>
            <span>{footer.max}</span>
          </div>
        )}
      </div>
    )
  }

  // Horizontal
  const mx = Math.max(...visible.map((b) => b.value), 1)
  return (
    <div role="img" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toolbar}
      {visible.map((b, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 48px',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {b.label}
          </div>
          <div
            style={{
              position: 'relative',
              height: 22,
              background: 'var(--surface-2)',
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${(b.value / mx) * 100}%`,
                background: `linear-gradient(90deg, ${stroke}, color-mix(in oklab, ${stroke} 50%, white))`,
                borderRadius: 0,
                transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
              }}
            />
          </div>
          {showCount && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--ink-2)',
                textAlign: 'right',
              }}
            >
              {fmtNumber(b.value)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface SortToolbarProps {
  sort: BarSort
  onChange: (s: BarSort) => void
}

function SortToolbar({ sort, onChange }: SortToolbarProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <span>Ordenar</span>
      <select
        value={sort}
        onChange={(e) => onChange(e.target.value as BarSort)}
        aria-label="Ordenar barras"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          color: 'var(--ink)',
          padding: '3px 8px',
          fontSize: 11,
          fontFamily: 'inherit',
          letterSpacing: 'normal',
          textTransform: 'none',
          cursor: 'pointer',
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
