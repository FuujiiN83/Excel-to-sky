import type { DomainPack } from './types'

/**
 * Static registry of domain packs. Each pack lists the header keywords we
 * look for plus a list of human-readable hints surfaced when it wins. The
 * keyword list mixes Spanish + English variants since the parser keeps
 * original labels and we want the same pack to match either side.
 */

export const SHIFTS_PACK: DomainPack = {
  id: 'shifts',
  label: 'Turnos / planificación',
  description: 'Datos de turnos, horarios y disponibilidad por empleado.',
  signals: [
    { header: 'turno', weight: 3 },
    { header: 'shift', weight: 3 },
    { header: 'empleado', weight: 2 },
    { header: 'employee', weight: 2 },
    { header: 'hora entrada', weight: 2 },
    { header: 'hora salida', weight: 2 },
    { header: 'descanso', weight: 1 },
    { header: 'break', weight: 1 },
    { header: 'horas', weight: 1 },
    { header: 'hours', weight: 1 },
  ],
  requires: ['date'],
  hints: [
    'Compara cobertura por día de la semana y por turno.',
    'Detecta huecos de cobertura cruzando turno × fecha.',
    'Considera la antigüedad para entender rotación.',
  ],
}

export const SALES_PACK: DomainPack = {
  id: 'sales',
  label: 'Ventas',
  description: 'Pedidos, importes y clientes — datos transaccionales.',
  signals: [
    { header: 'venta', weight: 3 },
    { header: 'sale', weight: 3 },
    { header: 'pedido', weight: 2 },
    { header: 'order', weight: 2 },
    { header: 'importe', weight: 2 },
    { header: 'amount', weight: 2 },
    { header: 'cliente', weight: 2 },
    { header: 'customer', weight: 2 },
    { header: 'producto', weight: 2 },
    { header: 'product', weight: 2 },
    { header: 'descuento', weight: 1 },
    { header: 'discount', weight: 1 },
    { header: 'comision', weight: 1 },
    { header: 'commission', weight: 1 },
  ],
  requires: ['currency'],
  hints: [
    'Mide la concentración de ventas en el top de clientes (Pareto).',
    'Cruza producto × cliente para detectar oportunidades de upsell.',
    'Si hay fecha, evalúa estacionalidad semanal/mensual.',
  ],
}

export const HR_PACK: DomainPack = {
  id: 'hr',
  label: 'Recursos humanos',
  description: 'Plantilla, salarios, antigüedad y departamentos.',
  signals: [
    { header: 'empleado', weight: 2 },
    { header: 'employee', weight: 2 },
    { header: 'salario', weight: 3 },
    { header: 'salary', weight: 3 },
    { header: 'sueldo', weight: 3 },
    { header: 'departamento', weight: 2 },
    { header: 'department', weight: 2 },
    { header: 'cargo', weight: 1 },
    { header: 'role', weight: 1 },
    { header: 'antiguedad', weight: 2 },
    { header: 'tenure', weight: 2 },
    { header: 'genero', weight: 1 },
    { header: 'gender', weight: 1 },
    { header: 'nombre', weight: 1 },
    { header: 'name', weight: 1 },
  ],
  hints: [
    'Comprueba brechas salariales por departamento y por género.',
    'Detecta outliers salariales con MAD (robustos al sesgo).',
    'Si hay antigüedad, mira correlación con salario.',
  ],
}

export const FINANCE_PACK: DomainPack = {
  id: 'finance',
  label: 'Finanzas',
  description: 'Transacciones contables, cuentas y balances.',
  signals: [
    { header: 'cuenta', weight: 2 },
    { header: 'account', weight: 2 },
    { header: 'debe', weight: 2 },
    { header: 'haber', weight: 2 },
    { header: 'debit', weight: 2 },
    { header: 'credit', weight: 2 },
    { header: 'saldo', weight: 2 },
    { header: 'balance', weight: 2 },
    { header: 'iban', weight: 2 },
    { header: 'transaccion', weight: 2 },
    { header: 'transaction', weight: 2 },
    { header: 'concepto', weight: 1 },
    { header: 'memo', weight: 1 },
  ],
  requires: ['currency'],
  hints: [
    'Aplica el test de Benford a las cantidades — señal débil de fraude.',
    'Cruza cuenta × concepto para detectar duplicidades en gastos.',
    'Identifica outliers de saldo o transacciones extremas con IQR.',
  ],
}

