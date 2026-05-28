import type { Dataset } from '../types/dataset'
import { pickWeighted, randInt, rng, round2 } from './sampleRng'

function generateSalud(n: number): Record<string, string | number>[] {
  const r = rng(311)
  const sexos = ['Mujer', 'Hombre']
  const sexosW = [51, 49]
  const grupos = ['<25', '25-39', '40-54', '55-69', '70+']
  const gruposW = [10, 28, 30, 22, 10]
  const condiciones = ['Sano', 'Hipertensión', 'Diabetes', 'Dislipemia', 'Asma']
  const condicionesW = [55, 18, 12, 9, 6]
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const sexo = pickWeighted(sexos, sexosW, r)
    const grupo = pickWeighted(grupos, gruposW, r)
    const condicion = pickWeighted(condiciones, condicionesW, r)
    const ageMid =
      grupo === '<25'
        ? 22
        : grupo === '25-39'
          ? 33
          : grupo === '40-54'
            ? 48
            : grupo === '55-69'
              ? 63
              : 76
    const tas =
      condicion === 'Hipertensión'
        ? randInt(140, 175, r)
        : Math.round(110 + (ageMid - 25) * 0.5 + (r() - 0.5) * 14)
    const tad = Math.round(tas * (0.6 + r() * 0.1))
    const colesterol = condicion === 'Dislipemia' ? randInt(230, 290, r) : randInt(140, 220, r)
    const glucosa = condicion === 'Diabetes' ? randInt(135, 220, r) : randInt(75, 110, r)
    const imc = round2(22 + (ageMid - 25) * 0.07 + (r() - 0.3) * 5)
    rows.push({
      paciente: `P-${String(i + 1).padStart(4, '0')}`,
      sexo,
      grupo_edad: grupo,
      condicion,
      tas,
      tad,
      colesterol,
      glucosa,
      imc,
    })
  }
  return rows
}

export const salud: Dataset = {
  id: 'salud',
  label: 'Métricas clínicas',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'paciente', label: 'Paciente', type: 'text' },
    { key: 'sexo', label: 'Sexo', type: 'category' },
    { key: 'grupo_edad', label: 'Grupo edad', type: 'category' },
    { key: 'condicion', label: 'Condición', type: 'category' },
    { key: 'tas', label: 'TAS (mmHg)', type: 'number' },
    { key: 'tad', label: 'TAD (mmHg)', type: 'number' },
    { key: 'colesterol', label: 'Colesterol (mg/dL)', type: 'number' },
    { key: 'glucosa', label: 'Glucosa (mg/dL)', type: 'number' },
    { key: 'imc', label: 'IMC', type: 'number' },
  ],
  rows: generateSalud(140),
}
