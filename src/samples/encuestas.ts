import type { Dataset } from '../types/dataset'
import { pickWeighted, randInt, rng } from './sampleRng'

function generateEncuestas(n: number): Record<string, string | number>[] {
  const r = rng(177)
  const segmentos = ['Free', 'Pro', 'Team', 'Enterprise']
  const segmentosW = [44, 32, 18, 6]
  const paises = ['ES', 'MX', 'AR', 'CO', 'CL', 'US', 'BR']
  const paisesW = [36, 14, 10, 9, 7, 16, 8]
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const segmento = pickWeighted(segmentos, segmentosW, r)
    const pais = pickWeighted(paises, paisesW, r)
    // NPS tends higher on paid tiers, lower on Free.
    const npsBias = segmento === 'Free' ? -1 : segmento === 'Enterprise' ? 2 : 0
    const nps = Math.max(0, Math.min(10, Math.round(7 + npsBias + (r() - 0.5) * 4)))
    const csat = Math.max(1, Math.min(5, Math.round(3.7 + (r() - 0.5) * 2)))
    const usabilidad = Math.max(1, Math.min(5, Math.round(3.9 + (r() - 0.5) * 1.7)))
    const recomendaria = nps >= 7 ? 'Sí' : nps <= 5 ? 'No' : 'Quizá'
    rows.push({
      id_respuesta: `R-${String(i + 1).padStart(4, '0')}`,
      segmento,
      pais,
      nps,
      csat,
      usabilidad,
      recomendaria,
      antiguedad_meses: randInt(1, 36, r),
    })
  }
  return rows
}

export const encuestas: Dataset = {
  id: 'encuestas',
  label: 'Encuesta NPS',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'id_respuesta', label: 'Respuesta', type: 'text' },
    { key: 'segmento', label: 'Segmento', type: 'category' },
    { key: 'pais', label: 'País', type: 'category' },
    { key: 'nps', label: 'NPS (0-10)', type: 'number' },
    { key: 'csat', label: 'CSAT (1-5)', type: 'number' },
    { key: 'usabilidad', label: 'Usabilidad (1-5)', type: 'number' },
    { key: 'recomendaria', label: 'Recomendaría', type: 'category' },
    { key: 'antiguedad_meses', label: 'Antigüedad (meses)', type: 'number' },
  ],
  rows: generateEncuestas(160),
}
