self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Queued sales are intentionally replayed by the authenticated React app.
// A service worker cannot refresh the user's Cognito token safely.
