import { useSyncExternalStore } from "react";

/**
 * Reactive connectivity flag.
 *
 * `isOffline()` in `lib/offline.ts` is a one-shot read for imperative code;
 * this is the version a component can render from. Backed by the browser's
 * `online`/`offline` events, which report the *interface* state — a captive
 * portal still reads as online. Treat it as a hint for what to OFFER (a manual
 * input, an explanatory note), never as proof a request will succeed; the
 * request paths use `isOfflineError` on the actual failure instead.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/** Server snapshot — assume online so SSR/tests render the network path. */
function getServerSnapshot() {
  return true;
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
