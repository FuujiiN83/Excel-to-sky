/**
 * Tiny event bus for surfacing network-layer failures to the UI without
 * coupling every fetch call site to a React context. Anything making a
 * network request can call reportNetworkError(...) on failure, and the
 * <NetworkErrorBanner /> mounted at the app root picks it up.
 */

import { logError } from './errorLog'

export interface NetworkErrorEvent {
  /** Subsystem that produced the error, e.g. 'share-api'. */
  context: string
  /** Short, user-facing message. */
  message: string
  /** HTTP status if applicable. */
  status?: number
  /** ISO timestamp; populated automatically. */
  ts: string
}

const EVENT_NAME = 'ets:network-error'
const bus = new EventTarget()

export function reportNetworkError(input: Omit<NetworkErrorEvent, 'ts'>, cause?: unknown): void {
  const event: NetworkErrorEvent = { ...input, ts: new Date().toISOString() }
  bus.dispatchEvent(new CustomEvent<NetworkErrorEvent>(EVENT_NAME, { detail: event }))
  void logError({
    level: 'error',
    context: input.context,
    message: input.message,
    stack: cause instanceof Error ? cause.stack : undefined,
    meta: { status: input.status, httpStatus: input.status, phase: 'network' },
  })
}

export function subscribeNetworkErrors(handler: (e: NetworkErrorEvent) => void): () => void {
  function listener(ev: Event): void {
    const ce = ev as CustomEvent<NetworkErrorEvent>
    handler(ce.detail)
  }
  bus.addEventListener(EVENT_NAME, listener)
  return () => bus.removeEventListener(EVENT_NAME, listener)
}
