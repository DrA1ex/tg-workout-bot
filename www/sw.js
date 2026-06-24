const CACHE_NAME = "workout-log-shell-v94";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/assets/app.js",
  "/manifest.webmanifest",

  "/pwa-assets/icon.svg",
  "/pwa-assets/apple-touch-icon.png",
  "/pwa-assets/icon-192.png",
  "/pwa-assets/icon-512.png",
  "/pwa-assets/maskable-192.png",
  "/pwa-assets/maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
