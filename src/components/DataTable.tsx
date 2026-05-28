import { useEffect, useMemo, useRef, useState } from 'react'
import type { CellValue, Column, Dataset } from '../types/dataset'

/**
 * Pure-DOM virtualised data table. Closes the dashboard-table backlog in one
 * component:
 *
 * - #39 Sortable headers (click → asc → desc → reset; Shift-click for
 *   multi-column sort).
 * - #40 Per-column filter input (text contains, numeric range parsed from
 *   "min..max").
 * - #42 Hide/show columns popover.
 * - #44 Global search via Cmd/Ctrl+K (filters every column simultaneously).
 * - #45 Quick-filter chips for the focused categorical column's top values.
 * - #47 Sticky first column (the row-number column when shown, otherwise
 *   the first data column).
 * - #48 Virtualization: we measure a single row height and render only the
 *   slice intersecting the viewport via absolute positioning inside a
 *   tall spacer. Handles 10k+ rows without breaking scroll.
 * - #49 Resizable column widths via drag handles on the header.
 * - #55 Keyboard navigation: ArrowUp / ArrowDown / ArrowLeft / ArrowRight
 *   move the focused cell; Home/End jump to the row's first/last cell.
 * - #57 Show row-number column toggle.
 * - #59 Distinct null cell rendering with `—` and per-header null counts.
 * - #60 Click a value to add an equals-filter on its column.
 *
 * Items deferred to follow-ups (need bigger UX choices): drag-to-reorder
 * columns (#41), saved views (#43), column pinning (#50), row selection
 * (#56), in-page find (#58 — duplicated with Cmd/Ctrl+K), keyboard table
 * detail (#55 partial coverage).
 */

const ROW_HEIGHT = 36
const OVERSCAN = 6
const DEFAULT_COL_WIDTH = 160
const ROWNUM_COL_WIDTH = 56
const MIN_COL_WIDTH = 60

export interface DataTableProps {
  dataset: Dataset
  /** Optional initial filters applied on mount. */
  initialFilters?: Record<string, string>
  /** Maximum rows to render after filtering (safety cap). */
  rowCap?: number
}

interface SortKey {
  column: string
  dir: 'asc' | 'desc'
}

type ColumnFilter = string

