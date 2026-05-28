import type { Dataset } from '../../types/dataset'

/**
 * Domain-pack framework (sub-project #2). A pack inspects column headers
 * (plus light data sniffing) and reports a confidence score that the dataset
 * belongs to a known vertical — HR, sales, finance, marketing, retail,
 * education, etc. Picks the strongest match (if any) and exposes the pack
 * so downstream insights / story / dashboard layers can customise their
 * output for that vertical.
 *
 * Packs are intentionally lightweight (no per-row scans). They're meant as
 * a *hint* — the parser already detected column types; the domain pack just
 * adds the "what is this dataset about" layer on top.
 */

export type DomainId =
  | 'shifts'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'retail'
  | 'logistics'
  | 'marketing'
  | 'real_estate'
  | 'education'
  | 'healthcare'
  | 'sports'
  | 'survey'

export interface DomainMatchSignal {
  /** Header keyword (case + diacritic-insensitive). */
  header: string
  /** Bonus contributed when the header matches. */
  weight: number
}

export interface DomainPack {
  id: DomainId
  label: string
  description: string
  /** Header keywords + weights summed into the confidence score. */
  signals: ReadonlyArray<DomainMatchSignal>
  /** Optional minimum number of distinct signal matches. Defaults to 2. */
  minMatches?: number
  /** Optional column-type fingerprint — every entry must appear at least once. */
  requires?: ReadonlyArray<'number' | 'currency' | 'date' | 'category' | 'text' | 'geo' | 'boolean'>
  /** Suggestion bullets surfaced to the user when this pack wins. */
  hints: ReadonlyArray<string>
}

export interface DomainMatch {
  pack: DomainPack
  confidence: number
  matchedSignals: ReadonlyArray<{ header: string; matchedColumn: string; weight: number }>
}

/** Strip accents and lowercase for header matching. */
export function normaliseHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Score a single domain pack against a dataset. Returns a DomainMatch when
 * the pack passes its minimum-matches threshold (plus optional column-type
 * fingerprint), otherwise null.
 */
export function scorePack(dataset: Dataset, pack: DomainPack): DomainMatch | null {
  const minMatches = pack.minMatches ?? 2
  if (pack.requires) {
    const present = new Set(dataset.columns.map((c) => c.type))
    for (const t of pack.requires) {
      if (!present.has(t)) return null
    }
  }
  const headers = dataset.columns.map((c) => ({
    key: c.key,
    label: c.label,
    norm: normaliseHeader(c.label),
  }))
  const matched: { header: string; matchedColumn: string; weight: number }[] = []
  let score = 0
  const seen = new Set<string>()
  for (const sig of pack.signals) {
    const needle = normaliseHeader(sig.header)
    if (seen.has(needle)) continue
    for (const h of headers) {
      if (!h.norm.includes(needle)) continue
      matched.push({ header: needle, matchedColumn: h.key, weight: sig.weight })
      score += sig.weight
      seen.add(needle)
      break
    }
  }
  if (matched.length < minMatches) return null
  return { pack, confidence: score, matchedSignals: matched }
}
