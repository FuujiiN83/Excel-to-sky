/**
 * Shared deterministic seeded RNG used by every sample-dataset generator.
 * Lives in its own module so the older samples can keep their inline copy
 * (rows must remain bit-identical) while new samples reuse a single helper.
 */
export function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

export function pickWeighted<T>(arr: readonly T[], weights: readonly number[], r: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let n = r() * total
  for (let i = 0; i < arr.length; i++) {
    n -= weights[i]
    if (n <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

export function randInt(min: number, max: number, r: () => number): number {
  return Math.floor(min + r() * (max - min + 1))
}

export function dateStr(y: number, m: number, d: number): string {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100
}
