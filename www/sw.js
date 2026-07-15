const CACHE_PREFIX = "workout-log-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v95`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/assets/app.js",
  "/telegram-login-widget.html",
  "/assets/telegram-login-frame.js",
  "/manifest.webmanifest",

  "/pwa-assets/icon.svg",
  "/pwa-assets/apple-touch-icon.png",
  "/pwa-assets/icon-192.png",
  "/pwa-assets/icon-512.png",
  "/pwa-assets/maskable-192.png",
  "/pwa-assets/maskable-512.png"
];

async function installShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_ASSETS.map(url => new Request(url, {cache: "reload"})));
  await self.skipWaiting();
}

async function reloadExistingAppClients() {
  const clients = await self.clients.matchAll({type: "window", includeUncontrolled: true});
  await Promise.all(clients.map(client => {
    const url = new URL(client.url);
    if (url.origin !== self.location.origin || url.pathname === "/telegram-login-widget.html") {
      return undefined;
    }
    return client.navigate(client.url).catch(() => undefined);
  }));
}

async function activateShell() {
  const keys = await caches.keys();
  const oldShellKeys = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
  const isUpgrade = oldShellKeys.length > 0;

  await Promise.all(oldShellKeys.map(key => caches.delete(key)));
  await self.clients.claim();

  // Existing installed PWAs may still be executing the pre-iframe Telegram login bundle.
  // Reload them once after this cache migration so they immediately receive the new shell.
  if (isUpgrade) {
    await reloadExistingAppClients();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await caches.match("/index.html") || await caches.match("/");
      if (shell) return shell;
    }
    throw error;
  }
}

self.addEventListener("install", event => {
  event.waitUntil(installShell());
});

self.addEventListener("activate", event => {
  event.waitUntil(activateShell());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(networkFirst(event.request));
});
