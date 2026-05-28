import type { Accent } from '../types/dataset'

/**
 * Pure-SVG treemap (#69) using a strip-style layout. Items sort descending
 * by value, then we lay them out row by row trying to keep rectangles
 * close to square via the standard squarified-treemap aspect-ratio
 * heuristic. Good enough for ~30 items; for much larger N a proper
 * treemap library would be warranted.
 */

export interface TreemapItem {
  key: string
  value: number
  /** Optional second label rendered under the key when the cell is large. */
  caption?: string
}

interface ChartTreemapProps {
  items: ReadonlyArray<TreemapItem>
  accent?: Accent
  width?: number
  height?: number
  ariaLabel?: string
}

interface LaidOut {
  key: string
  value: number
  caption?: string
  x: number
  y: number
  w: number
  h: number
}

function worstAspect(row: ReadonlyArray<{ value: number }>, w: number, side: number): number {
  const total = row.reduce((s, r) => s + r.value, 0)
  if (total === 0) return Number.POSITIVE_INFINITY
  const max = Math.max(...row.map((r) => r.value))
  const min = Math.min(...row.map((r) => r.value))
  const s2 = side * side
  const t2 = total * total
  return Math.max((s2 * max) / t2 / w, ((t2 / s2) * w) / Math.max(1e-9, min))
}

function squarify(
  items: ReadonlyArray<TreemapItem>,
  x: number,
  y: number,
  w: number,
  h: number,
  total: number,
): LaidOut[] {
  if (items.length === 0) return []
  const out: LaidOut[] = []
  const stack = [...items]
  let cursorX = x
  let cursorY = y
  let areaLeft = w * h
  let remainingTotal = total
  while (stack.length > 0) {
    const remainingW = x + w - cursorX
    const remainingH = y + h - cursorY
    const side = Math.min(remainingW, remainingH)
    const row: TreemapItem[] = []
    let prevAspect = Number.POSITIVE_INFINITY
    while (stack.length > 0) {
      const candidate = stack[0]
      const candidateRow = [...row, candidate]
      const scaled = candidateRow.map((r) => ({
        value: (r.value / remainingTotal) * areaLeft,
      }))
      const aspect = worstAspect(scaled, areaLeft, side)
      if (aspect > prevAspect && row.length > 0) break
      prevAspect = aspect
      row.push(stack.shift()!)
    }
    if (row.length === 0) break
    const rowTotal = row.reduce((s, r) => s + r.value, 0)
    const rowArea = (rowTotal / remainingTotal) * areaLeft
    if (remainingW > remainingH) {
      const colW = rowArea / remainingH
      let cy = cursorY
      for (const item of row) {
        const h2 = (item.value / rowTotal) * remainingH
        out.push({
          key: item.key,
          value: item.value,
          caption: item.caption,
          x: cursorX,
          y: cy,
          w: colW,
          h: h2,
        })
        cy += h2
      }
      cursorX += colW
    } else {
      const rowH = rowArea / remainingW
      let cx = cursorX
      for (const item of row) {
        const w2 = (item.value / rowTotal) * remainingW
        out.push({
          key: item.key,
          value: item.value,
          caption: item.caption,
          x: cx,
          y: cursorY,
          w: w2,
          h: rowH,
        })
        cx += w2
      }
      cursorY += rowH
    }
    areaLeft -= rowArea
    remainingTotal -= rowTotal
    if (areaLeft <= 0 || remainingTotal <= 0) break
  }
  return out
}

export function ChartTreemap({
  items,
  accent = 'sky',
  width = 600,
  height = 320,
  ariaLabel,
}: ChartTreemapProps): JSX.Element | null {
  if (!items || items.length === 0) return null
  const positive = items
    .filter((i) => i.value > 0)
    .slice()
    .sort((a, b) => b.value - a.value)
  if (positive.length === 0) return null
  const total = positive.reduce((s, i) => s + i.value, 0)
  const cells = squarify(positive, 0, 0, width, height, total)
  const stroke = `var(--${accent})`
  const label =
    ariaLabel ?? `Treemap con ${positive.length} categorías representadas por área proporcional.`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {cells.map((c, i) => {
        // Alternate opacity for visual separation since we use a single accent.
        const alpha = 0.85 - (i % 5) * 0.13
        const showCaption = c.w > 70 && c.h > 32
        return (
          <g key={c.key + i}>
            <rect
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={stroke}
              fillOpacity={alpha}
              stroke="var(--bg)"
              strokeWidth="1"
            />
            {c.w > 40 && c.h > 18 && (
              <text
                x={c.x + 8}
                y={c.y + 18}
                fontSize="12"
                fill="var(--bg)"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {c.key}
              </text>
            )}
            {showCaption && (
              <text
                x={c.x + 8}
                y={c.y + 34}
                fontSize="10"
                fill="rgba(0,0,0,0.6)"
                fontFamily="var(--font-mono)"
              >
                {c.caption ?? c.value.toLocaleString('es-ES')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
