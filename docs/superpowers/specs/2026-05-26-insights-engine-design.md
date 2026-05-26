# Insights Engine — Design Spec

**Fecha:** 2026-05-26
**Sub-proyecto:** #1 de 8 del producto final "Excel→Sky narrativo"
**Estado:** Brainstorming cerrado, pendiente revisión del usuario antes del plan de implementación.

---

## 1. Propósito y alcance

### 1.1 Qué hace

Dado un `Dataset` (schema + filas), el motor produce un `InsightReport` con `Finding[]` rankeado por interestingness y un `DatasetSummary` con metadata útil. Es un módulo de análisis estadístico puro, independiente de UI, sin dependencias externas, ejecución 100% en el navegador (Web Worker).

### 1.2 Por qué existe

Es la base del producto narrativo final. Los sub-proyectos posteriores (#2 plug-ins de dominio, #3 story composer, #4 renderer scrollytelling, #5 exploración interactiva, #6 comparación, #7 sharing avanzado) consumen `InsightReport`. Sin un motor de insights potente, todo el resto es decoración.

### 1.3 Restricciones

- **Privacidad máxima**: cero llamadas a internet, cero datos enviados a terceros. Todo el procesamiento sucede en el navegador del usuario (decisión previa de spec maestro 2026-05-26-excel-to-sky-design.md).
- **Sin LLM**: motor 100% basado en heurísticas estadísticas. Cero coste API, latencia local, comportamiento determinista.
- **Sin tests automatizados en esta fase**: el usuario decidió "tests luego". La spec describe criterios verificables manualmente.

### 1.4 En alcance (v1)

Las 16 heurísticas del catálogo aprobado, organizadas en tres familias:

**A. Insights de una sola columna**
1. Outliers numéricos (z-score)
2. Concentración categórica (Pareto)
3. Cardinalidad atípica (1 solo valor / todos únicos)
4. Datos faltantes
5. Forma de distribución (normal, bimodal, sesgada, uniforme, sparse)
6. Densidad temporal con gaps
7. Duplicados sospechosos (fuzzy match)
8. Outliers de texto (longitud, caracteres raros)

**B. Insights de dos o más columnas**
9. Correlaciones numéricas (Pearson)
10. Cross-tab numérica × categórica (group disparity)
11. Evolución temporal por grupo
12. Outlier condicional (normal global, outlier en su grupo)

**C. Insights del dataset completo**
13. Quality score
14. Resumen de schema
15. Cobertura temporal
16. Volumen contextual

### 1.5 Fuera de alcance

- Plug-ins por dominio (turnos, ventas, HR…) → sub-proyecto #2
- Composición narrativa con arco (`Finding[]` → `Scene[]`) → sub-proyecto #3
- UI scrollytelling → sub-proyecto #4
- Filtros interactivos y drill-down → sub-proyecto #5
- Comparación entre dos versiones del mismo dataset → sub-proyecto #6
- Cacheado de reports en Supabase → optimización posterior
- Tests automatizados → fase de QA o cleanup final

---

## 2. API pública del módulo

Punto de entrada único desde el resto de la app:

```typescript
// src/lib/insights/index.ts

export async function analyzeDataset(
  dataset: Dataset,
  options?: AnalyzeOptions,
): Promise<InsightReport>

export interface AnalyzeOptions {
  /** Tope de findings en el report final. Default 25, hard cap interno 100. */
  maxFindings?: number
  /** Findings con score < minScore se descartan. Default 0.15. */
  minScore?: number
  /** Cancelación si el usuario navega fuera mientras se procesa. */
  signal?: AbortSignal
  /** Locale para plantillas de title/body. Default 'es'. */
  locale?: 'es' | 'en'
}

export interface InsightReport {
  summary: DatasetSummary
  findings: Finding[]                        // ya ordenados por score desc
  byColumn: Record<string, Finding[]>        // findings agrupados por column.key
  byType: Record<FindingType, Finding[]>     // findings agrupados por tipo
  runtimeMs: number                          // telemetría
  degraded?: boolean                         // true si se aplicó sampling o se saltaron heurísticas
}
```

**Implementación interna:** la función delega a un Web Worker (`insights.worker.ts`) siguiendo el mismo patrón que `parser.worker.ts`. La firma async es solo el wrapper del handshake del worker.

**Por qué entry point único:** todos los consumidores futuros (sub-proyectos 2-7) reciben el mismo `InsightReport`. Cambios internos del motor no afectan al resto del sistema.

**Por qué Web Worker:** 50K filas × 12 columnas = ~50 análisis estadísticos. Bloquear el hilo principal congelaría la UI durante segundos. El worker corre en paralelo, la UI sigue fluida.

---

## 3. Tipos públicos

```typescript
// src/lib/insights/types.ts

export type FindingType =
  // single-column
  | 'numeric_outlier'
  | 'category_concentration'
  | 'cardinality_anomaly'
  | 'missing_data'
  | 'distribution_shape'
  | 'time_density_gap'
  | 'duplicate_lookalike'
  | 'text_outlier'
  // multi-column
  | 'numeric_correlation'
  | 'group_disparity'
  | 'time_by_group'
  | 'conditional_outlier'
  // dataset-level
  | 'quality_score'
  | 'schema_summary'
  | 'temporal_coverage'
  | 'volume_context'

export type Severity = 'critical' | 'important' | 'note' | 'info'

export interface Finding {
  /** Hash estable: type + columns + key data. Permite dedup y bookmarking futuro. */
  id: string
  type: FindingType
  severity: Severity
  /** 0..1, interestingness compuesto. Ver §4. */
  score: number
  /** Titular periodístico ya formateado en es-ES. */
  title: string
  /** 1-2 frases de explicación. */
  body: string
  /** column.key afectadas. */
  columns: string[]
  /** Payload tipado por discriminated union — el renderer construye su chart desde aquí. */
  data: FindingData
  /** CTA opcional (ej. "ver solo outliers", "agrupar por turno"). */
  suggestion?: string
  /** Índices de filas implicadas en el hallazgo. Habilita drill-down (#5). */
  recordRefs?: number[]
}

/** Discriminated union: el renderer hace switch(data.kind) y TS garantiza shape. */
export type FindingData =
  | { kind: 'numeric_outlier'; column: string; value: number; record: number; zScore: number; mean: number; stdDev: number }
  | { kind: 'category_concentration'; column: string; top: { value: string; count: number; pct: number }[]; coveragePct: number }
  | { kind: 'cardinality_anomaly'; column: string; distinct: number; total: number; reason: 'all_same' | 'all_unique' }
  | { kind: 'missing_data'; column: string; nullCount: number; nullPct: number }
  | { kind: 'distribution_shape'; column: string; shape: 'normal' | 'bimodal' | 'right_skewed' | 'left_skewed' | 'uniform' | 'sparse'; histogram: number[] }
  | { kind: 'time_density_gap'; column: string; gapStart: string; gapEnd: string; gapDays: number; expectedDensity: number }
  | { kind: 'duplicate_lookalike'; column: string; groups: { canonical: string; variants: string[]; totalCount: number }[] }
  | { kind: 'text_outlier'; column: string; value: string; record: number; reason: 'too_long' | 'too_short' | 'special_chars' }
  | { kind: 'numeric_correlation'; columnA: string; columnB: string; r: number; n: number; sample: { a: number; b: number }[] }
  | { kind: 'group_disparity'; groupColumn: string; metricColumn: string; aggregation: 'mean' | 'sum'; topGroup: string; topValue: number; bottomGroup: string; bottomValue: number; ratio: number }
  | { kind: 'time_by_group'; timeColumn: string; groupColumn: string; metricColumn: string; series: { group: string; trend: 'rising' | 'falling' | 'flat'; deltaPct: number }[] }
  | { kind: 'conditional_outlier'; column: string; groupColumn: string; group: string; value: number; record: number; localMean: number; globalMean: number }
  | { kind: 'quality_score'; score: number; cellsTotal: number; cellsValid: number; duplicateRows: number; issues: { type: string; count: number }[] }
  | { kind: 'schema_summary'; total: number; byType: Record<string, number> }
  | { kind: 'temporal_coverage'; column: string; from: string; to: string; days: number; densityPerDay: number }
  | { kind: 'volume_context'; rows: number; columns: number; cells: number }

export interface DatasetSummary {
  rowCount: number
  columnCount: number
  byType: Record<ColumnType, number>
  nullPct: number
  duplicateRowCount: number
  temporalRange?: { from: string; to: string; days: number }
  /** 0..1, calidad global ponderada. */
  qualityScore: number
}
```

**Notas de diseño:**

- **`id` estable**: hash determinista de `type + columns + payload key`. Llamadas repetidas con mismo input producen mismo `id`. Habilita comparar reports y, en el futuro, "marcar como leído".
- **`recordRefs[]`**: la bisagra con sub-proyecto #5. Cualquier finding que afecta filas concretas las referencia por índice, permitiendo "filtrar dashboard por estos registros" en un solo click.
- **`title` y `body` en español**: hardcoded como plantillas en `i18n/es.ts` con slots. Cambiar a `en` futura = nuevo fichero locale.
- **`score` separado de `severity`**: severity es categórico (para decoración/filtros), score es continuo (para ordenar).

---

## 4. Algoritmo de ranking

El `score` (0..1) combina 4 factores ponderados:

```typescript
const RAW = w_significance      * significance
          + w_coverage          * coverage
          + w_actionability     * actionability

const score = clamp(0, 1, (RAW * (1 - w_diversity_penalty * diversityPenalty)) / MAX_RAW)
//                                                                              ^^^^^^^
// Normaliza a 0..1 dividiendo por el máximo teórico de RAW (= sum de weights = 0.85).

const WEIGHTS = {
  significance:        0.40,
  coverage:            0.25,
  actionability:       0.20,
  diversity_penalty:   0.15,    // multiplicador, NO sumando
}
const MAX_RAW = 0.40 + 0.25 + 0.20  // = 0.85
```

La penalización por diversidad es **multiplicativa** sobre el score base, no restada. Esto garantiza:
- Sin penalización (primer finding del tipo): `score = RAW / MAX_RAW`, rango limpio 0..1.
- Con penalización máxima (`diversityPenalty = 1`): el score se reduce un 15% del valor base.
- Nunca produce scores negativos ni > 1.

### 4.1 Significance (0..1)

Fuerza estadística normalizada por tipo:

| Tipo | Fórmula |
|---|---|
| `numeric_outlier` | `min(1, |zScore| / 6)` — z=3 vale 0.5, z=6+ satura |
| `numeric_correlation` | `|r|` directo (Pearson) |
| `category_concentration` | `coveragePct` del top-N |
| `group_disparity` | `min(1, log(ratio) / log(20))` |
| `missing_data` | `nullPct` |
| `duplicate_lookalike` | confidence promedio del fuzzy match |
| `distribution_shape` | 0.6 fijo si bimodal/sesgada (es informativo), 0.2 si normal/uniforme |
| `time_density_gap` | `min(1, gapDays / expectedDensity)` |
| `conditional_outlier` | `min(1, |localZScore| / 6)` |
| `text_outlier` | 0.5 si reason="special_chars", 0.4 si "too_long"/"too_short" |
| `cardinality_anomaly` | 0.7 fijo (señal fuerte de problema en el dataset) |
| `time_by_group` | media de `|deltaPct|` de las series, normalizada a 0..1 con cap 100% |
| `quality_score` | `1 - qualityScore` (peor calidad = más significativo de reportar) |
| `schema_summary` | 0.3 fijo (descriptivo, no estadísticamente fuerte) |
| `temporal_coverage` | 0.3 fijo |
| `volume_context` | 0.2 fijo |

### 4.2 Coverage (0..1)

Proporción del dataset afectada. `recordRefs.length / rowCount`, con suelo de `0.1` (un outlier individual no se desploma a 0).

### 4.3 Actionability (0..1)

Fijo por tipo, refleja "¿el usuario puede hacer algo con esto?":

```typescript
const ACTIONABILITY: Record<FindingType, number> = {
  numeric_outlier:        0.9,
  group_disparity:        0.9,
  numeric_correlation:    0.8,
  conditional_outlier:    0.9,
  duplicate_lookalike:    0.9,
  category_concentration: 0.7,
  missing_data:           0.7,
  time_density_gap:       0.6,
  time_by_group:          0.7,
  distribution_shape:     0.5,
  text_outlier:           0.4,
  cardinality_anomaly:    0.5,
  quality_score:          0.3,
  schema_summary:         0.2,
  temporal_coverage:      0.2,
  volume_context:         0.1,
}
```

### 4.4 Diversity penalty

Aplicada después de calcular el score base. Para evitar que el top esté saturado por findings del mismo tipo:

- Los primeros 3 findings de cada tipo pasan sin penalización (`penalty = 0`).
- A partir del 4º del mismo tipo: `penalty = 1 - 0.85^(n - 3)`, donde `n` es el conteo de findings ya rankeados de ese tipo.
- Garantiza variedad: el ranking final mezcla tipos, no es una pila de outliers.

### 4.5 Derivación de severity

```typescript
function deriveSeverity(score: number): Severity {
  if (score > 0.75) return 'critical'
  if (score > 0.50) return 'important'
  if (score > 0.25) return 'note'
  return 'info'
}
```

### 4.6 Determinismo

- `sort` con tiebreak por `id` (no por `Math.random`).
- Hash de `id` usa función pura sobre payload (FNV-1a o similar).
- Mismo dataset → mismo orden de findings, garantizado.

---

## 5. Estructura de ficheros

```
src/lib/insights/
├── index.ts                 # API pública: analyzeDataset(), tipos exportados
├── types.ts                 # Finding, FindingData, DatasetSummary, opciones
├── worker.ts                # Web Worker entry
├── runner.ts                # Orquesta heurísticas → rankea → aplica diversity → corta
├── scoring.ts               # Función score() + diversity penalty
├── summary.ts               # Calcula DatasetSummary
├── context.ts               # AnalysisContext: caché compartido entre heurísticas
├── hash.ts                  # FNV-1a u otro hash determinista para ids
├── heuristics/
│   ├── index.ts             # Exporta el array [Heuristic, ...] que runner consume
│   ├── _base.ts             # Interfaz Heuristic + helpers comunes
│   ├── numericOutlier.ts
│   ├── categoryConcentration.ts
│   ├── cardinalityAnomaly.ts
│   ├── missingData.ts
│   ├── distributionShape.ts
│   ├── timeDensityGap.ts
│   ├── duplicateLookalike.ts
│   ├── textOutlier.ts
│   ├── numericCorrelation.ts
│   ├── groupDisparity.ts
│   ├── timeByGroup.ts
│   ├── conditionalOutlier.ts
│   ├── qualityScore.ts
│   ├── schemaSummary.ts
│   ├── temporalCoverage.ts
│   └── volumeContext.ts
└── i18n/
    └── es.ts                # Plantillas (slots) => string en español
```

### 5.1 Interfaz `Heuristic`

```typescript
// _base.ts
export interface Heuristic {
  type: FindingType
  /** Decide O(1) si esta heurística aplica al dataset (ej. needs ≥1 numeric col). */
  applies(dataset: Dataset, summary: DatasetSummary): boolean
  /** Ejecuta el análisis. Devuelve findings (puede ser []) o lanza. Runner captura excepciones. */
  detect(dataset: Dataset, summary: DatasetSummary, ctx: AnalysisContext): Finding[]
}
```

Cada fichero en `heuristics/` exporta un objeto que cumple esta interfaz. Añadir un nuevo tipo de insight en el futuro = fichero nuevo + entrada en `heuristics/index.ts`. Cero cambios en runner/scoring.

### 5.2 `AnalysisContext` — caché compartido

```typescript
// context.ts
export interface AnalysisContext {
  /** Valores numéricos válidos por columna, ya filtrados (no NaN, no null). */
  numericValues: Map<string, number[]>
  /** Sums, mean, stdDev por columna numérica, calculados una vez. */
  numericStats: Map<string, { mean: number; stdDev: number; sum: number; sorted: number[] }>
  /** Value counts por columna categórica. */
  valueCounts: Map<string, Map<string, number>>
  /** Timestamps parseados por columna de fecha. */
  dateValues: Map<string, number[]>
  /** Hashes de filas para detección de duplicados a nivel dataset. */
  rowHashes: string[]
}
```

Una heurística pre-calcula una sola vez; las demás reutilizan. Sin este caché se haría 50 veces el mismo `reduce`.

### 5.3 Worker boilerplate

```typescript
// worker.ts
import { run } from './runner'

self.addEventListener('message', (e) => {
  const { dataset, options } = e.data
  try {
    const report = run(dataset, options)
    self.postMessage({ ok: true, report })
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})
```

Wrapper en `index.ts` crea el worker, envía dataset, escucha respuesta, terminate al recibir.

### 5.4 Tamaño esperado

~1.500–2.000 líneas total. 16 heurísticas × ~80 líneas + infra (~400). Código matemático denso pero aislado por archivo.

---

## 6. Performance, errores, criterios de aceptación

### 6.1 Performance budget

| Tamaño dataset | Tiempo objetivo | Estrategia |
|---|---|---|
| ≤ 1.000 filas × 20 cols | < 100 ms | naïve, sin optimizar |
| ≤ 10.000 filas × 20 cols | < 500 ms | `AnalysisContext` cachea sums/sorts/value-counts |
| ≤ 50.000 filas × 20 cols | < 2.000 ms | sampling para heurísticas O(n²) (correlaciones sobre muestra de 5k filas) |
| > 50.000 filas | < 4.000 ms (degradado) | banner "análisis incompleto"; algunas heurísticas se saltan; `degraded: true` |

Si el worker excede 5s, abort + report con `findings: []` + summary + `degraded: true`. UI muestra "Análisis incompleto, intenta con menos filas".

### 6.2 Manejo de errores

- Dataset inválido (0 filas o 0 columnas válidas): devuelve `InsightReport` con `summary` mínimo + `findings: []`. No lanza.
- Heurística individual lanza: capturada en `runner`, registrada en console + telemetría futura, no rompe el resto. Política "fallar abierto".
- `AbortSignal` activado: worker.terminate(), promise rechaza con `AbortError`. UI lo trata como cancelación silenciosa.
- Web Workers no disponibles (navegadores muy antiguos): fallback síncrono en main thread con `console.warn`. App sigue funcionando, solo bloquea UI un instante.

### 6.3 Criterios de aceptación

Verificables manualmente (sin tests automatizados en esta fase):

1. `analyzeDataset(SAMPLE_DATASETS.ventas)` devuelve ≥ 8 findings en < 200 ms.
2. `analyzeDataset(SAMPLE_DATASETS.personas)` devuelve findings que incluyen al menos: 1 outlier numérico, 1 concentración categórica, 1 schema summary.
3. Llamar dos veces seguidas con el mismo dataset devuelve `findings` con los mismos `id` en el mismo orden.
4. El report incluye al menos 5 tipos diferentes de `FindingType` en el top 10 (verifica diversity penalty).
5. Cancelar via `AbortSignal` antes de 50 ms efectivamente aborta (worker.terminate()).
6. Dataset vacío no lanza, devuelve report con `findings: []` y `summary.rowCount: 0`.
7. Dataset con columna 100% nula no rompe ninguna heurística.
8. `npm run build` pasa, `npx tsc --noEmit` pasa, tamaño del chunk del worker < 30 KB minificado.
9. Carga el Excel real de turnos del usuario y produce findings reconocibles ("ALBA SUSANA acumula 32h, 7σ por encima"; "Los lunes concentran 42% de los retrasos").
10. El report cumple su contrato TypeScript sin `as any` ni `@ts-ignore` en el código consumidor.

### 6.4 Riesgos

1. **Heurísticas mal calibradas** — pueden saturar el top con findings triviales. Mitigación: validar con los 3 sample datasets + el Excel real de turnos antes de cerrar el sub-proyecto.
2. **Diversity penalty muy agresivo** — puede esconder findings importantes solo porque son del mismo tipo. Mitigación: penalización exponencial pero no anula (`0.85^n`, suelo en `0.1 × score_base`), y siempre dejamos top-3 de cada tipo pasar sin tocar.
3. **Detección de duplicados difusos costosa** — Levenshtein O(n²) por columna. Mitigación: solo se ejecuta en columnas con cardinalidad < 200; arriba se omite y se reporta como `degraded`.
4. **NaN/null mezclados rompen heurísticas numéricas** — Mitigación: `AnalysisContext.numericValues` pre-filtra valores válidos por columna una sola vez; heurísticas trabajan sobre arrays ya limpios.
5. **Correlaciones espurias en datasets pequeños** — con n < 20, un r alto puede ser ruido. Mitigación: la heurística `numeric_correlation` requiere n ≥ 20 para emitir finding y aplica corrección Bonferroni si se evalúan muchas combinaciones de pares.

---

## 7. Decisiones cerradas (resumen)

| Tema | Decisión |
|---|---|
| Runtime | Web Worker (mismo patrón que `parser.worker.ts`) |
| Privacidad | 100% local, cero datos enviados a internet |
| LLM | No usado en ninguna fase |
| API | Entry point único `analyzeDataset()` |
| Output | `InsightReport { summary, findings, byColumn, byType, runtimeMs, degraded }` |
| Catálogo v1 | 16 heurísticas A+B+C aprobadas |
| Tipos | `FindingData` como discriminated union por `kind` |
| Determinismo | Hash estable para `id`, sort con tiebreak, sin Math.random |
| Ranking | Score compuesto (significance + coverage + actionability − diversity penalty) |
| Severity | Derivada de score (>0.75 critical, >0.50 important, >0.25 note, resto info) |
| Drill-down | `recordRefs[]` en cada finding habilita filtros futuros (#5) |
| i18n | Solo español v1, plantillas en `i18n/es.ts` listas para multi-locale |
| Caché | `AnalysisContext` compartido entre heurísticas evita recomputación |
| Performance | Budget escalonado por tamaño, degradado controlado >50k filas |
| Errores | Fallar abierto: una heurística rota no rompe el resto |
| Tests | Diferidos (criterios manuales en §6.3); spec de QA vendrá después |

---

## 8. Siguiente paso

Sub-proyecto #2: **Detección de dominio + plug-ins verticales**. Aprovecha la infra de `Heuristic` para añadir heurísticas vertical-específicas (turnos, ventas, HR) que producen `Finding`s adicionales con `type` extendido. Cierra el ciclo "Excel→insights" antes de pasar al story composer (#3).
