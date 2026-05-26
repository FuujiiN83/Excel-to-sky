import type { Accent } from '../types/dataset'
import { fmtNumber } from '../lib/stats'

export interface Bar {
  label: string
  value: number
}

type Orientation = 'vertical' | 'horizontal'

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
}: ChartBarProps): JSX.Element {
  const visible = limit ? bars.slice(0, limit) : bars
  const stroke = `var(--${accent})`

  if (orientation === 'vertical') {
    const max = Math.max(...visible.map((b) => b.value), 1)
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height,
            padding: '0 0 8px',
          }}
        >
          {visible.map((b, i) => (
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
                  height: `${Math.max(2, (b.value / max) * 100)}%`,
                  background: `linear-gradient(180deg, ${stroke}, color-mix(in oklab, ${stroke} 70%, white))`,
                  borderRadius: '6px 6px 2px 2px',
                  transition: 'height .4s cubic-bezier(.2,.8,.2,1)',
                }}
              />
            </div>
          ))}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${(b.value / mx) * 100}%`,
                background: `linear-gradient(90deg, ${stroke}, color-mix(in oklab, ${stroke} 50%, white))`,
                borderRadius: 6,
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
