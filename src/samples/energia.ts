import type { Dataset } from '../types/dataset'
import { dateStr, pickWeighted, randInt, rng, round2 } from './sampleRng'

function generateEnergia(n: number): Record<string, string | number>[] {
  const r = rng(53)
  const regiones = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza']
  const regionesW = [22, 20, 14, 12, 11, 9]
  const fuentes = ['Solar', 'Eólica', 'Hidráulica', 'Gas', 'Nuclear']
  const fuentesW = [28, 24, 14, 22, 12]
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const day = randInt(1, 28, r)
    const month = randInt(1, 12, r)
    const year = 2025 + (r() > 0.5 ? 1 : 0)
    const region = pickWeighted(regiones, regionesW, r)
    const fuente = pickWeighted(fuentes, fuentesW, r)
    // Consumption baseline scaled by region + seasonal swing.
    const base =
      region === 'Madrid' ? 1400 : region === 'Barcelona' ? 1250 : region === 'Valencia' ? 900 : 750
    const seasonal = month <= 2 || month === 12 ? 1.35 : month >= 6 && month <= 8 ? 1.2 : 0.9
    const consumo_mwh = round2(base * seasonal * (0.85 + r() * 0.3))
    const coste_eur = round2(
      consumo_mwh * (fuente === 'Solar' ? 55 : fuente === 'Eólica' ? 60 : 95),
    )
    const co2_kg = round2(consumo_mwh * (fuente === 'Solar' || fuente === 'Eólica' ? 10 : 380))
    rows.push({
      fecha: dateStr(year, month, day),
      region,
      fuente,
      consumo_mwh,
      coste_eur,
      co2_kg,
    })
  }
  return rows
}

export const energia: Dataset = {
  id: 'energia',
  label: 'Consumo eléctrico',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'region', label: 'Región', type: 'category' },
    { key: 'fuente', label: 'Fuente', type: 'category' },
    { key: 'consumo_mwh', label: 'Consumo (MWh)', type: 'number' },
    { key: 'coste_eur', label: 'Coste (€)', type: 'currency' },
    { key: 'co2_kg', label: 'CO₂ (kg)', type: 'number' },
  ],
  rows: generateEnergia(120),
}
