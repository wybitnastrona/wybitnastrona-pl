// Service worker dla wybitnastrona.pl (PWA + offline cache).
// Strategia: cache-first dla assetow statycznych, network-first dla API/HTML.

const CACHE = "wybitna-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: network-first, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => new Response("Offline", { status: 503 })));
    return;
  }

  // Statyczne assety: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|svg|css|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, resClone));
            return res;
          }),
      ),
    );
    return;
  }

  // HTML: network-first, fallback do cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match("/"))),
  );
});
