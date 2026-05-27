import { openDB, type IDBPDatabase } from 'idb'

export type ErrorLevel = 'error' | 'warn' | 'info'

export interface ErrorLogEntry {
  /** Auto-incremented IndexedDB key. */
  id?: number
  /** ISO 8601 timestamp. */
  ts: string
  /** Severity tier. */
  level: ErrorLevel
  /** Short subsystem tag, e.g. "parser", "share-api", "worker". */
  context: string
  /** Human-readable message. */
  message: string
  /** Stack trace, if available. */
  stack?: string
  /** Arbitrary structured payload (truncated when serialised). */
  meta?: Record<string, unknown>
  /** Coarse environment fingerprint, populated by logError. */
  ua?: string
}

/** Soft cap on entries kept in the log. Older ones are evicted FIFO. */
const MAX_ENTRIES = 200

interface Schema {
  errors: {
    key: number
    value: ErrorLogEntry
    indexes: { 'by-ts': string }
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('exceltosky-errors', 1, {
      upgrade(d) {
        const store = d.createObjectStore('errors', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('by-ts', 'ts')
      },
    })
  }
  return dbPromise
}

/**
 * Persists a single error event. Failures are swallowed silently — the log is
 * best-effort and must never cascade into the caller's error path.
 */
export async function logError(input: Omit<ErrorLogEntry, 'id' | 'ts' | 'ua'>): Promise<void> {
  try {
    const entry: ErrorLogEntry = {
      ...input,
      ts: new Date().toISOString(),
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    }
    const d = await db()
    await d.add('errors', entry)
    await evictExcess(d)
  } catch {
    // Storage failure (private mode, quota, etc). Drop on the floor by design.
  }
}

async function evictExcess(d: IDBPDatabase<Schema>): Promise<void> {
  const count = await d.count('errors')
  if (count <= MAX_ENTRIES) return
  const tx = d.transaction('errors', 'readwrite')
  const cursor = await tx.store.index('by-ts').openCursor()
  let remaining = count - MAX_ENTRIES
  let c = cursor
  while (c && remaining > 0) {
    await c.delete()
    remaining -= 1
    c = await c.continue()
  }
  await tx.done
}

export async function listErrors(limit = 50): Promise<ErrorLogEntry[]> {
  try {
    const d = await db()
    const all = await d.getAllFromIndex('errors', 'by-ts')
    return all.reverse().slice(0, limit)
  } catch {
    return []
  }
}

export async function clearErrors(): Promise<void> {
  try {
    const d = await db()
    await d.clear('errors')
  } catch {
    // Same best-effort policy as logError.
  }
}

/**
 * Returns a redacted text dump suitable for pasting into a bug report.
 * Strips userAgent down to its first 80 chars and drops meta fields that
 * could contain user data unless explicitly marked safe.
 */
export async function exportErrorsAsText(limit = 50): Promise<string> {
  const entries = await listErrors(limit)
  if (entries.length === 0) return '(no errors logged)'
  return entries
    .map((e) => {
      const head = `[${e.ts}] ${e.level.toUpperCase()} ${e.context} — ${e.message}`
      const stack = e.stack ? `\n  stack: ${e.stack.split('\n').slice(0, 5).join(' | ')}` : ''
      const safeMeta = e.meta ? `\n  meta: ${JSON.stringify(redactMeta(e.meta)).slice(0, 400)}` : ''
      return head + stack + safeMeta
    })
    .join('\n')
}

/**
 * Allow-list for fields that are safe to include in an exported report.
 * Anything else gets replaced with a placeholder so we never leak dataset
 * content into a mailto: link.
 */
const SAFE_META_KEYS = new Set([
  'row',
  'rowIndex',
  'col',
  'colIndex',
  'column',
  'rowCount',
  'columnCount',
  'fileName',
  'status',
  'httpStatus',
  'phase',
  'worker',
  'retry',
])

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SAFE_META_KEYS.has(k) ? v : '[redacted]'
  }
  return out
}
