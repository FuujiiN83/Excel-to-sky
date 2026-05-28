import { openDB, type IDBPDatabase } from 'idb'
import type { CellValue, Dataset } from '../types/dataset'

/**
 * Per-dashboard snapshot history (#153). When the user re-uploads a file with
 * the same dataset id we keep the last N snapshots in IndexedDB so the diff
 * view (#150) and the future time-travel slider (#152) have something to
 * compare. Snapshots are JSON-serialised — the row count cap from the
 * parser keeps the storage footprint reasonable.
 */

const MAX_SNAPSHOTS_PER_DATASET = 8

export interface DatasetSnapshot {
  /** Composite key: `${dataset.id}#${createdAt}`. */
  key: string
  datasetId: string
  /** ISO timestamp of the snapshot. */
  createdAt: string
  label: string
  rowCount: number
  columnCount: number
  /** Full dataset payload. */
  dataset: Dataset
}

interface Schema {
  snapshots: {
    key: string
    value: DatasetSnapshot
    indexes: { byDataset: string }
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('exceltosky-snapshots', 1, {
      upgrade(d) {
        const store = d.createObjectStore('snapshots', { keyPath: 'key' })
        store.createIndex('byDataset', 'datasetId', { unique: false })
      },
    })
  }
  return dbPromise
}

/**
 * Save a new snapshot of `dataset` and prune the oldest entries beyond the
 * per-dataset cap. Returns the persisted snapshot.
 */
export async function saveSnapshot(dataset: Dataset): Promise<DatasetSnapshot> {
  const createdAt = new Date().toISOString()
  const snapshot: DatasetSnapshot = {
    key: `${dataset.id}#${createdAt}`,
    datasetId: dataset.id,
    createdAt,
    label: dataset.label,
    rowCount: dataset.rows.length,
    columnCount: dataset.columns.length,
    dataset,
  }
  const d = await db()
  const tx = d.transaction('snapshots', 'readwrite')
  await tx.store.put(snapshot)
  // Prune: keep the newest MAX_SNAPSHOTS_PER_DATASET per dataset id.
  const all = (await tx.store.index('byDataset').getAll(dataset.id)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  for (const old of all.slice(MAX_SNAPSHOTS_PER_DATASET)) {
    await tx.store.delete(old.key)
  }
  await tx.done
  return snapshot
}

/** Newest-first list of snapshots for a dataset. */
export async function listSnapshots(datasetId: string): Promise<DatasetSnapshot[]> {
  const d = await db()
  const all = await d.getAllFromIndex('snapshots', 'byDataset', datasetId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteSnapshot(key: string): Promise<void> {
  const d = await db()
  await d.delete('snapshots', key)
}

// ---------- Diff (#150 + #154) -------------------------------------------

export interface CellChange {
  rowIndex: number
  column: string
  before: CellValue
  after: CellValue
}

export interface DatasetDiff {
  /** Row keys present in `after` but not in `before`. */
  added: number[]
  /** Row keys present in `before` but not in `after`. */
  removed: number[]
  /** Per-cell changes in rows that exist on both sides. */
  changed: CellChange[]
  /** Columns appearing in `after` but missing from `before`. */
  newColumns: string[]
  /** Columns dropped between snapshots. */
  removedColumns: string[]
}

/**
 * Compute a cell-level diff between two snapshots (#150). Rows are matched
 * by position (index) — Excel doesn't carry stable row identifiers, so this
 * is the closest practical proxy. When row counts differ, the trailing tail
 * lands in `added` / `removed`.
 */
export function diffDatasets(before: Dataset, after: Dataset): DatasetDiff {
  const beforeCols = new Set(before.columns.map((c) => c.key))
  const afterCols = new Set(after.columns.map((c) => c.key))
  const sharedCols = before.columns.map((c) => c.key).filter((k) => afterCols.has(k))
  const minLen = Math.min(before.rows.length, after.rows.length)
  const changed: CellChange[] = []
  for (let i = 0; i < minLen; i++) {
    for (const col of sharedCols) {
      const a = before.rows[i][col] ?? null
      const b = after.rows[i][col] ?? null
      if (a === b) continue
      // Coerce numeric equality across "12" vs 12 so cosmetic re-parses don't flood the diff.
      if (typeof a === 'number' && typeof b !== 'number' && Number(b) === a) continue
      if (typeof b === 'number' && typeof a !== 'number' && Number(a) === b) continue
      changed.push({ rowIndex: i, column: col, before: a, after: b })
    }
  }
  const added: number[] = []
  for (let i = minLen; i < after.rows.length; i++) added.push(i)
  const removed: number[] = []
  for (let i = minLen; i < before.rows.length; i++) removed.push(i)
  return {
    added,
    removed,
    changed,
    newColumns: after.columns.map((c) => c.key).filter((k) => !beforeCols.has(k)),
    removedColumns: before.columns.map((c) => c.key).filter((k) => !afterCols.has(k)),
  }
}

/**
 * Render a DatasetDiff as a multi-sheet CSV (#154). Three blocks separated
 * by blank lines: added rows, removed rows, and per-cell changes. Browsers
 * download via Blob; spreadsheet apps render the three blocks as one sheet.
 */
export function diffToCsv(diff: DatasetDiff, before: Dataset, after: Dataset): string {
  const out: string[] = []
  const escape = (v: CellValue): string => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  out.push('# ADDED ROWS')
  out.push(after.columns.map((c) => escape(c.label)).join(','))
  for (const i of diff.added) {
    out.push(after.columns.map((c) => escape(after.rows[i][c.key] ?? null)).join(','))
  }
  out.push('')
  out.push('# REMOVED ROWS')
  out.push(before.columns.map((c) => escape(c.label)).join(','))
  for (const i of diff.removed) {
    out.push(before.columns.map((c) => escape(before.rows[i][c.key] ?? null)).join(','))
  }
  out.push('')
  out.push('# CHANGED CELLS')
  out.push('row,column,before,after')
  for (const c of diff.changed) {
    out.push(
      [String(c.rowIndex + 1), escape(c.column), escape(c.before), escape(c.after)].join(','),
    )
  }
  return out.join('\n')
}
