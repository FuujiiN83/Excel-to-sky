import { openDB, type IDBPDatabase } from 'idb'
import type { ColumnType } from '../types/dataset'
import type { UiLocale } from './i18n'

export type Theme = 'dark' | 'light' | 'system' | 'high-contrast'
export type NumberLocale = 'es-ES' | 'en-US' | 'de-DE' | 'fr-FR' | 'pt-PT'
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'
export type { UiLocale }
export type Density = 'compact' | 'cozy' | 'airy'
export type Palette = 'mixed' | 'sky' | 'mint' | 'plum' | 'amber'

/** Subset of ColumnType that the dashboard makes a chart for. */
export type ChartableType = Extract<ColumnType, 'number' | 'currency' | 'category' | 'date' | 'geo'>
export type ChartShape = 'histogram' | 'bar' | 'line' | 'map' | 'auto'

export interface Settings {
  theme: Theme
  uiLocale: UiLocale
  numberLocale: NumberLocale
  dateFormat: DateFormat
  autoAnalyze: boolean
  largeText: boolean
  /** When true, every server-touching control (share, public-link load) is hidden. */
  localOnly: boolean
  /** Spacing density applied to the dashboard surfaces. */
  density: Density
  /** Colour palette applied to charts and stats. 'mixed' rotates the existing accents. */
  palette: Palette
  defaultChartType: Record<ChartableType, ChartShape>
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  uiLocale: 'es',
  numberLocale: 'es-ES',
  dateFormat: 'dd/mm/yyyy',
  autoAnalyze: true,
  largeText: false,
  localOnly: false,
  density: 'cozy',
  palette: 'mixed',
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
    uiLocale: validUiLocale(s.uiLocale) ?? DEFAULT_SETTINGS.uiLocale,
    numberLocale: validLocale(s.numberLocale) ?? DEFAULT_SETTINGS.numberLocale,
    dateFormat: validDateFormat(s.dateFormat) ?? DEFAULT_SETTINGS.dateFormat,
    autoAnalyze: typeof s.autoAnalyze === 'boolean' ? s.autoAnalyze : DEFAULT_SETTINGS.autoAnalyze,
    largeText: typeof s.largeText === 'boolean' ? s.largeText : DEFAULT_SETTINGS.largeText,
    localOnly: typeof s.localOnly === 'boolean' ? s.localOnly : DEFAULT_SETTINGS.localOnly,
    density: validDensity(s.density) ?? DEFAULT_SETTINGS.density,
    palette: validPalette(s.palette) ?? DEFAULT_SETTINGS.palette,
    defaultChartType: {
      ...DEFAULT_SETTINGS.defaultChartType,
      ...(s.defaultChartType ?? {}),
    },
  }
}

function validTheme(v: unknown): Theme | undefined {
  return v === 'dark' || v === 'light' || v === 'system' || v === 'high-contrast' ? v : undefined
}
function validUiLocale(v: unknown): UiLocale | undefined {
  if (v === 'es' || v === 'en' || v === 'fr' || v === 'de' || v === 'pt' || v === 'it') return v
  return undefined
}
function validLocale(v: unknown): NumberLocale | undefined {
  return v === 'es-ES' || v === 'en-US' || v === 'de-DE' || v === 'fr-FR' || v === 'pt-PT'
    ? v
    : undefined
}
function validDateFormat(v: unknown): DateFormat | undefined {
  return v === 'dd/mm/yyyy' || v === 'mm/dd/yyyy' || v === 'yyyy-mm-dd' ? v : undefined
}
function validDensity(v: unknown): Density | undefined {
  return v === 'compact' || v === 'cozy' || v === 'airy' ? v : undefined
}
function validPalette(v: unknown): Palette | undefined {
  return v === 'mixed' || v === 'sky' || v === 'mint' || v === 'plum' || v === 'amber'
    ? v
    : undefined
}

export async function loadSettings(): Promise<Settings> {
  try {
    const d = await db()
    const stored = await d.get('kv', KEY)
    if (stored) return mergeDefaults(stored)
    // First-load auto-detection (#206). Peek at navigator.language to seed
    // uiLocale. We only do this when *nothing* is persisted yet, so a user
    // who explicitly picked 'es' on a Chrome that reports 'en' doesn't get
    // overridden on every visit.
    const detected = detectInitialSettings()
    if (detected) await saveSettings(detected)
    return detected ?? DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function detectInitialSettings(): Settings | null {
  if (typeof navigator === 'undefined') return null
  const lang = (navigator.language || '').toLowerCase()
  // Only flip to English when the browser explicitly reports it.
  // Anything else falls back to the Spanish default (current product locale).
  if (!lang.startsWith('en')) return null
  return {
    ...DEFAULT_SETTINGS,
    uiLocale: 'en',
    numberLocale: lang === 'en-gb' ? 'en-US' : 'en-US',
    dateFormat: 'mm/dd/yyyy',
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
