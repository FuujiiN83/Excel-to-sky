// src/lib/insights/worker.ts
import { run } from './runner'
import type { WorkerRequest, WorkerResponse } from './types'

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  try {
    const { dataset, options } = event.data
    const report = run(dataset, options)
    const response: WorkerResponse = { ok: true, report }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  }
})
