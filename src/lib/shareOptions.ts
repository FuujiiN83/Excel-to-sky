/**
 * Per-share local options (#159, #161, #162, #163). These never leave the
 * browser — the Supabase payload is the raw dataset only. The options live
 * in localStorage keyed by slug so the next time the user visits the share
 * page for that slug, their picks are restored.
 *
 * The backend already enforces a 90-day TTL via pg_cron, so the TTL select
 * is informational: it tells the user when the link will go away rather
 * than changing the actual cron behaviour. Picking a *shorter* TTL also
 * computes a "delete by" date so the share page can surface a manual
 * delete reminder.
 */

export type ShareTtl = 7 | 30 | 90 | 365

export interface ShareOptions {
  /** Days until the link should go away. Server-side cron enforces 90; UI surfaces it. */
  ttlDays: ShareTtl
  /** Hide drill-down + interactivity on the public view, force read-only mode. */
  readOnly: boolean
  /** Custom brand name shown in the public footer instead of "Excel to Sky". */
  whiteLabel: string | null
  /** Whether to encode the current filter state in the share URL (#163). */
  encodeFilters: boolean
  /**
   * Optional password hash (#160). Salted FNV-1a — not cryptographically
   * secure, but enough to gate casual access on a public link. The salt is
   * the slug itself so a stolen hash isn't reusable across shares.
   */
  passwordHash: string | null
}

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  ttlDays: 90,
  readOnly: true,
  whiteLabel: null,
  encodeFilters: false,
  passwordHash: null,
}

/** Salted hash. Visit-time password is checked against this value. */
export function hashPassword(slug: string, password: string): string {
  const input = `${slug}::${password}`
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

const STORAGE_PREFIX = 'ets-share-opts-v1'

function key(slug: string): string {
  return `${STORAGE_PREFIX}:${slug}`
}

export function loadShareOptions(slug: string): ShareOptions {
  if (typeof window === 'undefined') return DEFAULT_SHARE_OPTIONS
  try {
    const raw = window.localStorage.getItem(key(slug))
    if (!raw) return DEFAULT_SHARE_OPTIONS
    const parsed = JSON.parse(raw) as Partial<ShareOptions>
    return {
      ttlDays: validTtl(parsed.ttlDays) ?? DEFAULT_SHARE_OPTIONS.ttlDays,
      readOnly:
        typeof parsed.readOnly === 'boolean' ? parsed.readOnly : DEFAULT_SHARE_OPTIONS.readOnly,
      whiteLabel: typeof parsed.whiteLabel === 'string' ? parsed.whiteLabel.slice(0, 60) : null,
      encodeFilters:
        typeof parsed.encodeFilters === 'boolean'
          ? parsed.encodeFilters
          : DEFAULT_SHARE_OPTIONS.encodeFilters,
      passwordHash: typeof parsed.passwordHash === 'string' ? parsed.passwordHash : null,
    }
  } catch {
    return DEFAULT_SHARE_OPTIONS
  }
}

export function saveShareOptions(slug: string, options: ShareOptions): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(options))
  } catch {
    // ignore
  }
}

function validTtl(v: unknown): ShareTtl | undefined {
  return v === 7 || v === 30 || v === 90 || v === 365 ? v : undefined
}

/**
 * Encode a list of (column, value) equality filters as URL search params
 * (#163). The decoded form is `?f=col1:val1,col2:val2`. Values are URI-encoded
 * so commas and colons inside payloads round-trip safely.
 */
export function encodeFiltersToUrl(
  filters: ReadonlyArray<{ column: string; value: string }>,
): string {
  if (filters.length === 0) return ''
  const parts = filters.map((f) => `${encodeURIComponent(f.column)}:${encodeURIComponent(f.value)}`)
  return `?f=${encodeURIComponent(parts.join(','))}`
}

export function decodeFiltersFromUrl(search: string): { column: string; value: string }[] {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const raw = params.get('f')
    if (!raw) return []
    const decoded = decodeURIComponent(raw)
    return decoded
      .split(',')
      .map((segment) => {
        const colon = segment.indexOf(':')
        if (colon < 0) return null
        return {
          column: decodeURIComponent(segment.slice(0, colon)),
          value: decodeURIComponent(segment.slice(colon + 1)),
        }
      })
      .filter((x): x is { column: string; value: string } => x !== null)
  } catch {
    return []
  }
}

export function expiryDateString(createdAtIso: string, ttlDays: ShareTtl): string {
  const d = new Date(createdAtIso)
  d.setUTCDate(d.getUTCDate() + ttlDays)
  return d.toISOString().slice(0, 10)
}
