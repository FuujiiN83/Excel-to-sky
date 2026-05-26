// src/lib/insights/i18n/es.ts
import type { FindingData } from '../types'

export interface RenderedText { title: string; body: string; suggestion?: string }

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

export function render(data: FindingData, columnLabels: Record<string, string>): RenderedText {
  const lbl = (k: string): string => columnLabels[k] ?? k
  switch (data.kind) {
    case 'numeric_outlier':
      return {
        title: `${lbl(data.column)}: valor ${fmt(data.value)} se aleja ${data.zScore.toFixed(1)}σ de la media`,
        body: `La media es ${fmt(data.mean)} con desviación ${fmt(data.stdDev)}. Este registro destaca claramente del resto.`,
        suggestion: 'Filtrar solo outliers',
      }
    case 'category_concentration':
      return {
        title: `${lbl(data.column)}: los ${data.top.length} valores principales acumulan ${pct(data.coveragePct)}`,
        body: `${data.top.slice(0, 3).map((t) => `${t.value} (${pct(t.pct)})`).join(', ')}. Distribución concentrada.`,
        suggestion: 'Agrupar por estos valores',
      }
    case 'cardinality_anomaly':
      return data.reason === 'all_unique'
        ? {
            title: `${lbl(data.column)}: todos los ${data.total} valores son únicos`,
            body: 'Probablemente un identificador. No aporta valor para agrupar o agregar.',
          }
        : {
            title: `${lbl(data.column)}: un solo valor en ${data.total} filas`,
            body: 'Esta columna no aporta variación. Podrías eliminarla del análisis.',
          }
    case 'missing_data':
      return {
        title: `${lbl(data.column)}: ${pct(data.nullPct)} de las filas están vacías`,
        body: `${data.nullCount} celdas sin dato. Considera limpiar antes de analizar.`,
      }
    case 'distribution_shape':
      return {
        title: `${lbl(data.column)}: distribución ${describeShape(data.shape)}`,
        body: shapeInsight(data.shape),
      }
    case 'time_density_gap':
      return {
        title: `${lbl(data.column)}: hueco de ${data.gapDays} días sin datos`,
        body: `Entre ${data.gapStart} y ${data.gapEnd} no hay registros. Posible fallo de captura o periodo no activo.`,
      }
    case 'duplicate_lookalike':
      return {
        title: `${lbl(data.column)}: ${data.groups.length} grupo${data.groups.length === 1 ? '' : 's'} con variantes que parecen el mismo valor`,
        body: data.groups.slice(0, 2).map((g) => `"${g.canonical}" ↔ ${g.variants.slice(0, 3).map((v) => `"${v}"`).join(', ')}`).join('. '),
        suggestion: 'Normalizar variantes',
      }
    case 'text_outlier':
      return {
        title: `${lbl(data.column)}: valor anómalo (${data.reason === 'too_long' ? 'demasiado largo' : data.reason === 'too_short' ? 'demasiado corto' : 'caracteres raros'})`,
        body: `"${data.value.slice(0, 60)}${data.value.length > 60 ? '…' : ''}" — posible error de carga.`,
      }
    case 'numeric_correlation':
      return {
        title: `${lbl(data.columnA)} y ${lbl(data.columnB)} se mueven ${data.r > 0 ? 'a la par' : 'en sentido opuesto'} (r = ${data.r.toFixed(2)})`,
        body: data.r > 0
          ? 'A más en una columna, más en la otra. Correlación fuerte.'
          : 'A más en una columna, menos en la otra. Correlación fuerte e inversa.',
        suggestion: 'Cruzar en scatter plot',
      }
    case 'group_disparity':
      return {
        title: `${lbl(data.topGroup)} tiene ${data.ratio.toFixed(1)}× más ${lbl(data.metricColumn)} que ${lbl(data.bottomGroup)}`,
        body: `Media de ${data.topValue.toFixed(1)} vs ${data.bottomValue.toFixed(1)}. Diferencia significativa entre grupos.`,
        suggestion: 'Comparar grupos',
      }
    case 'time_by_group':
      return {
        title: `${lbl(data.metricColumn)} por ${lbl(data.groupColumn)} tiene tendencias divergentes`,
        body: data.series.slice(0, 3).map((s) => `${s.group}: ${s.trend === 'rising' ? '+' : s.trend === 'falling' ? '−' : '±'}${Math.abs(s.deltaPct).toFixed(0)}%`).join(', '),
      }
    case 'conditional_outlier':
      return {
        title: `Dentro de ${lbl(data.groupColumn)}="${data.group}", ${lbl(data.column)}=${fmt(data.value)} es atípico`,
        body: `Media local del grupo: ${fmt(data.localMean)}. Media global: ${fmt(data.globalMean)}.`,
      }
    case 'quality_score':
      return {
        title: `Calidad del dataset: ${pct(data.score)}`,
        body: `${data.cellsValid} de ${data.cellsTotal} celdas válidas. ${data.duplicateRows} filas duplicadas.`,
      }
    case 'schema_summary':
      return {
        title: `${data.total} columnas detectadas`,
        body: Object.entries(data.byType).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`).join(' · '),
      }
    case 'temporal_coverage':
      return {
        title: `Datos entre ${data.from} y ${data.to}`,
        body: `${data.days} días cubiertos, ~${data.densityPerDay.toFixed(1)} registros por día.`,
      }
    case 'volume_context':
      return {
        title: `${fmt(data.rows)} filas × ${data.columns} columnas`,
        body: `${fmt(data.cells)} celdas en total.`,
      }
  }
}

function describeShape(s: string): string {
  switch (s) {
    case 'normal': return 'aproximadamente normal'
    case 'bimodal': return 'bimodal (dos picos)'
    case 'right_skewed': return 'sesgada a la derecha (cola larga arriba)'
    case 'left_skewed': return 'sesgada a la izquierda (cola larga abajo)'
    case 'uniform': return 'uniforme'
    case 'sparse': return 'dispersa (pocos valores únicos)'
  }
  return s
}

function shapeInsight(s: string): string {
  switch (s) {
    case 'normal': return 'Los datos se concentran alrededor de la media. Mean ≈ median.'
    case 'bimodal': return 'Probablemente hay dos poblaciones distintas mezcladas. Considera segmentar.'
    case 'right_skewed': return 'Pocos valores muy altos arrastran la media. Mediana es más representativa.'
    case 'left_skewed': return 'Pocos valores muy bajos arrastran la media. Mediana es más representativa.'
    case 'uniform': return 'Los valores se reparten sin un centro claro. Quizá categórica disfrazada de numérica.'
    case 'sparse': return 'Pocos valores únicos. Quizá deberías tratarla como categoría.'
  }
  return ''
}
