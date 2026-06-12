// Localized labels for the RBAC catalog. The platform API stores a single
// displayName per module/submodule/action/role (mixed ES/EN seeds), so the UI
// translates by the STABLE catalog `name` instead and only falls back to the
// server displayName when no key exists (e.g. custom org roles, modules added
// before their keys ship). Keys live in LanguageContext under `rbac.*`.

type T = (key: string, params?: Record<string, string | number>) => string;

/** t() returns the key itself when missing — translate-or-fallback helper. */
function tOr(t: T, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export function moduleLabel(t: T, name: string, displayName: string): string {
  return tOr(t, `rbac.module.${name}`, displayName);
}

export function submoduleLabel(
  t: T,
  moduleName: string,
  name: string,
  displayName: string
): string {
  return tOr(t, `rbac.sub.${moduleName}.${name}`, displayName);
}

export function actionLabel(t: T, name: string, displayName: string): string {
  return tOr(t, `rbac.action.${name}`, displayName);
}

/** System role template names (owner/admin/…); custom org roles fall back. */
export function roleLabel(t: T, name: string, displayName: string): string {
  return tOr(t, `rbac.role.${name}.name`, displayName);
}

export function roleDescription(
  t: T,
  name: string,
  description: string | null | undefined
): string {
  return tOr(t, `rbac.role.${name}.desc`, description ?? "");
}
