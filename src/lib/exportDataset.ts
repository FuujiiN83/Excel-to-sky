import type { Dataset, CellValue } from '../types/dataset'

export type ExportFormat = 'csv' | 'json' | 'xlsx'

/**
 * Download the current dataset as a CSV / JSON / XLSX file. Filename is the
 * dataset label, sanitised, with the appropriate extension.
 *
 * CSV escaping: quote any value that contains a comma, quote, or line break.
 * Embedded quotes are doubled per RFC 4180.
 *
 * XLSX uses a dynamic import so SheetJS (~300 kB) only ships if the user
 * actually picks the XLSX option.
 */
export async function exportDataset(dataset: Dataset, format: ExportFormat): Promise<void> {
  const filename = `${sanitiseFilename(dataset.label || 'excel-to-sky')}.${format}`
  switch (format) {
    case 'csv':
      downloadBlob(toCsv(dataset), 'text/csv;charset=utf-8', filename)
      return
    case 'json':
      downloadBlob(toJson(dataset), 'application/json', filename)
      return
    case 'xlsx': {
      const XLSX = await import('xlsx')
      const wb = toWorkbook(XLSX, dataset)
      XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
      return
    }
  }
}

type XLSXModule = typeof import('xlsx')

function sanitiseFilename(s: string): string {
  return s.replace(/[/\\?%*:|"<>]+/g, '_').slice(0, 80) || 'dataset'
}

function downloadBlob(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a short delay so the click handler can resolve.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toCsv(dataset: Dataset): string {
  const headers = dataset.columns.map((c) => c.label)
  const lines: string[] = [headers.map(csvCell).join(',')]
  for (const row of dataset.rows) {
    const cells = dataset.columns.map((c) => csvCell(formatCell(row[c.key])))
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

function toJson(dataset: Dataset): string {
  const rows = dataset.rows.map((row) => {
    const obj: Record<string, CellValue> = {}
    for (const col of dataset.columns) {
      obj[col.label] = row[col.key]
    }
    return obj
  })
  return JSON.stringify(
    {
      label: dataset.label,
      createdAt: dataset.createdAt,
      columns: dataset.columns.map((c) => ({ label: c.label, type: c.type })),
      rows,
    },
    null,
    2,
  )
}

function toWorkbook(
  XLSX: XLSXModule,
  dataset: Dataset,
): ReturnType<XLSXModule['utils']['book_new']> {
  const aoa: unknown[][] = []
  aoa.push(dataset.columns.map((c) => c.label))
  for (const row of dataset.rows) {
    aoa.push(dataset.columns.map((c) => row[c.key]))
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  return wb
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCell(v: CellValue): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
