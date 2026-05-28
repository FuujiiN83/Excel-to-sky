/**
 * Tiny localStorage cache for the shape of the most recently loaded dataset
 * (rows × columns × dominant column types). Used by the upload dropzone to
 * render an optimistic preview skeleton while the next file is parsing (#186):
 * if we know the user usually loads ~150 rows × 8 columns, we can show that
 * skeleton shape instead of a generic spinner.
 *
 * Everything is best-effort — failures (private mode, quota) degrade
 * silently. The skeleton just becomes generic.
 */

const KEY = 'ets-last-dataset-shape-v1'

export interface DatasetShape {
  rows: number
  columns: number
  /** Coarse mix of column types for the preview legend. */
  typeMix: {
    numeric: number
    categorical: number
    date: number
    other: number
  }
}

export function recordDatasetShape(shape: DatasetShape): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(shape))
  } catch {
    // ignore
  }
}

export function readDatasetShape(): DatasetShape | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DatasetShape>
    if (typeof parsed.rows !== 'number' || typeof parsed.columns !== 'number') return null
    return {
      rows: parsed.rows,
      columns: parsed.columns,
      typeMix: {
        numeric: parsed.typeMix?.numeric ?? 0,
        categorical: parsed.typeMix?.categorical ?? 0,
        date: parsed.typeMix?.date ?? 0,
        other: parsed.typeMix?.other ?? 0,
      },
    }
  } catch {
    return null
  }
}
