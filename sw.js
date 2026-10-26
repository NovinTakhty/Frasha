/* Frasha Lead Finder - service worker (offline shell).
   To ship an update: change VERSION below, upload the new files, reopen the app twice. */
const VERSION = "v2.0.0-phase3";
const CACHE = "frasha-" + VERSION;
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("frasha-") && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* network first (3 s) for the page so updates arrive, cache fallback so it works offline */
function networkFirstPage(req) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  return fetch(req, { signal: ctrl.signal })
    .then((res) => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
      }
      return res;
    })
    .catch(() => {
      clearTimeout(timer);
      return caches.match("./index.html", { ignoreSearch: true });
    });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* instagram, wa.me, google: not touched */

  if (req.mode === "navigate") {
    e.respondWith(networkFirstPage(req));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
