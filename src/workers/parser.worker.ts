import * as XLSX from 'xlsx'
import { inferColumnType } from '../lib/typeDetection'
import type { Dataset, Column, CellValue } from '../types/dataset'

export interface ParseRequest {
  fileBuffer: ArrayBuffer
  fileName: string
}
export interface ParseSuccess {
  ok: true
  dataset: Dataset
}
export type ParsePhase = 'read' | 'sheet' | 'header' | 'row' | 'type-detect'
export interface ParseError {
  ok: false
  error: string
  /** 1-indexed row number matching Excel's row counter (header is row 1). */
  row?: number
  /** Header label or fallback "Col A/B/C…" identifier. */
  column?: string
  /** Pipeline stage that failed. */
  phase?: ParsePhase
}
export type ParseResponse = ParseSuccess | ParseError

// Detect strings whose bytes look like UTF-8 misinterpreted as Latin-1
// (e.g. "DuraciÃ³n" should be "Duración"). Re-decode when matched.
const MOJIBAKE_RE = /[\u00C2\u00C3][\u0080-\u00BF]/
function fixMojibake(s: string): string {
  if (!MOJIBAKE_RE.test(s)) return s
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s
  }
}

function colName(i: number): string {
  // Excel column letters: 0 -> A, 25 -> Z, 26 -> AA, ...
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

function post(response: ParseResponse): void {
  ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
}

self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  const { fileBuffer, fileName } = event.data

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true, codepage: 65001 })
  } catch (err) {
    post({
      ok: false,
      phase: 'read',
      error: `No se pudo leer ${fileName}: ${err instanceof Error ? err.message : 'archivo dañado o formato no soportado'}.`,
    })
    return
  }

  // Strip workbook metadata (#196). XLSX/ODS files embed properties like
  // Author, LastAuthor, Company, ApplicationVersion and any custom-defined
  // props the spreadsheet picked up over its lifetime. Those never reach the
  // user-facing Dataset, but historically lived on the WorkBook for the rest
  // of this function. Discarding them here narrows the risk surface in case
  // any future code path serialises the raw WorkBook.
  if (wb.Props) wb.Props = {}
  if (wb.Custprops) wb.Custprops = {}

  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    post({ ok: false, phase: 'sheet', error: 'El libro no contiene ninguna hoja.' })
    return
  }
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    post({
      ok: false,
      phase: 'sheet',
      error: `La hoja "${sheetName}" está vacía o ilegible.`,
    })
    return
  }

  // Read the sheet as a grid of rows (#18). header:1 returns array-of-arrays
  // where the first sub-array is the header row in physical column order.
  // This makes the column order guarantee structural — we no longer rely on
  // Object.keys() insertion order behaviour of sheet_to_json's object mode.
  let grid: unknown[][]
  try {
    grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: false,
      blankrows: false,
    })
  } catch (err) {
    post({
      ok: false,
      phase: 'sheet',
      error: `No se pudo extraer filas de "${sheetName}": ${err instanceof Error ? err.message : 'estructura inválida'}.`,
    })
    return
  }

  if (grid.length === 0) {
    post({
      ok: false,
      phase: 'row',
      row: 1,
      error: `La hoja "${sheetName}" está vacía.`,
    })
    return
  }

  const headerRow = grid[0]
  const dataRows = grid.slice(1)

  if (dataRows.length === 0) {
    post({
      ok: false,
      phase: 'row',
      row: 2,
      error: `La hoja "${sheetName}" tiene cabecera pero ninguna fila de datos.`,
    })
    return
  }

  // Normalise headers in column order. Mojibake fix + trim are applied here
  // (#16), and we capture the raw form for error messages.
  const rawHeaders: string[] = headerRow.map((h) => (h == null ? '' : String(h)))
  const headers = rawHeaders.map((h) => fixMojibake(h).trim())

  // Header validation: empty or duplicate names are surfaced with the actual Excel column letter.
  const seenHeaders = new Set<string>()
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    if (h === '') {
      post({
        ok: false,
        phase: 'header',
        row: 1,
        column: `Col ${colName(i)}`,
        error: `La cabecera de la columna ${colName(i)} está vacía. Asigna un nombre y vuelve a subir.`,
      })
      return
    }
    if (seenHeaders.has(h)) {
      post({
        ok: false,
        phase: 'header',
        row: 1,
        column: h,
        error: `La cabecera "${h}" aparece dos veces (columna ${colName(i)}). Renombra una de las dos.`,
      })
      return
    }
    seenHeaders.add(h)
  }

  // Type-detect: read each column by index out of the row grid.
  let columns: Column[]
  try {
    columns = headers.map((h, i) => {
      const values = dataRows.map((row) => {
        const v = row[i]
        if (v == null) return null
        return typeof v === 'string' ? fixMojibake(v).trim() : fixMojibake(String(v)).trim()
      })
      return {
        key: `col_${i}`,
        label: h,
        originalLabel: h,
        type: inferColumnType(values),
      }
    })
  } catch (err) {
    post({
      ok: false,
      phase: 'type-detect',
      error: `Fallo detectando tipos de columna: ${err instanceof Error ? err.message : 'desconocido'}.`,
    })
    return
  }

  const rows: Record<string, CellValue>[] = []
  for (let r = 0; r < dataRows.length; r++) {
    try {
      const raw = dataRows[r]
      const obj: Record<string, CellValue> = {}
      for (let i = 0; i < headers.length; i++) {
        const v = raw[i]
        if (v == null) {
          obj[`col_${i}`] = null
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          obj[`col_${i}`] = v
        } else {
          obj[`col_${i}`] = fixMojibake(String(v)).trim()
        }
      }
      rows.push(obj)
    } catch (err) {
      post({
        ok: false,
        phase: 'row',
        row: r + 2, // header is Excel row 1, dataRows[0] is Excel row 2
        error: `Error procesando la fila ${r + 2}: ${err instanceof Error ? err.message : 'desconocido'}.`,
      })
      return
    }
  }

  const dataset: Dataset = {
    id: 'uploaded',
    label: fileName.replace(/\.[^.]+$/, ''),
    columns,
    rows,
    createdAt: new Date().toISOString(),
  }
  post({ ok: true, dataset })
})
