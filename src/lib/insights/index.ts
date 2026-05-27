// src/lib/insights/index.ts
import type { Dataset } from '../../types/dataset'
import type { AnalyzeOptions, InsightReport, WorkerResponse } from './types'
import { run as runSync } from './runner'
import { logError } from '../errorLog'

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

class InsightsWorkerCrash extends Error {
  constructor(
    message: string,
    readonly stack2?: string,
  ) {
    super(message)
    this.name = 'InsightsWorkerCrash'
  }
}

interface WorkerRunOpts {
  dataset: Dataset
  workerOpts: Omit<AnalyzeOptions, 'signal'>
  signal?: AbortSignal
}

function runInsightsWorker({ dataset, workerOpts, signal }: WorkerRunOpts): Promise<InsightReport> {
  return new Promise<InsightReport>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

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
      reject(
        new InsightsWorkerCrash(
          e.message || 'Insights worker terminó inesperadamente',
          e.error instanceof Error ? e.error.stack : undefined,
        ),
      )
    }

    worker.postMessage({ dataset, options: workerOpts })
  })
}

export async function analyzeDataset(
  dataset: Dataset,
  options: AnalyzeOptions = {},
): Promise<InsightReport> {
  const { signal, ...workerOpts } = options

  if (!WORKERS_SUPPORTED) {
    console.warn('[insights] Web Workers not supported; falling back to main thread')
    return runSync(dataset, workerOpts)
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await runInsightsWorker({ dataset, workerOpts, signal })
    } catch (err) {
      if (err instanceof InsightsWorkerCrash && attempt === 0 && !signal?.aborted) {
        void logError({
          level: 'warn',
          context: 'insights',
          message: `Insights worker crashed, retrying once: ${err.message}`,
          stack: err.stack2,
          meta: {
            phase: 'analyze',
            worker: 'insights',
            retry: 1,
            rowCount: dataset.rows.length,
            columnCount: dataset.columns.length,
          },
        })
        continue
      }
      if (err instanceof InsightsWorkerCrash) {
        void logError({
          level: 'error',
          context: 'insights',
          message: err.message,
          stack: err.stack2,
          meta: {
            phase: 'analyze',
            worker: 'insights',
            retry: 2,
            rowCount: dataset.rows.length,
            columnCount: dataset.columns.length,
          },
        })
        throw new Error(err.message)
      }
      throw err
    }
  }

  // Unreachable
  throw new Error('Insights worker no respondió tras reintentos')
}
