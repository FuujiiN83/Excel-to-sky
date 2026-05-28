import { openDB, type IDBPDatabase } from 'idb'

export interface LocalDashboard {
  slug: string
  name: string
  deleteToken: string
  owner: 'created' | 'visited'
  createdAt?: string
  lastOpenedAt?: string
}

interface Schema {
  dashboards: {
    key: string
    value: LocalDashboard
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('exceltosky', 1, {
      upgrade(d) {
        d.createObjectStore('dashboards', { keyPath: 'slug' })
      },
    })
  }
  return dbPromise
}

export async function saveLocalDashboard(input: LocalDashboard): Promise<void> {
  const now = new Date().toISOString()
  const value: LocalDashboard = {
    createdAt: now,
    lastOpenedAt: now,
    ...input,
  }
  const d = await db()
  await d.put('dashboards', value)
}

export async function listLocalDashboards(): Promise<LocalDashboard[]> {
  const d = await db()
  const all = await d.getAll('dashboards')
  return all.sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
}

export async function removeLocalDashboard(slug: string): Promise<void> {
  const d = await db()
  await d.delete('dashboards', slug)
}

export async function touchLocalDashboard(slug: string): Promise<void> {
  const d = await db()
  const existing = await d.get('dashboards', slug)
  if (existing) {
    await d.put('dashboards', { ...existing, lastOpenedAt: new Date().toISOString() })
  }
}

/**
 * Bundle every local dashboard's metadata into a single JSON blob the user
 * can download (#191). The bundle is portable across browsers — re-importing
 * it on another machine restores the link list and the delete tokens. Note:
 * raw dataset rows live on Supabase under their slug, not locally, so the
 * bundle is small (a few KB even with hundreds of links).
 */
export async function exportDashboardsBundle(): Promise<{
  filename: string
  contents: string
}> {
  const dashboards = await listLocalDashboards()
  const payload = {
    app: 'excel-to-sky',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: dashboards.length,
    dashboards,
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return {
    filename: `exceltosky-dashboards-${stamp}.json`,
    contents: JSON.stringify(payload, null, 2),
  }
}

/**
 * Import a previously-exported bundle (#192). Skips entries whose slug is
 * already present so re-importing the same file is idempotent. Returns the
 * number of new entries actually persisted.
 */
export async function importDashboardsBundle(raw: string): Promise<number> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { app?: unknown }).app !== 'excel-to-sky'
  ) {
    throw new Error('No reconocemos este bundle. Debe haber sido generado por Excel to Sky.')
  }
  const entries = (parsed as { dashboards?: unknown }).dashboards
  if (!Array.isArray(entries)) throw new Error('El bundle no contiene una lista de dashboards.')
  const d = await db()
  const existing = new Set<string>((await d.getAll('dashboards')).map((x) => x.slug))
  let added = 0
  for (const candidate of entries) {
    if (!candidate || typeof candidate !== 'object') continue
    const c = candidate as Partial<LocalDashboard>
    if (typeof c.slug !== 'string' || typeof c.name !== 'string') continue
    if (existing.has(c.slug)) continue
    const owner = c.owner === 'created' || c.owner === 'visited' ? c.owner : 'visited'
    await d.put('dashboards', {
      slug: c.slug,
      name: c.name,
      deleteToken: typeof c.deleteToken === 'string' ? c.deleteToken : '',
      owner,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      lastOpenedAt: typeof c.lastOpenedAt === 'string' ? c.lastOpenedAt : new Date().toISOString(),
    })
    added++
  }
  return added
}
