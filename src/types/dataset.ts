export type ColumnType = 'boolean' | 'date' | 'number' | 'currency' | 'geo' | 'category' | 'text'

/**
 * Specialized sub-classifications surfaced after the base ColumnType is
 * inferred. A subtype is purely informational — charts and stats keep using
 * `type`. Subtypes drive UX hints (badge label, future format helpers, etc.)
 * and have no effect on parsing or aggregation.
 *
 * Detected by `detectSubtype()` in `lib/typeDetection.ts`.
 */
export type ColumnSubtype =
  | 'time' // #22 — HH:MM[:SS] without a date
  | 'datetime-tz' // #23 — ISO datetime with explicit timezone
  | 'percentage' // #24 — number with trailing %
  | 'phone' // #25 — international or local phone
  | 'email' // #26 — RFC-ish email
  | 'url' // #27 — http(s) URL
  | 'latlon' // #28 — "lat,lon" pair in a single cell
  | 'postal-code' // #29 — ES/US/UK/FR/DE postal code
  | 'uuid' // #30 — RFC 4122 UUID
  | 'dni-nie' // #37 — Spanish DNI / NIE
  | 'country-iso' // #31 — ISO 3166 country code (alpha-2 or alpha-3)
  | 'language-iso' // #32 — ISO 639 language code
  | 'iban' // #38 — Spanish IBAN (and any ISO-13616 variant by extension)

export type Accent = 'sky' | 'mint' | 'coral' | 'plum' | 'amber' | 'rose' | 'lime'

export interface Column {
  key: string
  label: string
  type: ColumnType
  /** Specialized sub-classification (email, url, uuid, dni…). Decorative only. */
  subtype?: ColumnSubtype
  /** Original sheet header before normalization */
  originalLabel?: string
  /** Accent palette name. Defaults to 'sky' in chart components. */
  color?: Accent
  /** Display unit (e.g., "€", "kg", "%"). */
  unit?: string
}

export type CellValue = string | number | boolean | null

export interface Dataset {
  id: string
  label: string
  columns: Column[]
  /** Each row is keyed by Column.key */
  rows: Record<string, CellValue>[]
  createdAt: string
}