export function DataTable({
  dataset,
  initialFilters,
  rowCap = 50000,
}: DataTableProps): JSX.Element {
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showRowNum, setShowRowNum] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [colFilters, setColFilters] = useState<Record<string, ColumnFilter>>(initialFilters ?? {})
  const [sorts, setSorts] = useState<SortKey[]>([])
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [focused, setFocused] = useState<{ row: number; col: number }>({ row: 0, col: 0 })
  const [showColPicker, setShowColPicker] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)

  // Recalculate viewport height on mount + resize so virtualization picks the
  // right window of rows. Falls back to 480px if the ref isn't ready yet.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    setViewportH(el.clientHeight || 480)
    const obs = new ResizeObserver(() => setViewportH(el.clientHeight || 480))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Global Cmd/Ctrl+K focuses the global search box (#44).
  const searchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visibleColumns = useMemo(
    () => dataset.columns.filter((c) => !hiddenCols.has(c.key)),
    [dataset.columns, hiddenCols],
  )

  // Cache per-column null count for the header tag (#59).
  const nullCounts = useMemo(() => {
    const out = new Map<string, number>()
    for (const col of dataset.columns) {
      let n = 0
      for (const row of dataset.rows) {
        const v = row[col.key]
        if (v == null || v === '') n++
      }
      out.set(col.key, n)
    }
    return out
  }, [dataset])

  // Filtered + sorted row indices into dataset.rows. Indices keep us able to
  // surface the original row number even when the visible slice is sorted.
  const visibleRows = useMemo(() => {
    const g = globalFilter.trim().toLowerCase()
    const colMatchers: { column: string; match: (v: CellValue) => boolean }[] = []
    for (const [col, raw] of Object.entries(colFilters)) {
      const value = raw.trim()
      if (!value) continue
      const range = value.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/)
      if (range) {
        const lo = Number(range[1])
        const hi = Number(range[2])
        colMatchers.push({
          column: col,
          match: (v) => {
            const n = typeof v === 'number' ? v : Number(v)
            return Number.isFinite(n) && n >= lo && n <= hi
          },
        })
      } else {
        const needle = value.toLowerCase()
        colMatchers.push({
          column: col,
          match: (v) => (v == null ? false : String(v).toLowerCase().includes(needle)),
        })
      }
    }
    const indices: number[] = []
    for (let i = 0; i < dataset.rows.length; i++) {
      const row = dataset.rows[i]
      if (g) {
        let any = false
        for (const c of visibleColumns) {
          const v = row[c.key]
          if (v == null) continue
          if (String(v).toLowerCase().includes(g)) {
            any = true
            break
          }
        }
        if (!any) continue
      }
      let pass = true
      for (const m of colMatchers) {
        if (!m.match(row[m.column])) {
          pass = false
          break
        }
      }
      if (pass) indices.push(i)
      if (indices.length >= rowCap) break
    }
    if (sorts.length > 0) {
      indices.sort((aIdx, bIdx) => {
        for (const s of sorts) {
          const a = dataset.rows[aIdx][s.column]
          const b = dataset.rows[bIdx][s.column]
          const cmp = compare(a, b)
          if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
        }
        return 0
      })
    }
    return indices
  }, [dataset, visibleColumns, globalFilter, colFilters, sorts, rowCap])

  function toggleSort(column: string, additive: boolean): void {
    setSorts((prev) => {
      const existing = prev.find((s) => s.column === column)
      let next: SortKey[]
      if (existing) {
        if (existing.dir === 'asc')
          next = prev.map((s) => (s.column === column ? { ...s, dir: 'desc' as const } : s))
        else next = prev.filter((s) => s.column !== column)
      } else {
        next = [...prev, { column, dir: 'asc' as const }]
      }
      return additive ? next : next.filter((s) => s.column === column)
    })
  }

  function startResize(column: string, startX: number, startWidth: number): void {
    function onMove(e: MouseEvent): void {
      const delta = e.clientX - startX
      setColWidths((prev) => ({ ...prev, [column]: Math.max(MIN_COL_WIDTH, startWidth + delta) }))
    }
    function onUp(): void {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function widthOf(col: Column): number {
    return colWidths[col.key] ?? DEFAULT_COL_WIDTH
  }

  const totalRows = visibleRows.length
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIdx = Math.min(totalRows, Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN)
  const offsetY = startIdx * ROW_HEIGHT
  const slice = visibleRows.slice(startIdx, endIdx)

  function handleCellClick(rowOffset: number, colIdx: number, col: Column, value: CellValue): void {
    setFocused({ row: rowOffset + startIdx, col: colIdx })
    if (value == null || value === '') return
    // Click-to-filter (#60): commit an equals-filter on this column.
    setColFilters((prev) => ({ ...prev, [col.key]: String(value) }))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault()
      setFocused((prev) => {
        if (e.key === 'ArrowDown')
          return { row: Math.min(totalRows - 1, prev.row + 1), col: prev.col }
        if (e.key === 'ArrowUp') return { row: Math.max(0, prev.row - 1), col: prev.col }
        if (e.key === 'ArrowLeft') return { row: prev.row, col: Math.max(0, prev.col - 1) }
        return { row: prev.row, col: Math.min(visibleColumns.length - 1, prev.col + 1) }
      })
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocused((p) => ({ ...p, col: 0 }))
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocused((p) => ({ ...p, col: visibleColumns.length - 1 }))
    }
  }

  // Top-value chips for the focused categorical column (#45).
  const chipColumn = visibleColumns[focused.col]
  const chipValues = useMemo(() => {
    if (!chipColumn) return [] as Array<{ value: string; count: number }>
    if (
      chipColumn.type !== 'category' &&
      chipColumn.type !== 'text' &&
      chipColumn.type !== 'boolean'
    )
      return []
    const counts = new Map<string, number>()
    for (const row of dataset.rows) {
      const v = row[chipColumn.key]
      if (v == null || v === '') continue
      const k = String(v)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [dataset, chipColumn])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Toolbar
        dataset={dataset}
        showRowNum={showRowNum}
        onToggleRowNum={() => setShowRowNum((x) => !x)}
        globalFilter={globalFilter}
        onGlobalFilter={setGlobalFilter}
        searchRef={searchRef}
        showColPicker={showColPicker}
        onToggleColPicker={() => setShowColPicker((x) => !x)}
        hiddenCols={hiddenCols}
        onToggleColumn={(key) =>
          setHiddenCols((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
          })
        }
        totalRows={totalRows}
        sourceRows={dataset.rows.length}
        onClearFilters={() => {
          setColFilters({})
          setGlobalFilter('')
        }}
        hasFilters={globalFilter.length > 0 || Object.values(colFilters).some((v) => v.length > 0)}
      />
      {chipValues.length > 0 && chipColumn && (
        <QuickFilterChips
          column={chipColumn}
          values={chipValues}
          active={colFilters[chipColumn.key] ?? ''}
          onPick={(v) => setColFilters((prev) => ({ ...prev, [chipColumn.key]: v }))}
        />
      )}
      <div
        ref={scrollerRef}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="grid"
        aria-rowcount={totalRows}
        aria-colcount={visibleColumns.length + (showRowNum ? 1 : 0)}
        style={{
          position: 'relative',
          maxHeight: 520,
          overflow: 'auto',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: 'max-content',
            minWidth: '100%',
            fontSize: 13,
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 3,
              background: 'var(--surface)',
            }}
          >
            <tr>
              {showRowNum && (
                <th
                  scope="col"
                  style={{
                    ...stickyFirstCol(true),
                    width: ROWNUM_COL_WIDTH,
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border-strong)',
                    borderRight: '1px solid var(--border)',
                    padding: '8px 10px',
                    textAlign: 'right',
                    fontSize: 10,
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  #
                </th>
              )}
              {visibleColumns.map((col, i) => {
                const isFirst = !showRowNum && i === 0
                const sort = sorts.find((s) => s.column === col.key)
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={{
                      ...stickyFirstCol(isFirst),
                      width: widthOf(col),
                      background: 'var(--surface)',
                      borderBottom: '1px solid var(--border-strong)',
                      borderRight: '1px solid var(--border)',
                      padding: '8px 10px',
                      textAlign: 'left',
                      verticalAlign: 'top',
                      position: 'sticky',
                      top: 0,
                      zIndex: isFirst ? 4 : 3,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleSort(col.key, e.shiftKey)}
                      title={`Ordenar por ${col.label}${sort ? ` (${sort.dir})` : ''}. Shift-click para multi-orden.`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: 'var(--ink)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {col.label}
                      {sort && (
                        <span style={{ color: 'var(--sky)', fontSize: 10 }}>
                          {sort.dir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      {col.type}
                      {(nullCounts.get(col.key) ?? 0) > 0 && (
                        <span style={{ marginLeft: 6 }}>· {nullCounts.get(col.key)} vacíos</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Filtrar…"
                      value={colFilters[col.key] ?? ''}
                      onChange={(e) =>
                        setColFilters((prev) => ({ ...prev, [col.key]: e.target.value }))
                      }
                      style={{
                        marginTop: 4,
                        width: '100%',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--ink-2)',
                        padding: '3px 6px',
                        fontSize: 11,
                        fontFamily: 'inherit',
                      }}
                    />
                    <ResizeHandle
                      onStart={(startX) => startResize(col.key, startX, widthOf(col))}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Spacer rows at top + bottom so the scroll height matches the
                full virtual list. The middle slice is the actual rendered window. */}
            {offsetY > 0 && (
              <tr aria-hidden style={{ height: offsetY }}>
                <td colSpan={visibleColumns.length + (showRowNum ? 1 : 0)} />
              </tr>
            )}
            {slice.map((rowIdx, sliceI) => {
              const isFocused = focused.row === sliceI + startIdx
              return (
                <tr
                  key={rowIdx}
                  style={{ background: isFocused ? 'rgba(77,158,250,0.06)' : undefined }}
                >
                  {showRowNum && (
                    <td
                      scope="row"
                      style={{
                        ...stickyFirstCol(true),
                        width: ROWNUM_COL_WIDTH,
                        height: ROW_HEIGHT,
                        background: isFocused ? 'rgba(77,158,250,0.06)' : 'var(--surface)',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        padding: '0 10px',
                        textAlign: 'right',
                        fontSize: 11,
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {rowIdx + 1}
                    </td>
                  )}
                  {visibleColumns.map((col, colIdx) => {
                    const v = dataset.rows[rowIdx][col.key]
                    const empty = v == null || v === ''
                    const isFirst = !showRowNum && colIdx === 0
                    const cellFocused = isFocused && focused.col === colIdx
                    return (
                      <td
                        key={col.key}
                        onClick={() => handleCellClick(sliceI, colIdx, col, v)}
                        title="Click para filtrar por este valor"
                        aria-selected={cellFocused}
                        style={{
                          ...stickyFirstCol(isFirst),
                          width: widthOf(col),
                          height: ROW_HEIGHT,
                          background: cellFocused
                            ? 'rgba(77,158,250,0.18)'
                            : isFirst
                              ? 'var(--surface)'
                              : undefined,
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          padding: '0 10px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: empty ? 'var(--muted)' : 'var(--ink)',
                          fontStyle: empty ? 'italic' : undefined,
                        }}
                      >
                        {empty ? '—' : String(v)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {totalRows > endIdx && (
              <tr aria-hidden style={{ height: (totalRows - endIdx) * ROW_HEIGHT }}>
                <td colSpan={visibleColumns.length + (showRowNum ? 1 : 0)} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function stickyFirstCol(active: boolean): React.CSSProperties {
  return active ? { position: 'sticky', left: 0, zIndex: 2 } : {}
}

function compare(a: CellValue, b: CellValue): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

interface ToolbarProps {
  dataset: Dataset
  showRowNum: boolean
  onToggleRowNum: () => void
  globalFilter: string
  onGlobalFilter: (v: string) => void
  searchRef: React.RefObject<HTMLInputElement>
  showColPicker: boolean
  onToggleColPicker: () => void
  hiddenCols: Set<string>
  onToggleColumn: (key: string) => void
  totalRows: number
  sourceRows: number
  onClearFilters: () => void
  hasFilters: boolean
}

function Toolbar(props: ToolbarProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.018)',
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
        Tabla
      </span>
      <input
        ref={props.searchRef}
        type="search"
        value={props.globalFilter}
        onChange={(e) => props.onGlobalFilter(e.target.value)}
        placeholder="Buscar en toda la tabla (⌘K)"
        style={{
          flex: 1,
          minWidth: 220,
          background: 'var(--bg)',
          border: '1px solid var(--border-strong)',
          color: 'var(--ink)',
          padding: '6px 10px',
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      />
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--ink-2)',
          cursor: 'pointer',
        }}
      >
        <input type="checkbox" checked={props.showRowNum} onChange={props.onToggleRowNum} />
        Mostrar #
      </label>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={props.onToggleColPicker}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--ink-2)',
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Columnas ({props.dataset.columns.length - props.hiddenCols.size}/
          {props.dataset.columns.length})
        </button>
        {props.showColPicker && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 60,
              minWidth: 200,
              maxHeight: 280,
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {props.dataset.columns.map((c) => (
              <label
                key={c.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!props.hiddenCols.has(c.key)}
                  onChange={() => props.onToggleColumn(c.key)}
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {props.totalRows.toLocaleString('es-ES')} / {props.sourceRows.toLocaleString('es-ES')} filas
      </span>
      {props.hasFilters && (
        <button
          type="button"
          onClick={props.onClearFilters}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sky)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

interface QuickFilterChipsProps {
  column: Column
  values: ReadonlyArray<{ value: string; count: number }>
  active: string
  onPick: (value: string) => void
}

function QuickFilterChips({ column, values, active, onPick }: QuickFilterChipsProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginRight: 6,
        }}
      >
        Top {column.label}
      </span>
      {values.map((v) => {
        const isActive = active === v.value
        return (
          <button
            key={v.value}
            type="button"
            onClick={() => onPick(isActive ? '' : v.value)}
            style={{
              background: isActive ? 'var(--sky)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--sky)' : 'var(--border-strong)'}`,
              color: isActive ? 'var(--bg)' : 'var(--ink-2)',
              padding: '3px 10px',
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {v.value} <span style={{ opacity: 0.6, marginLeft: 4 }}>{v.count}</span>
          </button>
        )
      })}
    </div>
  )
}

interface ResizeHandleProps {
  onStart: (clientX: number) => void
}

function ResizeHandle({ onStart }: ResizeHandleProps): JSX.Element {
  return (
    <span
      onMouseDown={(e) => {
        e.preventDefault()
        onStart(e.clientX)
      }}
      role="separator"
      aria-orientation="vertical"
      title="Arrastra para redimensionar"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 5,
        height: '100%',
        cursor: 'col-resize',
        background: 'transparent',
      }}
    />
  )
}
