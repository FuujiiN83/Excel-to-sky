import type { Dataset } from '../types/dataset'

// Deterministic seeded RNG ported from legacy app/data.jsx so the sample
// rows match the legacy dataset exactly (seed=21, n=297).
function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
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

function generateVentas(n: number): Record<string, string | number>[] {
  const r = rng(21)
  const productos = [
    'Plan Pro', 'Plan Team', 'Plan Starter', 'Add-on Storage',
    'Add-on Seats', 'Onboarding', 'Soporte Premium',
  ]
  const productosW = [28, 22, 30, 8, 6, 3, 3]
  const productoPrecio: Record<string, number> = {
    'Plan Pro': 49,
    'Plan Team': 99,
    'Plan Starter': 12,
    'Add-on Storage': 8,
    'Add-on Seats': 6,
    Onboarding: 480,
    'Soporte Premium': 220,
  }
  const clientes = [
    'Glovo', 'Cabify', 'Idealista', 'BBVA', 'Santander', 'Telefónica',
    'Inditex', 'Mango', 'Mercadona', 'El Corte Inglés', 'Acciona', 'Repsol',
    'Iberdrola', 'MásMóvil', 'Tuenti', 'Tendam', 'PcComponentes', 'Jazztel',
    'Wallapop', 'Wallbox',
  ]
  const canales = ['Web', 'Sales', 'Partner', 'API']
  const canalesW = [50, 22, 16, 12]
  const unidadesOpts = [1, 2, 3, 5, 10, 25]
  const unidadesW = [40, 22, 14, 12, 8, 4]

  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const p = pickWeighted(productos, productosW, r)
    const unidades = pickWeighted(unidadesOpts, unidadesW, r)
    const importe = productoPrecio[p] * unidades * (0.9 + r() * 0.3)
    const fecha = dateStr(2026, 3, randInt(1, 31, r))
    rows.push({
      producto: p,
      cliente: pick(clientes, r),
      importe: Math.round(importe),
      unidades,
      fecha,
      canal: pickWeighted(canales, canalesW, r),
    })
  }
  return rows
}

export const ventas: Dataset = {
  id: 'ventas',
  label: 'Ventas',
  createdAt: '2026-05-21T00:00:00Z',
  columns: [
    { key: 'producto', label: 'Producto', type: 'category' },
    { key: 'cliente', label: 'Cliente', type: 'text' },
    { key: 'importe', label: 'Importe', type: 'number' },
    { key: 'unidades', label: 'Unidades', type: 'number' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'canal', label: 'Canal', type: 'category' },
  ],
  rows: generateVentas(297),
}
