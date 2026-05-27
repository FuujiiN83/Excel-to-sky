/**
 * Wipes every byte Excel to Sky has written to this browser:
 *   - IndexedDB 'exceltosky'          (local dashboards)
 *   - IndexedDB 'exceltosky-errors'   (error log)
 *   - IndexedDB 'exceltosky-settings' (preferences)
 *   - localStorage entries under the 'ets:' namespace
 *
 * Returns once every deletion has resolved or rejected (rejections are
 * swallowed individually so a single failure doesn't strand the rest).
 */

const DB_NAMES = ['exceltosky', 'exceltosky-errors', 'exceltosky-settings'] as const
const LOCAL_STORAGE_PREFIX = 'ets:'

export async function clearAllLocalData(): Promise<void> {
  await Promise.allSettled(DB_NAMES.map(deleteDB))
  try {
    if (typeof localStorage !== 'undefined') {
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) toRemove.push(key)
      }
      for (const k of toRemove) localStorage.removeItem(k)
    }
  } catch {
    // Storage disabled — nothing to do.
  }
}

function deleteDB(name: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
