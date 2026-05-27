import type { Dataset } from '../types/dataset'
import type {
  ColumnWarning,
  ParsePhase,
  ParseProgress,
  ParseResponse,
} from '../workers/parser.worker'
import { logError } from './errorLog'
import { pushToast } from './toast'

/** Hard limit — files above this are rejected upfront. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024
/** Soft warning — files between this and MAX_FILE_BYTES parse but the UI warns. */
export const WARN_FILE_BYTES = 10 * 1024 * 1024

export function fileSizeTier(sizeBytes: number): 'ok' | 'warn' | 'reject' {
  if (sizeBytes > MAX_FILE_BYTES) return 'reject'
  if (sizeBytes > WARN_FILE_BYTES) return 'warn'
  return 'ok'
}

export interface ParseErrorContext {
  row?: number
  column?: string
  phase?: ParsePhase
}

export class ParseError extends Error {
  readonly row?: number
  readonly column?: string
  readonly phase?: ParsePhase

  constructor(message: string, ctx: ParseErrorContext = {}) {
    super(message)
    this.name = 'ParseError'
    this.row = ctx.row
    this.column = ctx.column
    this.phase = ctx.phase
  }

  /** Single-line summary suitable for inline UI display. */
  pretty(): string {
    const where: string[] = []
    if (this.row !== undefined) where.push(`fila ${this.row}`)
    if (this.column !== undefined) where.push(`columna "${this.column}"`)
    if (where.length === 0) return this.message
    return `${this.message} (${where.join(', ')})`
  }
}

/** Sentinel rejection used to ask the outer loop to retry. */
class WorkerCrash extends Error {
  constructor(
    message: string,
    readonly stack2?: string,
  ) {
    super(message)
    this.name = 'WorkerCrash'
  }
}

export interface ParseSuccessMeta {
  /** All sheet names if the workbook has more than one — undefined otherwise. */
  sheetNames?: string[]
  /** Zero-based index of the parsed sheet. */
  sheetIndex: number
}

export interface ParseResult {
  dataset: Dataset
  meta: ParseSuccessMeta
}

export interface ParseExcelOptions {
  /** Pick a specific sheet by index. Defaults to 0 (first sheet). */
  sheetIndex?: number
  /** Receive 0-or-more progress updates while the worker runs (#11). */
  onProgress?: (event: { phase: ParsePhase; ratio: number; label: string }) => void
}

function runParseWorker(
  buffer: ArrayBuffer,
  fileName: string,
  sheetIndex: number | undefined,
  onProgress?: ParseExcelOptions['onProgress'],
): Promise<ParseResult> {
  // The worker only consumes the buffer once (it's transferred), so callers
  // that need a retry must keep a separate copy and pass it in fresh.
  return new Promise<ParseResult>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      // Progress events are streamed before the terminal ParseSuccess/Error.
      // Discriminate via the absence of `ok`: only progress carries `kind`.
      if (!('ok' in e.data)) {
        const p: ParseProgress = e.data
        onProgress?.({ phase: p.phase, ratio: p.ratio, label: p.label })
        return
      }
      worker.terminate()
      if (e.data.ok) {
        if (e.data.warnings && e.data.warnings.length > 0) {
          surfaceColumnWarnings(e.data.warnings)
        }
        if (e.data.mojibakeFixCount && e.data.mojibakeFixCount > 0) {
          surfaceMojibakeWarning(e.data.mojibakeFixCount)
        }
        resolve({
          dataset: e.data.dataset,
          meta: { sheetNames: e.data.sheetNames, sheetIndex: e.data.sheetIndex },
        })
        return
      }
      reject(
        new ParseError(e.data.error, {
          row: e.data.row,
          column: e.data.column,
          phase: e.data.phase,
        }),
      )
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(
        new WorkerCrash(
          e.message || 'Worker terminó inesperadamente',
          e.error instanceof Error ? e.error.stack : undefined,
        ),
      )
    }
    worker.postMessage({ fileBuffer: buffer, fileName, sheetIndex }, [buffer])
  })
}

