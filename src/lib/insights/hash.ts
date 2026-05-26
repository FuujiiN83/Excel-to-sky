// src/lib/insights/hash.ts
// FNV-1a 32-bit hash. Used to generate stable Finding ids from payload.

const OFFSET = 0x811c9dc5
const PRIME = 0x01000193

export function fnv1a(s: string): string {
  let h = OFFSET
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, PRIME)
  }
  // Unsigned 32-bit hex (8 chars)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Hash an arbitrary plain-object payload deterministically by stable JSON. */
export function hashPayload(parts: unknown[]): string {
  return fnv1a(stableStringify(parts))
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v as Record<string, unknown>).sort()
  const obj = v as Record<string, unknown>
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}
