/**
 * App version + ordered changelog. Bump APP_VERSION whenever shipping a
 * release whose changes warrant the in-app "qué hay nuevo" modal. The modal
 * compares this constant to the lastSeenVersion stored in localStorage and
 * shows the union of entries the user hasn't seen yet.
 */
export const APP_VERSION = '0.6'

export interface ChangelogEntry {
  version: string
  /** ISO date string (yyyy-mm-dd) when this version shipped. */
  date: string
  /** One-liner headline shown bold above the bullets. */
  title: string
  /** Short bullet list of user-facing changes. */
  highlights: string[]
}

export const CHANGELOG: ReadonlyArray<ChangelogEntry> = [
  {
    version: '0.6',
    date: '2026-05-27',
    title: 'Errors, settings, accessibility',
    highlights: [
      'Página /settings con tema (incl. alto contraste), formato de números/fechas y autoanálisis.',
      'Mensajes de error más amables al subir un Excel, con pistas concretas.',
      'Banner global cuando falla la red al compartir.',
      'Página /report para enviar bugs con el log local redactado.',
      'Atajos de teclado: pulsa ? en cualquier momento.',
    ],
  },
  {
    version: '0.5',
    date: '2026-05-26',
    title: 'Base v0.5 desplegable',
    highlights: [
      'Motor de insights estadísticos con 16 heurísticas, corriendo en un Web Worker.',
      'Compartir dashboards en un link público de 12 caracteres respaldado por Supabase (UE).',
      'Landing renovada con sección de garantía de privacidad y comparativa con alternativas.',
    ],
  },
]

const STORAGE_KEY = 'ets:last-seen-version'

export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function markVersionSeen(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version)
  } catch {
    // Private mode / storage disabled. Modal will reappear next reload — acceptable.
  }
}

/**
 * Entries the user hasn't seen yet (i.e. published after lastSeenVersion).
 * Returns an empty array on a first visit (no stored marker) because we don't
 * want to dump the entire changelog into a new user's face.
 */
export function unseenChangelog(): ChangelogEntry[] {
  const last = getLastSeenVersion()
  if (!last) return []
  const lastIdx = CHANGELOG.findIndex((e) => e.version === last)
  if (lastIdx === -1) {
    // Stored version isn't in our list — treat as "everything new since the oldest known".
    return [...CHANGELOG]
  }
  return CHANGELOG.slice(0, lastIdx)
}
