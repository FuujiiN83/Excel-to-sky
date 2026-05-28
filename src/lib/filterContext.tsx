import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Filter } from './filters'
import { applyFilters } from './filters'
import type { Dataset } from '../types/dataset'

/**
 * Dashboard-wide cross-filter store (#143). One source of truth for the
 * active filter chain — DataTable, column cards and charts all consume it
 * via `useDashboardFilters`. Click any value on the dashboard, every
 * surface narrows to it.
 *
 * The history stack tracks every state transition so Ctrl/Cmd+Z undoes
 * the last filter add/remove and Ctrl/Cmd+Shift+Z redoes (#145). The stack
 * caps at 32 entries — beyond that the oldest entries fall off.
 */

const MAX_HISTORY = 32

interface FilterContextValue {
  filters: Filter[]
  add: (filter: Filter) => void
  remove: (id: string) => void
  clear: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  apply: (dataset: Dataset) => { dataset: Dataset; highlightRows: Set<number> | null }
}

const FilterContext = createContext<FilterContextValue | null>(null)

interface FilterProviderProps {
  children: ReactNode
}

export function FilterProvider({ children }: FilterProviderProps): JSX.Element {
  const [history, setHistory] = useState<Filter[][]>([[]])
  const [cursor, setCursor] = useState(0)
  const filters = history[cursor]

  const push = useCallback(
    (next: Filter[]): void => {
      setHistory((prev) => {
        // Drop any redo branch when applying a fresh state.
        const trimmed = prev.slice(0, cursor + 1)
        trimmed.push(next)
        // Bound history length.
        return trimmed.length > MAX_HISTORY ? trimmed.slice(trimmed.length - MAX_HISTORY) : trimmed
      })
      setCursor((c) => Math.min(MAX_HISTORY - 1, c + 1))
    },
    [cursor],
  )

  const add = useCallback(
    (filter: Filter): void => {
      // De-dupe by filter id so re-clicking the same value is idempotent.
      if (filters.some((f) => f.id === filter.id)) return
      push([...filters, filter])
    },
    [filters, push],
  )

  const remove = useCallback(
    (id: string): void => {
      if (!filters.some((f) => f.id === id)) return
      push(filters.filter((f) => f.id !== id))
    },
    [filters, push],
  )

  const clear = useCallback((): void => {
    if (filters.length === 0) return
    push([])
  }, [filters, push])

  const undo = useCallback((): void => {
    setCursor((c) => Math.max(0, c - 1))
  }, [])

  const redo = useCallback((): void => {
    setCursor((c) => Math.min(history.length - 1, c + 1))
  }, [history.length])

  // Keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo. Skip when an
  // input/textarea has focus so typing isn't hijacked.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() !== 'z') return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      add,
      remove,
      clear,
      undo,
      redo,
      canUndo: cursor > 0,
      canRedo: cursor < history.length - 1,
      apply: (dataset) => applyFilters(dataset, filters),
    }),
    [filters, add, remove, clear, undo, redo, cursor, history.length],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useDashboardFilters(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useDashboardFilters must be used inside <FilterProvider>')
  return ctx
}

/** Convenience hook that returns the dataset narrowed by the active filters. */
export function useFilteredDataset(dataset: Dataset): Dataset {
  const { apply } = useDashboardFilters()
  return useMemo(() => apply(dataset).dataset, [apply, dataset])
}
