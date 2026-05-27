/**
 * Dev-only fetch interceptor for the network audit panel (#188).
 *
 * Wraps window.fetch on first call, logging { ts, method, url, origin,
 * status, durationMs } to an in-memory ring buffer. Subscribers (the panel)
 * are notified on every entry so the UI can update live.
 *
 * Production builds should never call startNetworkAudit(). It's intentionally
 * not gated internally so the bundle analyzer can see this module as
 * tree-shakable when the dev-only mount in App.tsx isn't included.
 */

export interface NetworkAuditEntry {
  id: number
  ts: number
  method: string
  url: string
  origin: string
  status: number | 'error'
  durationMs: number
}

const MAX_ENTRIES = 200
let entries: NetworkAuditEntry[] = []
let nextId = 0
const listeners = new Set<(es: NetworkAuditEntry[]) => void>()
let installed = false

function emit(): void {
  for (const l of listeners) l(entries)
}

export function startNetworkAudit(): void {
  if (installed) return
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startedAt = performance.now()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    let origin: string
    try {
      origin = new URL(url, window.location.origin).origin
    } catch {
      origin = 'unknown'
    }
    nextId += 1
    const id = nextId
    try {
      const res = await original(input, init)
      pushEntry({
        id,
        ts: Date.now(),
        method,
        url,
        origin,
        status: res.status,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return res
    } catch (err) {
      pushEntry({
        id,
        ts: Date.now(),
        method,
        url,
        origin,
        status: 'error',
        durationMs: Math.round(performance.now() - startedAt),
      })
      throw err
    }
  }
  installed = true
}

function pushEntry(entry: NetworkAuditEntry): void {
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry]
  emit()
}

export function getAuditEntries(): ReadonlyArray<NetworkAuditEntry> {
  return entries
}

export function subscribeAudit(
  handler: (es: ReadonlyArray<NetworkAuditEntry>) => void,
): () => void {
  listeners.add(handler)
  handler(entries)
  return () => {
    listeners.delete(handler)
  }
}

export function clearAuditEntries(): void {
  entries = []
  emit()
}
