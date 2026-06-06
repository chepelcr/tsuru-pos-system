/**
 * Catalog label lookup helpers.
 *
 * The BE does not persist display descriptions on product fields — only the
 * canonical Hacienda code (or data-services id) is stored. The FE renders the
 * human-readable label by joining against the matching catalog row at render
 * time. These helpers keep that lookup terse and consistent.
 */

export function labelByCode<T extends { code?: string | null; description?: string | null }>(
  rows: T[] | undefined,
  code: string | undefined | null,
): string {
  if (!code) return "";
  return rows?.find((r) => r.code === code)?.description ?? "";
}

export function labelById<T extends { id?: string | number | null; description?: string | null }>(
  rows: T[] | undefined,
  id: string | number | undefined | null,
): string {
  if (id == null) return "";
  const norm = typeof id === "number" ? String(id) : id;
  return rows?.find((r) => String(r.id) === norm)?.description ?? "";
}
