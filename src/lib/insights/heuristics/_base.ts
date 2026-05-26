// src/lib/insights/heuristics/_base.ts
import type { Dataset } from '../../../types/dataset'
import type { Finding, FindingData, FindingType } from '../types'
import type { AnalysisContext } from '../context'
import type { DatasetSummary } from '../types'
import { hashPayload } from '../hash'
import { render } from '../i18n/es'

export interface Heuristic {
  type: FindingType
  applies(dataset: Dataset, summary: DatasetSummary): boolean
  detect(dataset: Dataset, summary: DatasetSummary, ctx: AnalysisContext): Finding[]
}

/** Build a Finding from its FindingData; fills id/title/body/severity via i18n. */
export function makeFinding(args: {
  type: FindingType
  data: FindingData
  columns: string[]
  columnLabels: Record<string, string>
  recordRefs?: number[]
}): Finding {
  const id = `${args.type}:${hashPayload([args.columns, args.data])}`
  const text = render(args.data, args.columnLabels)
  return {
    id,
    type: args.type,
    severity: 'info', // overridden by scoring stage
    score: 0,         // filled by scoring stage
    title: text.title,
    body: text.body,
    columns: args.columns,
    data: args.data,
    suggestion: text.suggestion,
    recordRefs: args.recordRefs,
  }
}

/** Build a label lookup map for a dataset. */
export function columnLabels(dataset: Dataset): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of dataset.columns) out[c.key] = c.label
  return out
}