function surfaceMojibakeWarning(count: number): void {
  pushToast(
    `Detectados ${count} valores con codificación mal interpretada (probablemente UTF-8 leído como Latin-1). Hemos intentado restaurarlos automáticamente, pero revisa columnas con acentos y eñes por si quedan glifos raros.`,
    'info',
    8000,
  )
  void logError({
    level: 'info',
    context: 'parser',
    message: `Mojibake recoveries: ${count}`,
    meta: { phase: 'type-detect', mojibakeFixCount: count },
  })
}

function surfaceColumnWarnings(warnings: ColumnWarning[]): void {
  // First three columns at most to avoid flooding the user with toasts.
  const sample = warnings.slice(0, 3)
  const labels = sample.map((w) => `"${w.columnLabel}"`).join(', ')
  const extra = warnings.length > sample.length ? ` y ${warnings.length - sample.length} más` : ''
  pushToast(
    `Tipos mixtos detectados en ${labels}${extra}. Las columnas se han etiquetado con el tipo más frecuente — limpia los valores raros si el dashboard sale mal.`,
    'info',
    7000,
  )
  void logError({
    level: 'info',
    context: 'parser',
    message: `Mixed-type columns: ${warnings.length}`,
    meta: { phase: 'type-detect', columnCount: warnings.length },
  })
}

/**
 * Parse an Excel/CSV file. Returns just the Dataset when the workbook has a
 * single sheet; callers that care about multi-sheet workbooks should use
 * parseExcelFileWithMeta() which also returns the sheet list.
 */
export async function parseExcelFile(file: File, opts?: ParseExcelOptions): Promise<Dataset> {
  const { dataset } = await parseExcelFileWithMeta(file, opts)
  return dataset
}

export async function parseExcelFileWithMeta(
  file: File,
  opts: ParseExcelOptions = {},
): Promise<ParseResult> {
  if (file.size > MAX_FILE_BYTES) {
    const e = new ParseError(
      `El archivo supera ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Reduce filas o conviértelo a CSV.`,
      { phase: 'read' },
    )
    void logError({
      level: 'warn',
      context: 'parser',
      message: e.message,
      meta: { phase: 'read', fileName: file.name },
    })
    throw e
  }

  // ArrayBuffer is transferred to the worker on postMessage, so we read the
  // file once and clone the buffer per attempt.
  const sourceBuffer = await file.arrayBuffer()

  for (let attempt = 0; attempt < 2; attempt++) {
    const fresh = sourceBuffer.slice(0)
    try {
      return await runParseWorker(fresh, file.name, opts.sheetIndex, opts.onProgress)
    } catch (err) {
      if (err instanceof WorkerCrash && attempt === 0) {
        void logError({
          level: 'warn',
          context: 'parser',
          message: `Parser worker crashed, retrying once: ${err.message}`,
          stack: err.stack2,
          meta: { phase: 'read', worker: 'parser', retry: 1, fileName: file.name },
        })
        continue
      }
      if (err instanceof WorkerCrash) {
        const wrapped = new ParseError(err.message, { phase: 'read' })
        void logError({
          level: 'error',
          context: 'parser',
          message: wrapped.message,
          stack: err.stack2,
          meta: { phase: 'read', worker: 'parser', retry: 2, fileName: file.name },
        })
        throw wrapped
      }
      // Real ParseError from the worker — no retry, just log and rethrow.
      if (err instanceof ParseError) {
        void logError({
          level: 'error',
          context: 'parser',
          message: err.message,
          meta: {
            phase: err.phase,
            row: err.row,
            column: err.column,
            fileName: file.name,
          },
        })
      }
      throw err
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new ParseError('Parser worker no respondió tras reintentos', { phase: 'read' })
}
