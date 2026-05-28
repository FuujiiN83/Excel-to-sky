import type { Dataset } from '../../types/dataset'
import { DOMAIN_PACKS } from './packs'
import { scorePack, type DomainMatch } from './types'

export type { DomainId, DomainMatch, DomainPack } from './types'
export { DOMAIN_PACKS } from './packs'

/**
 * Auto-detect the dataset's domain (#121). Walks every registered pack,
 * scores it against the dataset headers + column-type fingerprint, then
 * returns the highest-confidence match. Returns null when no pack passed
 * its minimum-signals threshold — that's the silent default; we don't
 * force a domain on every dataset.
 */
export function detectDomain(dataset: Dataset): DomainMatch | null {
  let best: DomainMatch | null = null
  for (const pack of DOMAIN_PACKS) {
    const match = scorePack(dataset, pack)
    if (!match) continue
    if (!best || match.confidence > best.confidence) best = match
  }
  return best
}

/** All matches above their thresholds, ranked by confidence. */
export function rankDomainMatches(dataset: Dataset): DomainMatch[] {
  const out: DomainMatch[] = []
  for (const pack of DOMAIN_PACKS) {
    const m = scorePack(dataset, pack)
    if (m) out.push(m)
  }
  return out.sort((a, b) => b.confidence - a.confidence)
}
