/**
 * Per-dashboard chart annotation store (#146). The ChartLine and
 * ChartScatter primitives already accept an `annotations` prop (point
 * index + text). This helper persists them in localStorage keyed by
 * dataset id + column key + chart kind so they survive reloads alongside
 * the rest of the dashboard.
 *
 * Annotations live locally — they never travel to a shared link. If we ever
 * want shared annotations they'll need to ride along in the Supabase
 * payload; this module is deliberately the boring local case for now.
 */

export interface ChartAnnotation {
  pointIndex: number
  text: string
  placement?: 'above' | 'below'
}

const STORAGE_PREFIX = 'ets-chart-annotations-v1'

function storageKey(datasetId: string, columnKey: string, chartKind: string): string {
  return `${STORAGE_PREFIX}:${datasetId}:${columnKey}:${chartKind}`
}

export function loadAnnotations(
  datasetId: string,
  columnKey: string,
  chartKind: string,
): ChartAnnotation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(datasetId, columnKey, chartKind))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ChartAnnotation[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const a = item as Partial<ChartAnnotation>
      if (typeof a.pointIndex !== 'number' || typeof a.text !== 'string') continue
      out.push({
        pointIndex: a.pointIndex,
        text: a.text,
        placement: a.placement === 'below' ? 'below' : 'above',
      })
    }
    return out
  } catch {
    return []
  }
}

export function saveAnnotations(
  datasetId: string,
  columnKey: string,
  chartKind: string,
  annotations: ReadonlyArray<ChartAnnotation>,
): void {
  if (typeof window === 'undefined') return
  try {
    if (annotations.length === 0) {
      window.localStorage.removeItem(storageKey(datasetId, columnKey, chartKind))
      return
    }
    window.localStorage.setItem(
      storageKey(datasetId, columnKey, chartKind),
      JSON.stringify(annotations),
    )
  } catch {
    // ignore
  }
}

/** Add an annotation, returning the updated list (does not mutate input). */
export function addAnnotation(
  existing: ReadonlyArray<ChartAnnotation>,
  next: ChartAnnotation,
): ChartAnnotation[] {
  return [...existing.filter((a) => a.pointIndex !== next.pointIndex), next]
}

export function removeAnnotation(
  existing: ReadonlyArray<ChartAnnotation>,
  pointIndex: number,
): ChartAnnotation[] {
  return existing.filter((a) => a.pointIndex !== pointIndex)
}
