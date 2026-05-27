import { openDB, type IDBPDatabase } from 'idb'
import type { ColumnType } from '../types/dataset'

export type Theme = 'dark' | 'light' | 'high-contrast'
export type NumberLocale = 'es-ES' | 'en-US' | 'de-DE' | 'fr-FR' | 'pt-PT'
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'

/** Subset of ColumnType that the dashboard makes a chart for. */
export type ChartableType = Extract<ColumnType, 'number' | 'currency' | 'category' | 'date' | 'geo'>
export type ChartShape = 'histogram' | 'bar' | 'line' | 'map' | 'auto'

export interface Settings {
  theme: Theme
  numberLocale: NumberLocale
  dateFormat: DateFormat
  autoAnalyze: boolean
  largeText: boolean
  defaultChartType: Record<ChartableType, ChartShape>
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  numberLocale: 'es-ES',
  dateFormat: 'dd/mm/yyyy',
  autoAnalyze: true,
  largeText: false,
  defaultChartType: {
    number: 'auto',
    currency: 'auto',
    category: 'auto',
    date: 'auto',
    geo: 'auto',
  },
}

interface Schema {
  kv: {
    key: string
    value: unknown
  }
}

const KEY = 'settings'
let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('exceltosky-settings', 1, {
      upgrade(d) {
        d.createObjectStore('kv')
      },
    })
  }
  return dbPromise
}

/**
 * Merge any persisted partial onto the defaults. Tolerates schema drift
 * (new fields appear with their default value; unknown fields are dropped).
 */
function mergeDefaults(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object') return DEFAULT_SETTINGS
  const s = stored as Partial<Settings>
  return {
    theme: validTheme(s.theme) ?? DEFAULT_SETTINGS.theme,
    numberLocale: validLocale(s.numberLocale) ?? DEFAULT_SETTINGS.numberLocale,
    dateFormat: validDateFormat(s.dateFormat) ?? DEFAULT_SETTINGS.dateFormat,
    autoAnalyze: typeof s.autoAnalyze === 'boolean' ? s.autoAnalyze : DEFAULT_SETTINGS.autoAnalyze,
    largeText: typeof s.largeText === 'boolean' ? s.largeText : DEFAULT_SETTINGS.largeText,
    defaultChartType: {
      ...DEFAULT_SETTINGS.defaultChartType,
      ...(s.defaultChartType ?? {}),
    },
  }
}

function validTheme(v: unknown): Theme | undefined {
  return v === 'dark' || v === 'light' || v === 'high-contrast' ? v : undefined
}
function validLocale(v: unknown): NumberLocale | undefined {
  return v === 'es-ES' || v === 'en-US' || v === 'de-DE' || v === 'fr-FR' || v === 'pt-PT'
    ? v
    : undefined
}
function validDateFormat(v: unknown): DateFormat | undefined {
  return v === 'dd/mm/yyyy' || v === 'mm/dd/yyyy' || v === 'yyyy-mm-dd' ? v : undefined
}

export async function loadSettings(): Promise<Settings> {
  try {
    const d = await db()
    const stored = await d.get('kv', KEY)
    return mergeDefaults(stored)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    const d = await db()
    await d.put('kv', s, KEY)
  } catch {
    // Best-effort, like errorLog. We never block UI on persistence failure.
  }
}

export async function resetSettings(): Promise<Settings> {
  await saveSettings(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
