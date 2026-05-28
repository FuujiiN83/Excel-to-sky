import type { Dataset } from '../types/dataset'
import { dateStr, pick, pickWeighted, randInt, rng, round2 } from './sampleRng'

function generateMarketing(n: number): Record<string, string | number>[] {
  const r = rng(101)
  const canales = ['Google Ads', 'Meta', 'TikTok', 'LinkedIn', 'Email', 'SEO']
  const canalesW = [28, 24, 14, 10, 14, 10]
  const campanas = [
    'Lanzamiento Pro',
    'Onboarding',
    'Retención Q2',
    'Black Friday',
    'Webinar serie',
    'Reactivación',
  ]
  const cpcBase: Record<string, number> = {
    'Google Ads': 0.85,
    Meta: 0.55,
    TikTok: 0.4,
    LinkedIn: 5.2,
    Email: 0,
    SEO: 0,
  }
  const ctrBase: Record<string, number> = {
    'Google Ads': 0.045,
    Meta: 0.022,
    TikTok: 0.018,
    LinkedIn: 0.012,
    Email: 0.21,
    SEO: 0.06,
  }
  const rows: Record<string, string | number>[] = []
  for (let i = 0; i < n; i++) {
    const canal = pickWeighted(canales, canalesW, r)
    const campana = pick(campanas, r)
    const impresiones = randInt(800, 28000, r)
    const ctr = ctrBase[canal] * (0.7 + r() * 0.6)
    const clicks = Math.max(1, Math.round(impresiones * ctr))
    const coste_eur = round2(clicks * cpcBase[canal] * (0.8 + r() * 0.4))
    const conversiones = Math.max(0, Math.round(clicks * (0.018 + r() * 0.035)))
    const ingresos_eur = round2(conversiones * (39 + r() * 110))
    rows.push({
      fecha: dateStr(2026, randInt(1, 5, r), randInt(1, 28, r)),
      canal,
      campana,
      impresiones,
      clicks,
      coste_eur,
      conversiones,
      ingresos_eur,
    })
  }
  return rows
}

export const marketing: Dataset = {
  id: 'marketing',
  label: 'Campañas de marketing',
  createdAt: '2026-05-28T00:00:00Z',
  columns: [
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'canal', label: 'Canal', type: 'category' },
    { key: 'campana', label: 'Campaña', type: 'category' },
    { key: 'impresiones', label: 'Impresiones', type: 'number' },
    { key: 'clicks', label: 'Clicks', type: 'number' },
    { key: 'coste_eur', label: 'Coste (€)', type: 'currency' },
    { key: 'conversiones', label: 'Conversiones', type: 'number' },
    { key: 'ingresos_eur', label: 'Ingresos (€)', type: 'currency' },
  ],
  rows: generateMarketing(140),
}
