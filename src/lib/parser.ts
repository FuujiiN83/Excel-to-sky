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

function runParseWorker(buffer: ArrayBuffer, fileName: string): Promise<Dataset> {
  // The worker only consumes the buffer once (it's transferred), so callers
  // that need a retry must keep a separate copy and pass it in fresh.
  return new Promise<Dataset>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      worker.terminate()
      if (e.data.ok) {
        resolve(e.data.dataset)
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
    worker.postMessage({ fileBuffer: buffer, fileName }, [buffer])
  })
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

  // ArrayBuffer is transferred to the worker on postMessage, so we read the
  // file once and clone the buffer per attempt.
  const sourceBuffer = await file.arrayBuffer()

  for (let attempt = 0; attempt < 2; attempt++) {
    const fresh = sourceBuffer.slice(0)
    try {
      return await runParseWorker(fresh, file.name)
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
