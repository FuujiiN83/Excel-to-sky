/**
 * Schedule a callback to run when the browser is idle, falling back to a
 * short setTimeout on engines that don't expose requestIdleCallback (Safari
 * before the 17+ rollout, anywhere on a Web Worker thread).
 *
 * Returns a disposer that cancels the pending callback. Safe to call on
 * cleanup; idempotent.
 */
export type IdleHandle = { cancel: () => void }

interface IdleCallbackDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

declare global {
  interface Window {
    requestIdleCallback?: (
      cb: (deadline: IdleCallbackDeadline) => void,
      opts?: { timeout?: number },
    ) => number
    cancelIdleCallback?: (handle: number) => void
  }
}

export function runWhenIdle(fn: () => void, timeoutMs = 2000): IdleHandle {
  if (typeof window === 'undefined') {
    // Worker / server context. Run synchronously — there's no event loop to
    // defer to that we can rely on.
    fn()
    return { cancel: () => {} }
  }
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs })
    return {
      cancel: () => window.cancelIdleCallback?.(id),
    }
  }
  // Fallback: setTimeout 0 (still pushed to the next macro-task tick).
  const id = window.setTimeout(fn, 0)
  return { cancel: () => window.clearTimeout(id) }
}
