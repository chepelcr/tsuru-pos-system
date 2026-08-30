import { ApiError } from "./api";

/**
 * Should this failure fall back to locally cached data?
 *
 * Only connectivity-shaped failures qualify. A 403 or a 404 is the server
 * answering — serving a stale local copy there would hide a real problem (a
 * revoked permission, a deleted resource) behind data the user can no longer
 * legitimately see. `ApiError.retriable` already marks network failures,
 * timeouts, 429 and 5xx, which is exactly the set we want.
 */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof ApiError) return error.retriable;
  // A non-ApiError escaping the client is a thrown TypeError from fetch or a
  // programming bug; treat it as connectivity only when the browser agrees.
  return false;
}

/** True when the browser reports no connectivity. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
