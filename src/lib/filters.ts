import type { Dataset, CellValue } from '../types/dataset'

/**
 * Lightweight dataset-filter model shared by exploration features
 * (#142 brush, #144 breadcrumbs, #147 group-vs-rest, #149 highlight-only).
 * Each filter is a pure value-level rule the renderer can apply or render
 * as a breadcrumb without coupling to any specific UI.
 *
 * Highlight-only mode (#149) is supported by setting `highlightOnly: true`
 * on a filter — apply() then returns the original dataset along with a Set
 * of row indices that match, leaving the caller to dim the rest instead of
 * removing them.
 */

export type FilterOp = 'equals' | 'in' | 'range' | 'not_equals'

export interface Filter {
  id: string
  column: string
  op: FilterOp
  /** Operand. For equals/not_equals: a CellValue. For in: an array. For range: [low, high]. */
  value: CellValue | CellValue[] | [number, number]
  /** Human-readable description for the breadcrumb. */
  label: string
  /** When true the filter highlights matching rows instead of dropping the rest. */
  highlightOnly?: boolean
}

export function applyFilters(
  dataset: Dataset,
  filters: ReadonlyArray<Filter>,
): { dataset: Dataset; highlightRows: Set<number> | null } {
  if (filters.length === 0) return { dataset, highlightRows: null }
  // Partition into hard filters (drop rows) and highlight filters (keep all,
  // mark matches). Highlight filters short-circuit when present alongside
  // hard filters: the hard filter set is applied first, then the highlight
  // set narrows further on what remains.
  const hard = filters.filter((f) => !f.highlightOnly)
  const soft = filters.filter((f) => f.highlightOnly)
  let rows = dataset.rows
  let indices = rows.map((_, i) => i)
  if (hard.length > 0) {
    const next: typeof rows = []
    const nextIdx: number[] = []
    for (let i = 0; i < rows.length; i++) {
      if (hard.every((f) => matches(rows[i], f))) {
        next.push(rows[i])
        nextIdx.push(indices[i])
      }
    }
    rows = next
    indices = nextIdx
  }
  let highlight: Set<number> | null = null
  if (soft.length > 0) {
    highlight = new Set()
    for (let i = 0; i < rows.length; i++) {
      if (soft.every((f) => matches(rows[i], f))) highlight.add(indices[i])
    }
  }
  if (rows === dataset.rows && highlight === null) {
    return { dataset, highlightRows: null }
  }
  return {
    dataset: { ...dataset, rows },
    highlightRows: highlight,
  }
}

function matches(row: Record<string, CellValue>, f: Filter): boolean {
  const cell = row[f.column]
  switch (f.op) {
    case 'equals':
      return normalise(cell) === normalise(f.value as CellValue)
    case 'not_equals':
      return normalise(cell) !== normalise(f.value as CellValue)
    case 'in':
      return (f.value as CellValue[]).some((v) => normalise(cell) === normalise(v))
    case 'range': {
      const [lo, hi] = f.value as [number, number]
      const n = typeof cell === 'number' ? cell : Number(cell)
      if (!Number.isFinite(n)) return false
      return n >= lo && n <= hi
    }
  }
}

function normalise(v: CellValue): string | number | boolean | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim().toLowerCase()
  return v
}

/** Convenience constructor for the most common case (#60 click-cell-to-filter). */
export function equalsFilter(column: string, value: CellValue, columnLabel: string): Filter {
  return {
    id: `eq:${column}:${String(value)}`,
    column,
    op: 'equals',
    value,
    label: `${columnLabel} = ${String(value)}`,
  }
}

/** Convenience constructor for brush selection on a numeric column (#142). */
export function rangeFilter(column: string, lo: number, hi: number, columnLabel: string): Filter {
  return {
    id: `range:${column}:${lo}-${hi}`,
    column,
    op: 'range',
    value: [lo, hi],
    label: `${columnLabel} ∈ [${lo.toFixed(1)}, ${hi.toFixed(1)}]`,
  }
}

/** "This group vs everything else" toggle (#147) — highlight rows matching a value. */
export function groupHighlightFilter(
  column: string,
  value: CellValue,
  columnLabel: string,
): Filter {
  return {
    id: `hl:${column}:${String(value)}`,
    column,
    op: 'equals',
    value,
    label: `${columnLabel} = ${String(value)} (resaltado)`,
    highlightOnly: true,
  }
}
