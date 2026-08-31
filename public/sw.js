/**
 * DEV service worker — a deliberate no-op.
 *
 * The production worker is generated at build time by
 * `scripts/generate-sw.mjs` (template: `scripts/sw-template.js`), which stamps
 * in the build's hashed asset names and overwrites this file in `dist/`.
 * Precaching a dev server's unhashed module URLs would only fight HMR.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Queued sales and manual orders are intentionally replayed by the
// authenticated React app. A service worker cannot refresh the user's Cognito
// token safely.
