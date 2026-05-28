/* Excel to Sky service worker (#178). Caches the application shell so the
 * UI loads offline even when the network is unavailable. We intentionally
 * keep this small: no precache of data, no API proxying, no background
 * sync. Pure shell-on-first-visit, network-falling-back-to-cache on
 * navigation requests, cache-first for hashed assets.
 *
 * Versioning: bump CACHE_VERSION every time the install logic needs to
 * change so the activate phase wipes stale caches.
 */

const CACHE_VERSION = 'ets-shell-v1'
const SHELL_URLS = ['/', '/app', '/manifest.webmanifest', '/icons/favicon.svg', '/og-default.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * Strategy:
 *   - Hashed assets under /assets/ → cache-first, populate on miss.
 *   - Navigation requests (HTML) → network-first, fall back to cached '/'
 *     so refresh works offline.
 *   - Everything else → pass through (no-op).
 */
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(req, clone))
              .catch(() => undefined)
          }
          return res
        })
      }),
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((match) => match ?? Response.error())),
    )
  }
})
