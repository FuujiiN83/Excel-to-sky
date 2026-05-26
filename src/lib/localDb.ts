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
