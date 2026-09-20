import type { DashboardSource } from "@/types/dashboard";

/**
 * Which population the operator prefers to count — Pedidos or Documentos.
 *
 * Remembered per browser and shared by the dashboard and the Reportes page, so
 * the two cannot be looking at different things while claiming the same heading.
 * Storage can throw outright in a private window, so every access is guarded and
 * the choice simply does not persist when it does.
 */
export const SOURCE_KEY = "pos-dashboard-source";

export function readSourcePreference(): DashboardSource {
  try {
    return localStorage.getItem(SOURCE_KEY) === "documents" ? "documents" : "orders";
  } catch {
    return "orders";
  }
}

export function writeSourcePreference(source: DashboardSource): void {
  try {
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    // Not worth surfacing — the choice simply does not persist.
  }
}
