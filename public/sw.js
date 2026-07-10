// Basic service worker for عکاسی نسیم PWA.
// Strategy: app-shell precache + runtime cache for same-origin GET requests
// (network-first with cache fallback). This lets the app boot offline and
// keeps reminder pages available for cached notifications.

const CACHE_VERSION = "nasim-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/sounds/alarm-1.wav",
  "/sounds/alarm-2.wav",
  "/sounds/alarm-3.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET.
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Skip cross-origin requests (e.g. analytics, Google Fonts).
  if (url.origin !== self.location.origin) return;

  // Skip Next.js dev/HMR and API routes — those should always hit network.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Network-first for HTML navigations; cache-first for static assets.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type === "opaque") return res
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => cached)
    })
  )
});

// Allow pages to trigger a skipWaiting on update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting()
});