export const RETAIL_PACK: DomainPack = {
  id: 'retail',
  label: 'Retail / catálogo',
  description: 'Productos, stock, precio y categorías.',
  signals: [
    { header: 'sku', weight: 3 },
    { header: 'producto', weight: 2 },
    { header: 'product', weight: 2 },
    { header: 'stock', weight: 2 },
    { header: 'inventario', weight: 2 },
    { header: 'inventory', weight: 2 },
    { header: 'precio', weight: 2 },
    { header: 'price', weight: 2 },
    { header: 'categoria', weight: 2 },
    { header: 'category', weight: 2 },
    { header: 'marca', weight: 1 },
    { header: 'brand', weight: 1 },
    { header: 'proveedor', weight: 1 },
    { header: 'supplier', weight: 1 },
    { header: 'margen', weight: 1 },
    { header: 'margin', weight: 1 },
  ],
  hints: [
    'Ordena la cola de stock por días-en-almacén; descubre obsolescencia.',
    'Pareto sobre margen — qué pocos SKUs sostienen el negocio.',
    'Heatmap de correlación entre precio, coste y rotación.',
  ],
}

export const LOGISTICS_PACK: DomainPack = {
  id: 'logistics',
  label: 'Logística',
  description: 'Envíos, rutas, tiempos de entrega.',
  signals: [
    { header: 'envio', weight: 3 },
    { header: 'shipment', weight: 3 },
    { header: 'origen', weight: 2 },
    { header: 'origin', weight: 2 },
    { header: 'destino', weight: 2 },
    { header: 'destination', weight: 2 },
    { header: 'transportista', weight: 2 },
    { header: 'carrier', weight: 2 },
    { header: 'tracking', weight: 2 },
    { header: 'peso', weight: 1 },
    { header: 'weight', weight: 1 },
    { header: 'km', weight: 1 },
    { header: 'dias envio', weight: 1 },
    { header: 'delivery', weight: 1 },
  ],
  hints: [
    'Mide la mediana de días-de-entrega por transportista.',
    'Detecta rutas con sobrecoste por kg y distancia.',
    'Cruza estado × destino para hot-spots de retrasos.',
  ],
}

export const MARKETING_PACK: DomainPack = {
  id: 'marketing',
  label: 'Marketing',
  description: 'Campañas, canales, métricas de conversión.',
  signals: [
    { header: 'campana', weight: 3 },
    { header: 'campaign', weight: 3 },
    { header: 'canal', weight: 2 },
    { header: 'channel', weight: 2 },
    { header: 'impresiones', weight: 2 },
    { header: 'impressions', weight: 2 },
    { header: 'clicks', weight: 2 },
    { header: 'cpc', weight: 2 },
    { header: 'ctr', weight: 2 },
    { header: 'cpm', weight: 1 },
    { header: 'conversion', weight: 2 },
    { header: 'conversiones', weight: 2 },
    { header: 'cac', weight: 1 },
    { header: 'roas', weight: 1 },
  ],
  hints: [
    'Calcula CTR (clicks / impresiones) y ROAS (ingresos / coste) por canal.',
    'Detecta canales con coste creciente y CTR bajando.',
    'Cruza campaña × canal para encontrar combinaciones rentables.',
  ],
}

export const REAL_ESTATE_PACK: DomainPack = {
  id: 'real_estate',
  label: 'Inmobiliario',
  description: 'Inmuebles, precio por m² y características.',
  signals: [
    { header: 'inmueble', weight: 3 },
    { header: 'property', weight: 3 },
    { header: 'piso', weight: 2 },
    { header: 'flat', weight: 1 },
    { header: 'apartment', weight: 1 },
    { header: 'metros', weight: 2 },
    { header: 'm2', weight: 2 },
    { header: 'habitaciones', weight: 2 },
    { header: 'rooms', weight: 2 },
    { header: 'bedrooms', weight: 2 },
    { header: 'precio', weight: 2 },
    { header: 'price', weight: 2 },
    { header: 'barrio', weight: 1 },
    { header: 'neighbourhood', weight: 1 },
  ],
  requires: ['currency'],
  hints: [
    'Calcula precio/m² y compara percentiles por barrio.',
    'Outliers de precio por m² destacan oportunidades o ruido.',
    'Cruza habitaciones × m² × precio para detectar segmentos.',
  ],
}

