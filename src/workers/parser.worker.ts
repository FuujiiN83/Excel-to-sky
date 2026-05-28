import * as XLSX from 'xlsx'
import { inferColumnTypeDetailed, detectSubtype } from '../lib/typeDetection'
import type { Dataset, Column, CellValue, ColumnType } from '../types/dataset'

export interface ParseRequest {
  /** Raw bytes — set for binary formats (xlsx/ods) and small CSVs. */
  fileBuffer?: ArrayBuffer
  /**
   * Already-decoded text — set when the caller streamed a large CSV directly
   * (#10), bypassing the buffer copy. Either fileBuffer or fileText is set.
   */
  fileText?: string
  fileName: string
  /** Zero-based index into workbook.SheetNames. Defaults to 0 if omitted. */
  sheetIndex?: number
}

const CSV_EXTENSIONS = ['.csv', '.tsv', '.txt']

/**
 * Decode an ArrayBuffer to a string, preferring UTF-8 but transparently
 * falling back to Latin-1 when the data isn't valid UTF-8 (#7). Excel
 * still emits Latin-1 CSVs by default on Spanish Windows, so this avoids
 * the "Duración → DuraciÃ³n" garbling chain at the source instead of
 * relying on the post-hoc fixMojibake() heuristic.
 *
 * Strips a leading UTF-8 BOM when present.
 */
function decodeCsvBuffer(buffer: ArrayBuffer): string {
  // UTF-8 BOM: EF BB BF → strip and trust UTF-8.
  const view = new Uint8Array(buffer)
  if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(view.subarray(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(view)
  } catch {
    return new TextDecoder('windows-1252').decode(view)
  }
}

/**
 * Pick the most likely field separator out of comma/semicolon/tab/pipe
 * (#6). Scores each candidate by the number of first-line occurrences that
 * survive when the same count is seen across the next few lines — a
 * consistent column count beats a higher raw frequency, since stray commas
 * inside cells would otherwise win for tab-separated files.
 */
function detectCsvDelimiter(text: string): ',' | ';' | '\t' | '|' {
  const candidates = [',', ';', '\t', '|'] as const
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .slice(0, 5)
  if (lines.length === 0) return ','

  let bestDelim: (typeof candidates)[number] = ','
  let bestScore = -Infinity
  for (const d of candidates) {
    const counts = lines.map((l) => (l.match(new RegExp(`\\${d}`, 'g')) ?? []).length)
    const first = counts[0]
    if (first === 0) continue
    // Reward delimiters whose count is stable across the sample lines.
    const consistent = counts.filter((n) => n === first).length
    const score = first * 10 + consistent
    if (score > bestScore) {
      bestScore = score
      bestDelim = d
    }
  }
  return bestDelim
}

/** Per-column hints surfaced alongside the Dataset (#17). */
export interface ColumnWarning {
  columnKey: string
  columnLabel: string
  /** Detected primary type. */
  type: ColumnType
  /** Other plausible type that also covered >=20% of the sampled values. */
  secondary: ColumnType
}

export interface ParseSuccess {
  ok: true
  dataset: Dataset
  warnings?: ColumnWarning[]
  /** All sheet names in the workbook (in their original order). Only set when the workbook has more than one sheet. */
  sheetNames?: string[]
  /** Zero-based index of the sheet that was actually parsed. */
  sheetIndex: number
  /**
   * Number of cells (header + body) where mojibake recovery actually fired.
   * Surfaced so the UI can warn the user when the source file is heavily
   * mis-encoded — even after recovery, some glyphs may still be wrong (#19).
   */
  mojibakeFixCount?: number
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
/** Incremental progress event (#11). Sent zero or more times before the final ParseSuccess / ParseError. */
export interface ParseProgress {
  kind: 'progress'
  /** Pipeline stage currently in flight. */
  phase: ParsePhase
  /** 0–1 share of the current phase that's done. */
  ratio: number
  /** Human-readable label rendered next to the bar (in Spanish). */
  label: string
}
export type ParseResponse = ParseSuccess | ParseError | ParseProgress

// Detect strings whose bytes look like UTF-8 misinterpreted as Latin-1
// (e.g. "DuraciÃ³n" should be "Duración"). Re-decode when matched. The
// counter is incremented on every successful fix so the worker can surface
// a "your file is mis-encoded" hint to the UI (#19).
const MOJIBAKE_RE = /[\u00C2\u00C3][\u0080-\u00BF]/
let mojibakeFixCount = 0
function fixMojibake(s: string): string {
  if (!MOJIBAKE_RE.test(s)) return s
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff)
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    mojibakeFixCount++
    return fixed
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

function postProgress(phase: ParsePhase, ratio: number, label: string): void {
  post({ kind: 'progress', phase, ratio: Math.max(0, Math.min(1, ratio)), label })
}

/**
 * Pick the most likely header row out of the first N rows (#2). Spreadsheets
 * exported from BI tools or surveys often start with a title row, a few
 * blank rows or a metadata block before the actual header. We score each
 * candidate row on:
 *   - count of non-empty cells (more = better)
 *   - share of cells that look like labels (string, not numeric)
 *   - cell uniqueness (headers are usually distinct)
 * and return the index of the winning row. Rows above it are discarded.
 *
 * Returns 0 when the first row already looks like a header (no penalty for
 * the common, well-formed case).
 */
// Spanish + English keywords that flag a row as a total/subtotal/summary
// row (#4). Matched against the first non-empty cell of the row (lowercased,
// punctuation stripped). A row is dropped before stats run.
const TOTAL_ROW_KEYWORDS = new Set([
  'total',
  'totals',
  'subtotal',
  'subtotals',
  'gran total',
  'grand total',
  'suma',
  'sum',
  'promedio',
  'average',
  'media',
  'mean',
  'count',
  'recuento',
  'conteo',
])
function isTotalRow(row: unknown[]): boolean {
  for (const cell of row) {
    if (cell == null) continue
    const s = String(cell).trim()
    if (s === '') continue
    // Strip a trailing colon and lowercase. Multi-word keys like 'gran total'
    // need the whole label, so we don't split on spaces.
    const key = s
      .toLowerCase()
      .replace(/[:.;,]+$/, '')
      .trim()
    return TOTAL_ROW_KEYWORDS.has(key)
  }
  return false
}

const HEADER_SCAN_DEPTH = 5
function detectHeaderRow(grid: unknown[][]): number {
  if (grid.length === 0) return 0
  const limit = Math.min(HEADER_SCAN_DEPTH, grid.length)

  // Quick-out: the first row is "good enough" — at least 2 non-empty cells
  // and no numeric majority. Skip scanning to keep typical files cheap.
  const first = grid[0] ?? []
  const firstNonEmpty = first.filter((v) => v != null && String(v).trim() !== '').length
  const firstNumeric = first.filter((v) => typeof v === 'number').length
  if (firstNonEmpty >= 2 && firstNumeric < firstNonEmpty / 2) return 0

  let bestRow = 0
  let bestScore = -Infinity
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? []
    const nonEmpty = row.filter((v) => v != null && String(v).trim() !== '')
    if (nonEmpty.length === 0) continue
    const stringCells = nonEmpty.filter((v) => typeof v !== 'number').length
    const unique = new Set(nonEmpty.map((v) => String(v).trim().toLowerCase())).size
    // Weights chosen so that string-cell share dominates, with breadth +
    // uniqueness as tiebreakers. Numeric-heavy rows score low because they
    // probably hold data, not labels.
    const score = stringCells * 3 + nonEmpty.length + unique
    if (score > bestScore) {
      bestScore = score
      bestRow = r
    }
  }
  return bestRow
}

/**
 * Copy the top-left value of every merge range into the other cells of the
 * range (#3). XLSX/ODS sheets store merges in `sheet['!merges']` and leave
 * the non-anchor cells empty, which would otherwise produce blank columns or
 * misaligned rows after `sheet_to_json`.
 */
function expandMergedCells(sheet: XLSX.WorkSheet): void {
  const merges = sheet['!merges']
  if (!merges || merges.length === 0) return
  for (const range of merges) {
    const anchorAddr = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c })
    const anchor = sheet[anchorAddr]
    if (!anchor) continue
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (r === range.s.r && c === range.s.c) continue
        const addr = XLSX.utils.encode_cell({ r, c })
        if (sheet[addr]) continue
        sheet[addr] = { ...anchor }
      }
    }
  }
}

