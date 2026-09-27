/**
 * The store-be `search=` DSL, in one place.
 *
 * Every list endpoint on store-be (clients, products, branches, stores,
 * departments, orders, consecutives, sessions…) takes the same grammar:
 * comma-joined clauses, `field:value` (equals, or LIKE on a like-field),
 * `field>x` / `field<x`, `field:a~b` (between), `(a,b)` (OR group) and
 * `orderBy>field` / `orderBy<field` (asc / desc).
 *
 * The backend DROPS a clause whose field is neither one of its filters nor a
 * column of the entity — silently, no 400. A misspelt field is therefore not an
 * error, it is "no filter": the list comes back unfiltered and looks like a
 * search that found nothing useful.
 * That is why every entity builder lists its fields in `SEARCH_FIELDS`
 * (mirroring the backend `*SearchFilters` enums) and a test pins them.
 */

export type SortDirection = "asc" | "desc";
type Clause = string | null | undefined | false;

/** Strip the grammar's own delimiters so a typed value cannot become a clause. */
export function clean(value: string | number): string {
  return String(value).replace(/[,():<>~*!]/g, " ").replace(/\s+/g, " ").trim();
}

/** `field:value`, or nothing when the value is empty. */
export function eq(field: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const v = clean(value);
  return v ? `${field}:${v}` : null;
}

/**
 * `field:*value*` — explicit contains. Needed on fields that ALLOW like but are
 * not always-like (branch name, store name…); harmless on always-like ones.
 */
export function contains(field: string, value: string | null | undefined): string | null {
  const v = clean(value ?? "");
  return v ? `${field}:*${v}*` : null;
}

/** `(a,b,…)` — OR group; nothing when every member is empty. */
export function anyOf(...clauses: Clause[]): string | null {
  const parts = clauses.filter((c): c is string => !!c);
  return parts.length ? `(${parts.join(",")})` : null;
}

/** Between when both bounds are set, else the open-ended comparison. */
export function range(
  field: string,
  from: string | number | null | undefined,
  to: string | number | null | undefined,
): string | null {
  const lo = from === undefined || from === null || from === "" ? undefined : clean(from);
  const hi = to === undefined || to === null || to === "" ? undefined : clean(to);
  if (lo && hi) return `${field}:${lo}~${hi}`;
  if (lo) return `${field}>${lo}`;
  if (hi) return `${field}<${hi}`;
  return null;
}

export function orderBy(field: string | null | undefined, direction: SortDirection = "desc"): string | null {
  return field ? `orderBy${direction === "asc" ? ">" : "<"}${field}` : null;
}

/** Join the non-empty clauses. */
export function joinSearch(...clauses: Clause[]): string {
  return clauses.filter((c): c is string => !!c).join(",");
}

/** Status filter where `"all"` (or nothing) means no clause. */
export function statusClause(status: string | number | null | undefined): string | null {
  return status === "all" ? null : eq("status", status);
}

/** The most common filter of all: active rows only. */
export const ACTIVE_ONLY = "status:1";
