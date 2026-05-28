import type { Dataset } from '../types/dataset'
import { dateStr, pickWeighted, randInt, rng, round2 } from './sampleRng'

function generateLogistica(n: number): Record<string, string | number>[] {
  const r = rng(233)
  const origenes = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Bilbao']
  const destinos = [
    'Lisboa',
    'París',
    'Milán',
    'Berlín',
    'Ámsterdam',
    'Londres',
    'Roma',
    'Bruselas',
  ]
  const estados = ['Entregado', 'En tránsito', 'Retrasado', 'Devuelto']
  const estadosW = [78, 14, 6, 2]
  const transportistas = ['SkyExpress', 'EuroCargo', 'NorthLine', 'IberiaFreight']
  const transportistasW = [40, 28, 18, 14]
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const origen = origenes[randInt(0, origenes.length - 1, r)]
    let destino = destinos[randInt(0, destinos.length - 1, r)]
    if (destino === origen)
      destino = destinos[(randInt(0, destinos.length - 1, r) + 1) % destinos.length]
    const peso_kg = round2(0.5 + r() * 320)
    const km = randInt(450, 2400, r)
    const dias_envio = Math.max(1, Math.round(km / 600 + (r() - 0.3) * 2))
    const coste_eur = round2(km * 0.08 + peso_kg * 0.45 + r() * 12)
    const estado = pickWeighted(estados, estadosW, r)
    const transportista = pickWeighted(transportistas, transportistasW, r)
    rows.push({
      envio: `ENV-${String(i + 1).padStart(5, '0')}`,
      fecha: dateStr(2026, randInt(1, 5, r), randInt(1, 28, r)),
      origen,
      destino,
      transportista,
      peso_kg,
      km,
      dias_envio,
      coste_eur,
      estado,
    })
  }
  return rows
}

export const logistica: Dataset = {
  id: 'logistica',
  label: 'Envíos internacionales',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'envio', label: 'Envío', type: 'text' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'origen', label: 'Origen', type: 'category' },
    { key: 'destino', label: 'Destino', type: 'category' },
    { key: 'transportista', label: 'Transportista', type: 'category' },
    { key: 'peso_kg', label: 'Peso (kg)', type: 'number' },
    { key: 'km', label: 'Distancia (km)', type: 'number' },
    { key: 'dias_envio', label: 'Días envío', type: 'number' },
    { key: 'coste_eur', label: 'Coste (€)', type: 'currency' },
    { key: 'estado', label: 'Estado', type: 'category' },
  ],
  rows: generateLogistica(150),
}