self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  // Reset the per-parse counter so a previous job's fixes don't leak into
  // the next one when the worker is re-used.
  mojibakeFixCount = 0
  const { fileBuffer, fileText, fileName, sheetIndex: requestedIndex = 0 } = event.data
  postProgress('read', 0, 'Leyendo archivo…')

  // CSV / TSV / TXT files get a pre-decode pass so we can recover from
  // Latin-1 source files (#7) and pick the right field separator (#6)
  // before handing the data to the XLSX library.
  const lowerName = fileName.toLowerCase()
  const isCsvLike = CSV_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

  let wb: XLSX.WorkBook
  try {
    if (fileText !== undefined) {
      // Streamed CSV path (#10): the main thread already decoded the file via
      // a ReadableStream so the worker never holds both raw bytes and string.
      const delim = detectCsvDelimiter(fileText)
      wb = XLSX.read(fileText, { type: 'string', cellDates: true, FS: delim })
    } else if (isCsvLike && fileBuffer) {
      const text = decodeCsvBuffer(fileBuffer)
      const delim = detectCsvDelimiter(text)
      wb = XLSX.read(text, { type: 'string', cellDates: true, FS: delim })
    } else if (fileBuffer) {
      wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true, codepage: 65001 })
    } else {
      post({ ok: false, phase: 'read', error: 'El parser no recibió ni bytes ni texto.' })
      return
    }
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

  const sheetNames = wb.SheetNames
  if (sheetNames.length === 0) {
    post({ ok: false, phase: 'sheet', error: 'El libro no contiene ninguna hoja.' })
    return
  }
  // Multi-sheet (#1): caller can request any sheet by index; defaults to 0.
  // Out-of-range requests are clamped rather than rejected so a stale picker
  // value can't crash the worker.
  const sheetIndex = Math.min(Math.max(0, requestedIndex), sheetNames.length - 1)
  const sheetName = sheetNames[sheetIndex]
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    post({
      ok: false,
      phase: 'sheet',
      error: `La hoja "${sheetName}" está vacía o ilegible.`,
    })
    return
  }

  postProgress('sheet', 0.4, `Hoja "${sheetName}" cargada`)

  // Expand merged cells (#3). Excel/ODS files store merges as ranges in the
  // sheet's `!merges` array; the top-left cell holds the value and every other
  // cell in the range is empty. We copy the top-left value into every cell of
  // the range so downstream sheet_to_json() sees a normal rectangular grid.
  expandMergedCells(sheet)

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

  // Find the header row (#2). When the spreadsheet starts with a title or
  // metadata block, the first non-decorative row is detected and used; any
  // rows above it are discarded.
  const headerRowIndex = detectHeaderRow(grid)
  const headerRow = grid[headerRowIndex]
  const rawDataRows = grid.slice(headerRowIndex + 1)

  // Drop total / subtotal / 'media' / 'count' summary rows (#4). These are
  // common in BI / accounting exports and would otherwise pollute the
  // dataset's aggregates with double-counted figures. We keep a parallel
  // array of original Excel row numbers so downstream errors still point
  // at the right cell.
  const dataRows: unknown[][] = []
  const dataRowExcelNumbers: number[] = []
  for (let i = 0; i < rawDataRows.length; i++) {
    if (isTotalRow(rawDataRows[i])) continue
    dataRows.push(rawDataRows[i])
    dataRowExcelNumbers.push(headerRowIndex + i + 2)
  }

  if (dataRows.length === 0) {
    post({
      ok: false,
      phase: 'row',
      row: headerRowIndex + 2,
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
        row: headerRowIndex + 1,
        column: `Col ${colName(i)}`,
        error: `La cabecera de la columna ${colName(i)} está vacía. Asigna un nombre y vuelve a subir.`,
      })
      return
    }
    if (seenHeaders.has(h)) {
      post({
        ok: false,
        phase: 'header',
        row: headerRowIndex + 1,
        column: h,
        error: `La cabecera "${h}" aparece dos veces (columna ${colName(i)}). Renombra una de las dos.`,
      })
      return
    }
    seenHeaders.add(h)
  }

  postProgress('header', 0.55, 'Cabecera validada')

  // Type-detect: read each column by index out of the row grid.
  let columns: Column[]
  const warnings: ColumnWarning[] = []
  try {
    columns = headers.map((h, i) => {
      const values = dataRows.map((row) => {
        const v = row[i]
        if (v == null) return null
        return typeof v === 'string' ? fixMojibake(v).trim() : fixMojibake(String(v)).trim()
      })
      const inferred = inferColumnTypeDetailed(values, h)
      if (inferred.mixed && inferred.secondary) {
        warnings.push({
          columnKey: `col_${i}`,
          columnLabel: h,
          type: inferred.type,
          secondary: inferred.secondary,
        })
      }
      const subtype = detectSubtype(values, inferred.type)
      return {
        key: `col_${i}`,
        label: h,
        originalLabel: h,
        type: inferred.type,
        ...(subtype && { subtype }),
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

  postProgress('type-detect', 0.7, `${columns.length} columnas tipadas`)

  const rows: Record<string, CellValue>[] = []
  // Emit a progress event roughly every 5% of the row pass so a 50k-row
  // file produces ~20 updates rather than one per row.
  const progressEvery = Math.max(1, Math.floor(dataRows.length / 20))
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
      if (r % progressEvery === 0) {
        const rowProgress = dataRows.length > 0 ? r / dataRows.length : 1
        // Map 0-1 row progress into the 0.7-0.98 slice of total progress.
        postProgress(
          'row',
          0.7 + rowProgress * 0.28,
          `Procesando filas ${r + 1}/${dataRows.length}`,
        )
      }
    } catch (err) {
      post({
        ok: false,
        phase: 'row',
        // dataRowExcelNumbers[r] is the 1-indexed Excel row this survivor
        // came from, accounting for the detected header row and any total /
        // subtotal rows that were filtered out.
        row: dataRowExcelNumbers[r],
        error: `Error procesando la fila ${dataRowExcelNumbers[r]}: ${err instanceof Error ? err.message : 'desconocido'}.`,
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
  post({
    ok: true,
    dataset,
    warnings: warnings.length > 0 ? warnings : undefined,
    sheetNames: sheetNames.length > 1 ? sheetNames : undefined,
    sheetIndex,
    mojibakeFixCount: mojibakeFixCount > 0 ? mojibakeFixCount : undefined,
  })
})
