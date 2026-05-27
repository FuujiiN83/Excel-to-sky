import type { Dataset } from '../types/dataset'
import type { ParsePhase, ParseResponse } from '../workers/parser.worker'
import { logError } from './errorLog'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

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

export async function parseExcelFile(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE_BYTES) {
    const e = new ParseError(
      `El archivo supera 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Reduce filas o conviértelo a CSV.`,
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

  const buffer = await file.arrayBuffer()
  const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
    type: 'module',
  })

  return new Promise<Dataset>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      worker.terminate()
      if (e.data.ok) {
        resolve(e.data.dataset)
        return
      }
      const err = new ParseError(e.data.error, {
        row: e.data.row,
        column: e.data.column,
        phase: e.data.phase,
      })
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
      reject(err)
    }
    worker.onerror = (e) => {
      worker.terminate()
      const err = new ParseError(e.message || 'Worker terminó inesperadamente', {
        phase: 'read',
      })
      void logError({
        level: 'error',
        context: 'parser',
        message: err.message,
        stack: e.error instanceof Error ? e.error.stack : undefined,
        meta: { phase: 'read', worker: 'parser', fileName: file.name },
      })
      reject(err)
    }
    worker.postMessage({ fileBuffer: buffer, fileName: file.name }, [buffer])
  })
}
