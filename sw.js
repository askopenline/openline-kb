// Openline KB service worker — makes repeat visits instant and pages work offline.
//   App files (?v=), fonts and article data (/data/…?v=): cache first; their URLs change on every deploy.
//   Pages: served from cache immediately, refreshed in the background (stale-while-revalidate).
//   Images (preview cards, flags, icons): cache first, refreshed in the background.
const VERSION = "__VERSION__";
const SHELL = __SHELL__;
const STATIC = `kb-static-${VERSION}`, DATA = "kb-data", PAGES = "kb-pages", IMG = "kb-img";
const MAX_PAGES = 150, MAX_IMG = 120;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("kb-static-") && k !== STATIC) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await c.put(req, res.clone());
  return res;
}
async function staleWhileRevalidate(event, name, max) {
  const req = event.request, c = await caches.open(name);
  const hit = await c.match(req);
  const refresh = fetch(req).then(async (res) => {
    if (res.ok && res.type === "basic") { await c.put(req, res.clone()); trim(name, max); }
    return res;
  });
  if (hit) { event.waitUntil(refresh.catch(() => {})); return hit; }
  return refresh;
}
// Keep only the newest data payload per language.
async function dataFirst(req) {
  const c = await caches.open(DATA);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    const path = new URL(req.url).pathname;
    for (const k of await c.keys()) if (new URL(k.url).pathname === path) await c.delete(k);
    await c.put(req, res.clone());
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  if (p === "/healthz" || p === "/sw.js" || p.startsWith("/sitemap") || p === "/robots.txt") return;
  if (p.startsWith("/data/") && url.searchParams.has("v")) return event.respondWith(dataFirst(req));
  if (p.startsWith("/fonts/") || (url.searchParams.has("v") && /\.(js|mjs|css)$/.test(p))) return event.respondWith(cacheFirst(req, STATIC));
  if (/^\/(og|flags)\//.test(p) || /\.(png|ico|webmanifest)$/.test(p) || p === "/minisearch.mjs") return event.respondWith(staleWhileRevalidate(event, IMG, MAX_IMG));
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    if (p === "/modal-preview.html") return;
    return event.respondWith(staleWhileRevalidate(event, PAGES, MAX_PAGES));
  }
});
