/**
 * Tiny toast event bus. Anywhere can call pushToast(...) and the <Toaster />
 * mounted at the app root picks it up. Toast IDs are unique per session;
 * the <Toaster /> tracks the live set and auto-dismisses.
 *
 * This is intentionally separate from networkError.ts — toasts are for
 * transient, non-critical feedback ('Enlace copiado', 'Dashboard guardado'),
 * while the network-error banner is for persistent failures that need
 * an explicit dismissal.
 */

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
  /** Auto-dismiss delay in ms. 0 keeps it until explicitly closed. */
  timeoutMs: number
}

const EVENT_NAME = 'ets:toast'
const bus = new EventTarget()
let nextId = 0

export function pushToast(message: string, kind: ToastKind = 'info', timeoutMs = 4500): string {
  nextId += 1
  const toast: Toast = { id: `t${nextId}`, message, kind, timeoutMs }
  bus.dispatchEvent(new CustomEvent<Toast>(EVENT_NAME, { detail: toast }))
  return toast.id
}

export function subscribeToasts(handler: (t: Toast) => void): () => void {
  function listener(ev: Event): void {
    const ce = ev as CustomEvent<Toast>
    handler(ce.detail)
  }
  bus.addEventListener(EVENT_NAME, listener)
  return () => bus.removeEventListener(EVENT_NAME, listener)
}
