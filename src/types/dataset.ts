export type ColumnType =
  | 'boolean'
  | 'date'
  | 'number'
  | 'currency'
  | 'geo'
  | 'category'
  | 'text'

export interface Column {
  key: string
  label: string
  type: ColumnType
  /** Original sheet header before normalization */
  originalLabel?: string
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
