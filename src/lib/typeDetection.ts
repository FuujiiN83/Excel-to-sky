import type { ColumnSubtype, ColumnType } from '../types/dataset'

// Boolean variants (#33). Covers Spanish, English, Italian, French, German,
// Portuguese plus check-mark glyphs and the common 0/1 pair. detectBoolean
// trims + lowercases the input, so the set entries are all lowercase.
const TRUE_VALUES = new Set([
  'true',
  '1',
  // ES / IT
  'sí',
  'si',
  'verdadero',
  'verdad',
  'vero',
  // EN
  'yes',
  'y',
  't',
  // FR
  'oui',
  'vrai',
  // DE
  'ja',
  'wahr',
  // PT
  'sim',
  // glyphs
  '✓',
  '✔',
])
const FALSE_VALUES = new Set([
  'false',
  '0',
  // ES / IT
  'no',
  'n',
  'falso',
  // EN
  'f',
  // FR
  'non',
  'faux',
  // DE
  'nein',
  'falsch',
  // PT
  'não',
  'nao',
  // glyphs
  '✗',
  '✘',
  '×',
])

// Currency symbols stripped during numeric detection (#21). Includes the
// pre-existing big four (€$£¥) plus krona/koruna (kr), ruble, shekel, won,
// rupee, real (R$), zloty, franc.
const CURRENCY_STRIP = /(?:R\$|kr|zł|CHF|CHF\.|[€$£¥₽₪₩₹])/gi

// Header keywords that bias a numeric column toward 'currency' (#36). These
// are lowercase, accent-folded, and matched as whole-word substrings so a
// header like 'Ingresos brutos' still triggers but 'precision' does not.
const MONETARY_HEADER_KEYWORDS = [
  // ES
  'precio',
  'precios',
  'ingresos',
  'ingreso',
  'gasto',
  'gastos',
  'coste',
  'costes',
  'importe',
  'importes',
  'salario',
  'salarios',
  'venta',
  'ventas',
  'beneficio',
  'beneficios',
  'tarifa',
  'tarifas',
  'factura',
  'facturas',
  'subtotal',
  'total',
  // EN
  'price',
  'prices',
  'cost',
  'costs',
  'revenue',
  'income',
  'expense',
  'expenses',
  'salary',
  'sales',
  'amount',
  'amounts',
  'fee',
  'fees',
  'profit',
  'invoice',
] as const
const MONETARY_HEADER_GLYPHS = ['€', '$', '£', '¥', '₽', '₪', '₩', '₹', 'zł'] as const

function foldAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Sequential-ID detector (#35). Returns true when the *full* column reads as
 * strictly ascending integers, allowing a tiny tolerance for gaps (sorted
 * filtering / deleted rows). Operates on the raw column (not the sample) so
 * we don't falsely flag a sorted subset that happens to look like an ID.
 */
function isSequentialIdColumn(rawValues: (string | null | undefined)[]): boolean {
  const filtered = rawValues.filter((v): v is string => v != null && v !== '')
  // Need a meaningful sequence — three rows isn't enough to call it.
  if (filtered.length < 20) return false
  const ints: number[] = []
  for (const v of filtered) {
    const n = detectNumber(v)
    if (n === null || !Number.isInteger(n)) return false
    ints.push(n)
  }
  // Must be strictly ascending.
  for (let i = 1; i < ints.length; i++) {
    if (ints[i] <= ints[i - 1]) return false
  }
  // ≥95% of consecutive diffs should be exactly 1; the rest are filtered-out
  // gaps. Any diff above 100 is a hard reject (probably a real measurement).
  let ones = 0
  for (let i = 1; i < ints.length; i++) {
    const d = ints[i] - ints[i - 1]
    if (d > 100) return false
    if (d === 1) ones++
  }
  return ones / (ints.length - 1) >= 0.95
}

function headerSuggestsCurrency(label: string | undefined): boolean {
  if (!label) return false
  if (MONETARY_HEADER_GLYPHS.some((g) => label.includes(g))) return true
  const folded = foldAccents(label.toLowerCase())
  return MONETARY_HEADER_KEYWORDS.some((kw) => {
    // Whole-word match: kw bordered by non-alpha chars (or string edges).
    const re = new RegExp(`(?:^|[^a-z0-9])${kw}(?:[^a-z0-9]|$)`)
    return re.test(folded)
  })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/

const THRESHOLD = 0.8
const CATEGORY_MAX_RATIO = 0.05
const CATEGORY_MIN_ROWS = 20

export function detectBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (TRUE_VALUES.has(v)) return true
  if (FALSE_VALUES.has(v)) return false
  return null
}

export function detectNumber(raw: string): number | null {
  if (!raw) return null
  // Strip leading/trailing whitespace, currency symbols and thin spaces (NBSP).
  let s = raw
    .trim()
    .replace(CURRENCY_STRIP, '')
    .replace(/[\s\u00A0]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function detectDate(raw: string): Date | null {
  if (!raw) return null
  const s = raw.trim()
  if (ISO_DATE.test(s)) {
    const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s)
    return isNaN(d.getTime()) ? null : d
  }
  const m = DMY.exec(s)
  if (m) {
    const [, day, month, year] = m
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function sample<T>(values: T[], max = 200): T[] {
  if (values.length <= max) return values
  const head = values.slice(0, max / 2)
  const tail: T[] = []
  for (let i = 0; i < max / 2; i++) {
    tail.push(values[Math.floor(Math.random() * values.length)])
  }
  return [...head, ...tail]
}

export function inferColumnType(
  rawValues: (string | null | undefined)[],
  headerLabel?: string,
): ColumnType {
  return inferColumnTypeDetailed(rawValues, headerLabel).type
}

/** Same detection as inferColumnType, but with diagnostics for #17 mixed-type warnings. */
export interface DetailedInference {
  type: ColumnType
  /** Confidence in [0, 1] — share of sampled values that fit the chosen type. */
  confidence: number
  /** True when at least two type-detectors fire for >=20% of the sample. */
  mixed: boolean
  /** Secondary type that also had non-trivial coverage, when mixed. */
  secondary?: ColumnType
}

const MIXED_SECONDARY_THRESHOLD = 0.2
const MIXED_PRIMARY_THRESHOLD = 0.95

export function inferColumnTypeDetailed(
  rawValues: (string | null | undefined)[],
  headerLabel?: string,
): DetailedInference {
  const filtered = rawValues.filter((v): v is string => v != null && v !== '')
  const sampled = sample(filtered)
  if (sampled.length === 0) return { type: 'text', confidence: 1, mixed: false }

  const counts = { boolean: 0, date: 0, number: 0 }
  for (const v of sampled) {
    if (detectBoolean(v) !== null) counts.boolean++
    if (detectDate(v) !== null) counts.date++
    if (detectNumber(v) !== null) counts.number++
  }
  const total = sampled.length
  const ratios = {
    boolean: counts.boolean / total,
    date: counts.date / total,
    number: counts.number / total,
  } as const

  // Pick winning type using the existing THRESHOLD ordering.
  let type: ColumnType
  let confidence: number
  if (ratios.boolean >= THRESHOLD) {
    type = 'boolean'
    confidence = ratios.boolean
  } else if (ratios.date >= THRESHOLD) {
    type = 'date'
    confidence = ratios.date
  } else if (ratios.number >= THRESHOLD) {
    // Sequential-ID detection (#35): a column of strictly ascending integers
    // is an identifier, not a measurement. Demote to 'category' so the
    // dashboard skips the histogram + mean / median stats that would
    // otherwise pollute the page with meaningless aggregates.
    if (isSequentialIdColumn(rawValues)) {
      type = 'category'
      confidence = ratios.number
    } else {
      // Header-based currency bias (#36): a column of numbers whose label
      // suggests money ('Precio', 'Total', '€', 'Cost'…) is reclassified as
      // 'currency' so downstream stats render it with currency formatting.
      type = headerSuggestsCurrency(headerLabel) ? 'currency' : 'number'
      confidence = ratios.number
    }
  } else {
    const unique = new Set(sampled).size
    if (total >= CATEGORY_MIN_ROWS && unique / total < CATEGORY_MAX_RATIO) {
      type = 'category'
    } else {
      type = 'text'
    }
    confidence = 1 - Math.max(ratios.boolean, ratios.date, ratios.number)
  }

  // Mixed when the winning type is below near-certainty AND another type still
  // hits the 20% floor (so a stray '12' in a name column doesn't flag).
  const winnerRatio = type === 'text' || type === 'category' ? confidence : confidence
  const otherRatios = (['boolean', 'date', 'number'] as const)
    .filter((k) => k !== type)
    .map((k) => ({ k, r: ratios[k] }))
    .sort((a, b) => b.r - a.r)

  const topOther = otherRatios[0]
  const mixed =
    winnerRatio < MIXED_PRIMARY_THRESHOLD &&
    topOther !== undefined &&
    topOther.r >= MIXED_SECONDARY_THRESHOLD &&
    type !== 'category'

  return {
    type,
    confidence,
    mixed,
    secondary: mixed ? topOther?.k : undefined,
  }
}

// ---------- Subtype detection (#22 #23 #24 #25 #26 #27 #28 #29 #30 #37) ----------

/**
 * Threshold above which a subtype detector wins. Higher than the base-type
 * THRESHOLD (0.8) because subtypes describe content shape, not coarse class:
 * if 90% of the column reads as email, the remaining 10% is almost always
 * dirty data of the same shape, not a different subtype.
 */
const SUBTYPE_THRESHOLD = 0.9

interface SubtypeDetector {
  readonly name: ColumnSubtype
  /** Optional gate on the base type. */
  readonly appliesTo: ReadonlyArray<ColumnType>
  /** Returns true when `value` matches this subtype. */
  readonly test: (value: string) => boolean
}

/** Registered subtype detectors. First registered with ≥SUBTYPE_THRESHOLD wins. */
const SUBTYPE_DETECTORS: SubtypeDetector[] = []

export function registerSubtypeDetector(detector: SubtypeDetector): void {
  SUBTYPE_DETECTORS.push(detector)
}

// ---------- Detector: time-only (#22) ----------
// HH:MM or HH:MM:SS, 24h or 12h with am/pm. Excludes ISO datetimes (those
// are picked up by detectDate / the datetime-tz detector).
const TIME_ONLY_RE = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s?[apAP]\.?\s?[mM]\.?)?$/
registerSubtypeDetector({
  name: 'time',
  appliesTo: ['text', 'category'],
  test: (v) => TIME_ONLY_RE.test(v.trim()),
})

// ---------- Detector: datetime with explicit timezone (#23) ----------
// ISO-8601 datetime ending in Z or ±HH:MM offset. detectDate already accepts
// these and types the column as 'date', so the detector applies on top.
const DATETIME_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/
registerSubtypeDetector({
  name: 'datetime-tz',
  appliesTo: ['date', 'text', 'category'],
  test: (v) => DATETIME_TZ_RE.test(v.trim()),
})

// ---------- Detector: percentage (#24) ----------
// Number ending in % (with optional spaces). Applies to number / currency
// base types (the existing CURRENCY_STRIP doesn't strip %, so a column of
// '12%', '37%' typically resolves to 'text'/'category'). Cover all four to
// be safe — they're informational badges, not class changes.
const PERCENT_RE = /^[+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?\s*%$/
registerSubtypeDetector({
  name: 'percentage',
  appliesTo: ['number', 'currency', 'text', 'category'],
  test: (v) => PERCENT_RE.test(v.trim()),
})

// ---------- Detector: phone number (#25) ----------
// E.164 ("+CC NNN…", up to 15 digits) or local separator-friendly forms
// ("+34 600 123 456", "600-123-456", "(91) 555 1234"). At least 7 digits.
const PHONE_RE = /^\+?(?:\d[\s\-./]?){6,15}\d$/
registerSubtypeDetector({
  name: 'phone',
  // Phones tend to be picked up as text/category. Some short, hyphen-less
  // local numbers also pass detectNumber, so include number too.
  appliesTo: ['text', 'category', 'number'],
  test: (v) => {
    const s = v.trim()
    if (!PHONE_RE.test(s)) return false
    // Require at least 7 digits to avoid matching, e.g., "1-2-3".
    return (s.match(/\d/g)?.length ?? 0) >= 7
  },
})

// ---------- Detector: email address (#26) ----------
// Pragmatic RFC-ish check: at least one char, @, domain with a dot, no
// whitespace. Lowercased before matching so 'John@Example.com' is detected.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
registerSubtypeDetector({
  name: 'email',
  appliesTo: ['text', 'category'],
  test: (v) => EMAIL_RE.test(v.trim().toLowerCase()),
})

// ---------- Detector: URL (#27) ----------
// http(s):// or protocol-less www. prefixes. Trim only — case preserved
// because URLs are case-insensitive only in the scheme + host.
const URL_RE = /^(?:https?:\/\/|www\.)[^\s]+$/i
registerSubtypeDetector({
  name: 'url',
  appliesTo: ['text', 'category'],
  test: (v) => URL_RE.test(v.trim()),
})

// ---------- Detector: lat/lon coordinate pair (#28) ----------
// "lat,lon" or "lat, lon" in a single cell with reasonable bounds:
// -90..90 for latitude, -180..180 for longitude. Float allowed.
const LATLON_RE = /^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/
registerSubtypeDetector({
  name: 'latlon',
  appliesTo: ['text', 'category', 'geo'],
  test: (v) => {
    const m = LATLON_RE.exec(v.trim())
    if (!m) return false
    const lat = Number(m[1])
    const lon = Number(m[2])
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  },
})

// ---------- Detector: postal code (#29) ----------
// Covers ES (5 digits), US (5 or 9-digit ZIP+4), UK (alphanumeric like
// 'SW1A 1AA'), FR (5 digits, same as ES — order matters for first match),
// DE (5 digits, same as ES). Numeric forms collapse into one regex; the
// UK pattern is tried separately because of its mixed alphanumeric shape.
// Detector also rejects values that pass detectNumber as currency-ish
// because '12345' alone is too ambiguous unless the header hints — we
// rely on the header bias by gating `appliesTo` on number / text.
const POSTAL_NUMERIC = /^\d{5}(?:-\d{4})?$/ // ES/FR/DE/US ZIP+4
const POSTAL_UK = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
registerSubtypeDetector({
  name: 'postal-code',
  appliesTo: ['text', 'category', 'number'],
  test: (v) => {
    const s = v.trim()
    return POSTAL_NUMERIC.test(s) || POSTAL_UK.test(s)
  },
})

// ---------- Detector: UUID (#30) ----------
// RFC 4122 hex with hyphens. Accepts any version (the version nibble is
// not enforced because Excel exports of v7/ULID-shaped IDs are common).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
registerSubtypeDetector({
  name: 'uuid',
  appliesTo: ['text', 'category'],
  test: (v) => UUID_RE.test(v.trim()),
})

// ---------- Detector: Spanish DNI / NIE (#37) ----------
// DNI: 8 digits + checksum letter. NIE: X/Y/Z + 7 digits + checksum letter
// (X=0, Y=1, Z=2 prefix for the modulo calculation). The letter is the
// lookup of (num % 23) in 'TRWAGMYFPDXBNJZSQVHLCKE'.
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const DNI_RE = /^(\d{8})([A-Z])$/
const NIE_RE = /^([XYZ])(\d{7})([A-Z])$/
registerSubtypeDetector({
  name: 'dni-nie',
  appliesTo: ['text', 'category'],
  test: (v) => {
    const s = v.trim().toUpperCase()
    const dni = DNI_RE.exec(s)
    if (dni) {
      const num = Number(dni[1])
      return DNI_LETTERS[num % 23] === dni[2]
    }
    const nie = NIE_RE.exec(s)
    if (nie) {
      const prefix = { X: '0', Y: '1', Z: '2' }[nie[1] as 'X' | 'Y' | 'Z']
      const num = Number(prefix + nie[2])
      return DNI_LETTERS[num % 23] === nie[3]
    }
    return false
  },
})

/**
 * Infer a specialized subtype for a column once its base type is known.
 * Returns undefined when no detector reaches SUBTYPE_THRESHOLD coverage.
 *
 * Subtypes are purely informational (badge label, format hints). They never
 * change `Column.type`, so charts and stats keep working unmodified.
 */
export function detectSubtype(
  rawValues: (string | null | undefined)[],
  baseType: ColumnType,
): ColumnSubtype | undefined {
  const filtered = rawValues.filter((v): v is string => v != null && v !== '')
  if (filtered.length === 0) return undefined
  const sampled = sample(filtered)
  const total = sampled.length

  for (const det of SUBTYPE_DETECTORS) {
    if (det.appliesTo.length > 0 && !det.appliesTo.includes(baseType)) continue
    let hits = 0
    for (const v of sampled) {
      if (det.test(v)) hits++
    }
    if (hits / total >= SUBTYPE_THRESHOLD) return det.name
  }
  return undefined
}
