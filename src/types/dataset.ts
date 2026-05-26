export type ColumnType =
  | 'boolean'
  | 'date'
  | 'number'
  | 'currency'
  | 'geo'
  | 'category'
  | 'text'

export type Accent = 'sky' | 'mint' | 'coral' | 'plum' | 'amber' | 'rose' | 'lime'

export interface Column {
  key: string
  label: string
  type: ColumnType
  /** Original sheet header before normalization */
  originalLabel?: string
  /** Accent palette name. Defaults to 'sky' in chart components. */
  color?: Accent
  /** Display unit (e.g., "€", "kg", "%"). */
  unit?: string
}

export type CellValue = string | number | boolean | null

export interface Dataset {
  id: string
  label: string
  columns: Column[]
  /** Each row is keyed by Column.key */
  rows: Record<string, CellValue>[]
  createdAt: string
}
