import type { Dataset } from '../types/dataset'
import type { ParseResponse } from '../workers/parser.worker'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

export class ParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

export async function parseExcelFile(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ParseError(`El archivo supera 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Reduce filas o conviértelo a CSV.`)
  }
  const buffer = await file.arrayBuffer()
  const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<Dataset>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      worker.terminate()
      if (e.data.ok) resolve(e.data.dataset)
      else reject(new ParseError(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new ParseError(e.message))
    }
    worker.postMessage({ fileBuffer: buffer, fileName: file.name }, [buffer])
  })
}
