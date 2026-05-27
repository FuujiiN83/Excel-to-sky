// src/lib/insights/index.ts
import type { Dataset } from '../../types/dataset'
import type { AnalyzeOptions, InsightReport, WorkerResponse } from './types'
import { run as runSync } from './runner'

export type {
  AnalyzeOptions,
  Finding,
  FindingData,
  FindingType,
  InsightReport,
  DatasetSummary,
  Severity,
} from './types'

const WORKERS_SUPPORTED = typeof Worker !== 'undefined'

export async function analyzeDataset(
  dataset: Dataset,
  options: AnalyzeOptions = {},
): Promise<InsightReport> {
  const { signal, ...workerOpts } = options

  if (!WORKERS_SUPPORTED) {
    console.warn('[insights] Web Workers not supported; falling back to main thread')
    return runSync(dataset, workerOpts)
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

  return new Promise<InsightReport>((resolve, reject) => {
    const onAbort = (): void => {
      worker.terminate()
      reject(new DOMException('Analysis aborted', 'AbortError'))
    }
    if (signal) {
      if (signal.aborted) {
        worker.terminate()
        reject(new DOMException('Analysis aborted', 'AbortError'))
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
      if (e.data.ok) resolve(e.data.report)
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
      reject(new Error(e.message))
    }

    worker.postMessage({ dataset, options: workerOpts })
  })
}
