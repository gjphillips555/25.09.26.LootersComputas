/* Siftah PinDrop service worker — scope /pindrop/ only.
 * App shell: precached at install, navigations network-first with an offline
 * fallback, static assets stale-while-revalidate. Map tiles/fonts/sprites are
 * cached by the page itself (Cache API, "pindrop-map-v1"), not here, so this
 * worker never touches the rest of looterscomputas.online. */
const VERSION = "pindrop-shell-v2";
const ML = "https://unpkg.com/maplibre-gl@5.24.1/dist/";
const SHELL = [
  "/pindrop/",
  "/pindrop/app.js?v=2",
  "/pindrop/app.css?v=2",
  "/pindrop/manifest.webmanifest",
  "/brand/pindrop-icon-192.png",
  "/brand/pindrop-icon-512.png",
  "/brand/pindrop-maskable-192.png",
  "/brand/pindrop-maskable-512.png",
  "/brand/pindrop-apple-touch-180.png",
  "/brand/pindrop-favicon-32.png",
  "/brand/pindrop-favicon-16.png",
];
const CDN = [ML + "maplibre-gl.js", ML + "maplibre-gl.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })));
      await Promise.all(
        CDN.map(async (u) => {
          const res = await fetch(new Request(u, { mode: "cors", credentials: "omit" }));
          if (res.ok) await cache.put(u, res);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("pindrop-shell-") && k !== VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function networkFirstPage(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await Promise.race([fetch(request), timeout(4000)]);
    if (res && res.ok && (res.headers.get("content-type") || "").includes("text/html")) {
      cache.put("/pindrop/", res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match("/pindrop/");
    return (
      cached ||
      new Response("<h1>PinDrop is offline</h1><p>Open PinDrop once with a connection to make it available offline.</p>", {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 503,
      })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await refresh) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === self.location.origin && url.pathname.startsWith("/pindrop/")) {
    event.respondWith(networkFirstPage(req));
    return;
  }
  const sameOriginAsset =
    url.origin === self.location.origin &&
    ((url.pathname.startsWith("/pindrop/") && url.pathname !== "/pindrop/sw.js") ||
      url.pathname.startsWith("/brand/pindrop-"));
  if (sameOriginAsset || req.url.startsWith(ML)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
