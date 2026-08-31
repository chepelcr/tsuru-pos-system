/* eslint-disable no-undef */
/**
 * Tsuru POS service worker — GENERATED. Do not edit `dist/sw.js`.
 *
 * Source: `scripts/sw-template.js`, stamped with the build's real asset names
 * by `scripts/generate-sw.mjs`. In dev the app registers `public/sw.js`, which
 * is a no-op shell.
 *
 * Caching rules, in order of specificity:
 *
 *  1. API calls          — never cached. They are authenticated, and the app
 *                          already has its own offline layers (React Query +
 *                          IndexedDB). A stale cached 200 here would be worse
 *                          than a clean failure the app knows how to handle.
 *  2. Navigations        — network first, falling back to the precached shell.
 *                          Network first so a deploy is picked up immediately;
 *                          the fallback is what makes the app open offline.
 *  3. Hashed build files — cache first. The filename contains the content
 *                          hash, so a hit can never be stale.
 *  4. Fonts              — stale-while-revalidate, so type renders offline.
 */

const BUILD_ID = "__BUILD_ID__";
const SHELL_CACHE = `tsuru-pos-shell-${BUILD_ID}`;
const RUNTIME_CACHE = `tsuru-pos-runtime-${BUILD_ID}`;
const FONT_CACHE = "tsuru-pos-fonts";

const PRECACHE_ASSETS = __PRECACHE_ASSETS__;

const FONT_ORIGINS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

/** Origins whose responses must never be written to a cache. */
function isApiRequest(url) {
  if (url.origin === self.location.origin) return url.pathname.startsWith("/api/");
  // The three API gateways live on their own subdomains.
  return /(^|\.)(api|orders-api|sales-api|data-api)\./.test(url.hostname);
}

function isFontRequest(url) {
  return FONT_ORIGINS.includes(url.origin);
}

function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // `reload` bypasses the HTTP cache so a fresh deploy never precaches the
      // previous build's bytes from the browser cache.
      .then((cache) =>
        cache.addAll(PRECACHE_ASSETS.map((asset) => new Request(asset, { cache: "reload" }))),
      )
      // One missing asset must not abandon the whole install — the runtime
      // rules still work, they just start cold.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put("/index.html", response.clone());
    }
    return response;
  } catch {
    const cached = (await caches.match("/index.html")) ?? (await caches.match("/"));
    if (cached) return cached;
    throw new Error("offline and no cached shell");
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Queued sales and manual orders are replayed by the authenticated React
  // app, not here: a service worker cannot refresh a Cognito token safely.
  if (isApiRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (isBuildAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (isFontRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