export const EDUCATION_PACK: DomainPack = {
  id: 'education',
  label: 'Educación',
  description: 'Estudiantes, calificaciones, asignaturas.',
  signals: [
    { header: 'alumno', weight: 3 },
    { header: 'student', weight: 3 },
    { header: 'nota', weight: 3 },
    { header: 'grade', weight: 3 },
    { header: 'calificacion', weight: 3 },
    { header: 'asignatura', weight: 2 },
    { header: 'subject', weight: 2 },
    { header: 'curso', weight: 2 },
    { header: 'course', weight: 2 },
    { header: 'examen', weight: 1 },
    { header: 'exam', weight: 1 },
    { header: 'asistencia', weight: 1 },
    { header: 'attendance', weight: 1 },
  ],
  hints: [
    'Media y mediana de notas por asignatura — busca asimetría.',
    'ANOVA cuando comparas notas entre grupos / cursos.',
    'Detecta correlación entre asistencia y resultado.',
  ],
}

export const HEALTHCARE_PACK: DomainPack = {
  id: 'healthcare',
  label: 'Salud',
  description: 'Pacientes, métricas clínicas, condiciones.',
  signals: [
    { header: 'paciente', weight: 3 },
    { header: 'patient', weight: 3 },
    { header: 'diagnostico', weight: 2 },
    { header: 'diagnosis', weight: 2 },
    { header: 'condicion', weight: 2 },
    { header: 'condition', weight: 2 },
    { header: 'tas', weight: 2 },
    { header: 'tad', weight: 2 },
    { header: 'colesterol', weight: 2 },
    { header: 'cholesterol', weight: 2 },
    { header: 'glucosa', weight: 2 },
    { header: 'glucose', weight: 2 },
    { header: 'imc', weight: 1 },
    { header: 'bmi', weight: 1 },
  ],
  hints: [
    'Outliers MAD sobre tensión, glucosa y colesterol son robustos.',
    'KS entre grupos para comparar distribuciones clínicas.',
    'Cohort sobre fecha + condición para tiempos hasta evento.',
  ],
}

export const SPORTS_PACK: DomainPack = {
  id: 'sports',
  label: 'Deporte',
  description: 'Atletas, marcas, equipos.',
  signals: [
    { header: 'atleta', weight: 3 },
    { header: 'athlete', weight: 3 },
    { header: 'jugador', weight: 3 },
    { header: 'player', weight: 3 },
    { header: 'equipo', weight: 2 },
    { header: 'team', weight: 2 },
    { header: 'partido', weight: 2 },
    { header: 'match', weight: 2 },
    { header: 'goles', weight: 2 },
    { header: 'goals', weight: 2 },
    { header: 'puntos', weight: 1 },
    { header: 'points', weight: 1 },
    { header: 'tiempo', weight: 1 },
    { header: 'time', weight: 1 },
  ],
  hints: [
    'Compara medias entre temporadas con Cohen\u2019s d.',
    'Pareto sobre minutos / goles destaca top performers.',
    'Cruza equipo × jugador para entender contribución.',
  ],
}

export const SURVEY_PACK: DomainPack = {
  id: 'survey',
  label: 'Encuesta / NPS',
  description: 'Respuestas Likert / NPS / CSAT.',
  signals: [
    { header: 'nps', weight: 3 },
    { header: 'csat', weight: 3 },
    { header: 'likert', weight: 2 },
    { header: 'satisfaccion', weight: 2 },
    { header: 'satisfaction', weight: 2 },
    { header: 'recomienda', weight: 2 },
    { header: 'recommend', weight: 2 },
    { header: 'segmento', weight: 1 },
    { header: 'segment', weight: 1 },
    { header: 'usabilidad', weight: 1 },
    { header: 'usability', weight: 1 },
    { header: 'pregunta', weight: 1 },
    { header: 'question', weight: 1 },
  ],
  hints: [
    'Histograma 0-10 destaca asimetría del NPS.',
    'Chi-cuadrado entre segmento × recomienda revela dependencias.',
    'Distribución bimodal en Likert sugiere dos audiencias distintas.',
  ],
}

export const DOMAIN_PACKS: ReadonlyArray<DomainPack> = [
  SHIFTS_PACK,
  SALES_PACK,
  HR_PACK,
  FINANCE_PACK,
  RETAIL_PACK,
  LOGISTICS_PACK,
  MARKETING_PACK,
  REAL_ESTATE_PACK,
  EDUCATION_PACK,
  HEALTHCARE_PACK,
  SPORTS_PACK,
  SURVEY_PACK,
]
