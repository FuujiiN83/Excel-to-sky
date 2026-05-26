import type { Dataset } from '../types/dataset'

// Deterministic seeded RNG ported from legacy app/data.jsx so the sample
// rows match the legacy dataset exactly (seed=13, n=212).
function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function pickWeighted<T>(arr: readonly T[], weights: readonly number[], r: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let n = r() * total
  for (let i = 0; i < arr.length; i++) {
    n -= weights[i]
    if (n <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

function randInt(min: number, max: number, r: () => number): number {
  return Math.floor(min + r() * (max - min + 1))
}

function dateStr(y: number, m: number, d: number): string {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

interface Destino {
  d: string
  p: string
  w: number
  base: number
}

function generateViajes(n: number): Record<string, string | number>[] {
  const r = rng(13)
  const destinos: readonly Destino[] = [
    { d: 'Tokio', p: 'Japón', w: 14, base: 1450 },
    { d: 'Roma', p: 'Italia', w: 26, base: 380 },
    { d: 'Nueva York', p: 'EE.UU.', w: 18, base: 920 },
    { d: 'Lisboa', p: 'Portugal', w: 22, base: 240 },
    { d: 'París', p: 'Francia', w: 28, base: 320 },
    { d: 'Bangkok', p: 'Tailandia', w: 10, base: 1100 },
    { d: 'Marrakech', p: 'Marruecos', w: 12, base: 410 },
    { d: 'Estambul', p: 'Turquía', w: 14, base: 360 },
    { d: 'Praga', p: 'R. Checa', w: 12, base: 280 },
    { d: 'Buenos Aires', p: 'Argentina', w: 8, base: 1280 },
    { d: 'Reikiavik', p: 'Islandia', w: 6, base: 1620 },
    { d: 'El Cairo', p: 'Egipto', w: 7, base: 690 },
    { d: 'Edimburgo', p: 'Reino Unido', w: 10, base: 290 },
    { d: 'Berlín', p: 'Alemania', w: 14, base: 260 },
  ]
  const aerolineas = [
    'Iberia', 'Vueling', 'Ryanair', 'Lufthansa', 'Air France', 'KLM',
    'British Airways', 'Emirates',
  ]
  const aerolineasW = [22, 18, 16, 10, 10, 8, 8, 8]
  const pasajerosOpts = [1, 2, 3, 4, 5, 6]
  const pasajerosW = [10, 38, 18, 22, 8, 4]

  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const dest = pickWeighted(destinos, destinos.map(x => x.w), r)
    const duracion = Math.max(2, Math.round(3 + r() * 9))
    const pasajeros = pickWeighted(pasajerosOpts, pasajerosW, r)
    const precio = Math.round((dest.base + duracion * 75 + (r() - 0.5) * dest.base * 0.4) * pasajeros / 50) * 50
    const m = randInt(4, 6, r)
    const fecha = dateStr(2026, m, randInt(1, 28, r))
    rows.push({
      destino: dest.d,
      pais: dest.p,
      precio,
      duracion,
      fecha,
      pasajeros,
      aerolinea: pickWeighted(aerolineas, aerolineasW, r),
    })
  }
  return rows
}

export const viajes: Dataset = {
  id: 'viajes',
  label: 'Viajes',
  createdAt: '2026-05-21T00:00:00Z',
  columns: [
    { key: 'destino', label: 'Destino', type: 'category' },
    { key: 'pais', label: 'País', type: 'category' },
    { key: 'precio', label: 'Precio', type: 'number' },
    { key: 'duracion', label: 'Duración', type: 'number' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'pasajeros', label: 'Pasajeros', type: 'number' },
    { key: 'aerolinea', label: 'Aerolínea', type: 'category' },
  ],
  rows: generateViajes(212),
}
