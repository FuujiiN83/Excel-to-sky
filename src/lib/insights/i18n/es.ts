// src/lib/insights/i18n/es.ts
import type { FindingData } from '../types'

export interface RenderedText {
  title: string
  body: string
  suggestion?: string
}

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
        body: `${data.top
          .slice(0, 3)
          .map((t) => `${t.value} (${pct(t.pct)})`)
          .join(', ')}. Distribución concentrada.`,
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
        body: data.groups
          .slice(0, 2)
          .map(
            (g) =>
              `"${g.canonical}" ↔ ${g.variants
                .slice(0, 3)
                .map((v) => `"${v}"`)
                .join(', ')}`,
          )
          .join('. '),
        suggestion: 'Normalizar variantes',
      }
    case 'text_outlier':
      return {
        title: `${lbl(data.column)}: valor anómalo (${data.reason === 'too_long' ? 'demasiado largo' : data.reason === 'too_short' ? 'demasiado corto' : 'caracteres raros'})`,
        body: `"${data.value.slice(0, 60)}${data.value.length > 60 ? '…' : ''}" — posible error de carga.`,
      }
    case 'numeric_correlation': {
      const ci =
        data.ciLow !== undefined && data.ciHigh !== undefined
          ? ` (IC 95%: ${data.ciLow.toFixed(2)} a ${data.ciHigh.toFixed(2)})`
          : ''
      return {
        title: `${lbl(data.columnA)} y ${lbl(data.columnB)} se mueven ${data.r > 0 ? 'a la par' : 'en sentido opuesto'} (r = ${data.r.toFixed(2)}${ci})`,
        body:
          data.r > 0
            ? 'A más en una columna, más en la otra. Correlación fuerte.'
            : 'A más en una columna, menos en la otra. Correlación fuerte e inversa.',
        suggestion: 'Cruzar en scatter plot',
      }
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
        body: data.series
          .slice(0, 3)
          .map(
            (s) =>
              `${s.group}: ${s.trend === 'rising' ? '+' : s.trend === 'falling' ? '−' : '±'}${Math.abs(s.deltaPct).toFixed(0)}%`,
          )
          .join(', '),
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
        body: Object.entries(data.byType)
          .filter(([, n]) => n > 0)
          .map(([t, n]) => `${n} ${t}`)
          .join(' · '),
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
    case 'iqr_outlier':
      return {
        title: `${lbl(data.column)}: ${fmt(data.value)} cae fuera del rango intercuartílico`,
        body: `Q1=${fmt(data.q1)}, Q3=${fmt(data.q3)} (IQR ${fmt(data.iqr)}). El valor está ${data.side === 'above' ? 'por encima' : 'por debajo'} del umbral 1,5 × IQR.`,
        suggestion: 'Revisar registro',
      }
    case 'mad_outlier':
      return {
        title: `${lbl(data.column)}: ${fmt(data.value)} es atípico (z modificado ${data.modifiedZ.toFixed(1)})`,
        body: `Mediana ${fmt(data.median)}, MAD ${fmt(data.mad)}. Detector robusto: ignora la influencia del propio outlier.`,
        suggestion: 'Comparar con z-score',
      }
    case 'rank_correlation': {
      const method = data.method === 'spearman' ? 'Spearman ρ' : 'Kendall τ'
      return {
        title: `${lbl(data.columnA)} y ${lbl(data.columnB)} están correlacionadas por rangos (${method} = ${data.coefficient.toFixed(2)})`,
        body: `Captura relaciones monótonas no necesariamente lineales sobre ${data.n} pares. Útil cuando la relación entre las columnas es curva.`,
      }
    }
    case 'effect_size': {
      const labelMagnitude =
        data.magnitude === 'large' ? 'grande' : data.magnitude === 'medium' ? 'medio' : 'pequeño'
      return {
        title: `${lbl(data.metricColumn)} entre "${data.groupA}" y "${data.groupB}" tiene un efecto ${labelMagnitude} (d=${data.d.toFixed(2)})`,
        body: `Medias ${fmt(data.meanA)} vs ${fmt(data.meanB)} (n=${data.nA}/${data.nB}). El tamaño del efecto descuenta el ruido de la muestra.`,
      }
    }
    case 'pareto':
      return {
        title: `${lbl(data.column)} sigue un patrón Pareto: el 20% superior concentra ${pct(data.share80)}`,
        body: `${data.topCount} de ${data.totalCount} registros acumulan ${pct(data.topShare)} del total.`,
        suggestion: 'Priorizar la cola superior',
      }
    case 'gini':
      return {
        title: `${lbl(data.column)}: índice Gini ${data.gini.toFixed(2)}`,
        body: `Quintil más alto se lleva ${pct(data.topQuintileShare)} del total sobre ${data.n} registros. 0 = perfecta igualdad, 1 = máxima desigualdad.`,
      }
    case 'benford':
      return {
        title: `${lbl(data.column)}: la distribución de primeros dígitos se aleja de Benford (χ²=${data.chiSquared.toFixed(1)})`,
        body: `Sobre ${data.n} valores. Desviación máxima en un dígito: ${pct(data.maxDeviation)}. Puede indicar fabricación o redondeo extremo.`,
        suggestion: 'Auditar registros',
      }
    case 'chi_square_independence':
      return {
        title: `${lbl(data.columnA)} y ${lbl(data.columnB)} no son independientes (V de Cramér ${data.cramersV.toFixed(2)})`,
        body: `χ²=${data.chiSquared.toFixed(1)} con ${data.degreesOfFreedom} grados de libertad sobre ${data.n} registros.`,
      }
    case 'mann_kendall_trend':
      return {
        title: `${lbl(data.metricColumn)} muestra tendencia ${data.direction === 'rising' ? 'al alza' : data.direction === 'falling' ? 'a la baja' : 'plana'} en el tiempo (τ=${data.tau.toFixed(2)})`,
        body: `Test de Mann-Kendall no paramétrico sobre ${data.n} puntos. Robusto frente a outliers y ruido.`,
      }
    case 'anova':
      return {
        title: `${lbl(data.metricColumn)} difiere significativamente entre los ${data.groups} grupos de ${lbl(data.groupColumn)} (F=${data.f.toFixed(2)})`,
        body: `ANOVA: η²=${data.etaSquared.toFixed(2)} explica la varianza total. p ≈ ${data.pValue.toFixed(3)} con ${data.dfBetween}/${data.dfWithin} grados de libertad.`,
      }
    case 'ks_two_sample':
      return {
        title: `Las distribuciones de ${lbl(data.metricColumn)} en "${data.groupA}" y "${data.groupB}" difieren (KS D=${data.d.toFixed(2)})`,
        body: `Test no paramétrico de Kolmogorov-Smirnov sobre n=${data.nA}/${data.nB}. Detecta diferencias en forma además de medias.`,
      }
    case 'pettitt_changepoint':
      return {
        title: `${lbl(data.metricColumn)}: punto de cambio detectado en el registro ${data.index} (p≈${data.pValue.toFixed(3)})`,
        body: `Media antes ${fmt(data.meanBefore)}, después ${fmt(data.meanAfter)}. Test de Pettitt no paramétrico para un único cambio.`,
        suggestion: 'Segmentar análisis',
      }
    case 'boolean_imbalance':
      return {
        title: `${lbl(data.column)} está desbalanceada: ${pct(data.baseRate)} es ${data.baseRate > 0.5 ? 'verdadero' : 'falso'}`,
        body: `${data.trueCount} verdaderos vs ${data.falseCount} falsos sobre ${data.total}. La columna aporta poca información si la clase minoritaria es muy escasa.`,
      }
    case 'whitespace_string':
      return {
        title: `${lbl(data.column)}: ${data.count} celda${data.count === 1 ? '' : 's'} con solo espacios en blanco (${pct(data.pct)})`,
        body: 'Visualmente parecen vacías pero técnicamente tienen contenido. Probablemente quieras normalizarlas a null.',
        suggestion: 'Limpiar espacios',
      }
    case 'mixed_type_column':
      return {
        title: `${lbl(data.column)}: ${pct(data.mismatchPct)} de las celdas no encaja con el tipo "${data.declaredType}"`,
        body: `${data.mismatchCount} celdas con formato distinto al dominante. Posibles errores de carga o columnas mezcladas.`,
        suggestion: 'Auditar tipos',
      }
    case 'ambiguous_date_locale':
      return {
        title: `${lbl(data.column)}: ${data.bothCount} fecha${data.bothCount === 1 ? '' : 's'} interpretables como DD/MM y MM/DD a la vez`,
        body: `Sobre ${data.total} fechas. Decide explícitamente el formato (p.ej. forzar dd/mm/yyyy) o se asignará el día/mes al azar.`,
        suggestion: 'Forzar formato',
      }
    case 'autocorrelation':
      return {
        title: `${lbl(data.metricColumn)} muestra autocorrelación de lag-${data.lag} (r=${data.r.toFixed(2)})`,
        body: `Los valores próximos en el tiempo están relacionados sobre ${data.n} puntos. Indica memoria/inercia en la serie.`,
      }
    case 'simpsons_paradox':
      return {
        title: `Paradoja de Simpson: la tendencia global de ${lbl(data.yColumn)} vs ${lbl(data.xColumn)} se invierte dentro de ${lbl(data.groupColumn)}`,
        body: `Global: pendiente ${data.globalSlope.toFixed(2)}. Por grupo: ${data.groupSlopes
          .slice(0, 3)
          .map((g) => `${g.group}=${g.slope.toFixed(2)}`)
          .join(', ')}.`,
        suggestion: 'Analizar por grupo',
      }
    case 'kmeans_cluster': {
      const cols = data.columns.map(lbl).join(' × ')
      return {
        title: `${cols} muestran ${data.k} grupos naturales (silueta ${data.silhouette.toFixed(2)})`,
        body: `Tamaños de cluster: ${data.sizes.join(' · ')}. K-means sobre ${data.columns.length} columnas numéricas.`,
        suggestion: 'Cruzar en scatter plot',
      }
    }
    case 'pca_dominant': {
      const cols = data.columns.map(lbl).join(', ')
      const top2 = data.explainedVariance
        .slice(0, 2)
        .map((v) => pct(v))
        .join(' + ')
      return {
        title: `Los dos componentes principales explican ${pct(data.cumulative)} de la varianza`,
        body: `PCA sobre ${cols} (n=${data.n}). PC1+PC2 = ${top2}. El primer componente domina la estructura del dataset.`,
      }
    }
    case 'adf_stationarity': {
      return {
        title: data.isStationary
          ? `${lbl(data.metricColumn)} es estacionaria (ADF, p≈${data.pValue.toFixed(3)})`
          : `${lbl(data.metricColumn)} no es estacionaria — hay tendencia o raíz unitaria (ADF, p≈${data.pValue.toFixed(3)})`,
        body: `Test de Dickey-Fuller aumentado con t=${data.tStatistic.toFixed(2)} sobre ${data.n} puntos.`,
      }
    }
    case 'stl_seasonality':
      return {
        title: `${lbl(data.metricColumn)} muestra estacionalidad de periodo ${data.period} (fuerza ${data.strength.toFixed(2)})`,
        body: `Descomposición STL sobre ${data.n} puntos detecta un patrón cíclico de longitud ${data.period}.`,
      }
    case 'survival_cohort': {
      const top = data.cohorts
        .slice(0, 3)
        .map((c) => `${c.group}: mediana ${c.median.toFixed(0)} días`)
        .join(' · ')
      return {
        title: `${lbl(data.groupColumn)}: tiempos hasta evento divergentes por cohorte`,
        body: `${top}. Análisis de supervivencia simplificado (tiempo hasta evento por grupo).`,
      }
    }
  }
}

function describeShape(s: string): string {
  switch (s) {
    case 'normal':
      return 'aproximadamente normal'
    case 'bimodal':
      return 'bimodal (dos picos)'
    case 'right_skewed':
      return 'sesgada a la derecha (cola larga arriba)'
    case 'left_skewed':
      return 'sesgada a la izquierda (cola larga abajo)'
    case 'uniform':
      return 'uniforme'
    case 'sparse':
      return 'dispersa (pocos valores únicos)'
  }
  return s
}

function shapeInsight(s: string): string {
  switch (s) {
    case 'normal':
      return 'Los datos se concentran alrededor de la media. Mean ≈ median.'
    case 'bimodal':
      return 'Probablemente hay dos poblaciones distintas mezcladas. Considera segmentar.'
    case 'right_skewed':
      return 'Pocos valores muy altos arrastran la media. Mediana es más representativa.'
    case 'left_skewed':
      return 'Pocos valores muy bajos arrastran la media. Mediana es más representativa.'
    case 'uniform':
      return 'Los valores se reparten sin un centro claro. Quizá categórica disfrazada de numérica.'
    case 'sparse':
      return 'Pocos valores únicos. Quizá deberías tratarla como categoría.'
  }
  return ''
}
