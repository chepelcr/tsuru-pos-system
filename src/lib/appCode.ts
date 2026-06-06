/**
 * Identifies the current FE app inside the jmarkets ecosystem.
 *
 * Notifications coming through the shared user-app notifications channel
 * carry a `target_apps: string[]` list. Each FE app filters incoming events
 * down to ones tagged for itself (or globally for everyone).
 *
 * Conventions:
 *  - `"pos"`               — this POS system (cashier + admin dashboard)
 *  - `"dashboard"`         — the main jmarkets dashboard (BeautyMarket/dashboard/)
 *  - `"landing"`           — the public landing/marketing site (if it ever subscribes)
 *  - additional codes are reserved for future apps
 *
 * A notification with `target_apps` undefined, empty, or containing
 * `GLOBAL_APP_CODE` ("*") is consumed by every app.
 */

export const AppCode = {
  POS:       "pos",
  DASHBOARD: "dashboard",
  LANDING:   "landing",
} as const;
export type AppCodeValue = (typeof AppCode)[keyof typeof AppCode];

/** Wildcard meaning "every app". */
export const GLOBAL_APP_CODE = "*" as const;

/** The app identifier for this build. Hardcoded — this is the POS system. */
export const CURRENT_APP: AppCodeValue = AppCode.POS;

/**
 * Returns true when a notification's `target_apps` list either targets the
 * current app or is global (undefined / empty / contains `"*"`).
 */
export function isNotificationForCurrentApp(
  target_apps: ReadonlyArray<string> | undefined | null,
): boolean {
  if (target_apps == null || target_apps.length === 0) return true;
  if (target_apps.includes(GLOBAL_APP_CODE)) return true;
  return target_apps.includes(CURRENT_APP);
}
