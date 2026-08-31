import { useQuery } from "@tanstack/react-query";
import { ApiError, salesApi, salesTaxReportPath } from "@/lib/api";
import { IVA_FILING_DAY } from "@/lib/enums/ivaDeclaration";
import type { IvaReport, IvaReportPeriod } from "@/types/ivaReport";

/**
 * IVA declaration support report (formulario D-150 — TRIBU-CR).
 *
 * The aggregation runs on sales-api, not here: a period can span thousands of
 * documents and the declaration only counts the ones Hacienda accepted, which
 * the FE cannot know without walking every page of `/sales`. See
 * `docs/IVA_TAX_REPORT.md` §5 for the endpoint contract.
 *
 * A 404 resolves to `null` rather than an error — the org may simply have no
 * activity in the period, and the page renders an empty state for that.
 */

/** Period key the API expects: `YYYY-MM`. */
export function ivaPeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Current period, i.e. the one the org is accruing right now. */
export function currentIvaPeriod(now: Date = new Date()): string {
  return ivaPeriodKey(now.getFullYear(), now.getMonth() + 1);
}

/** The period most orgs actually want on open: the last closed month. */
export function lastClosedIvaPeriod(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return ivaPeriodKey(d.getFullYear(), d.getMonth() + 1);
}

/** Statutory due date for a period: day 15 of the following month. */
export function ivaDueDate(period: string): Date | null {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month, IVA_FILING_DAY);
}

/** Days left to file — negative once the deadline has passed. */
export function ivaDaysToDeadline(period: string, now: Date = new Date()): number | null {
  const due = ivaDueDate(period);
  if (!due) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function useIvaReport(orgId: string | undefined, period: string) {
  return useQuery<IvaReport | null>({
    queryKey: ["iva-report", orgId, period],
    enabled: !!orgId && !!period,
    // A closed period never changes; an open one changes with every sale.
    // 60 s is a compromise that keeps the page cheap without going stale
    // during a reconciliation session.
    staleTime: 60_000,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
    queryFn: async () => {
      try {
        return await salesApi.get<IvaReport>(
          salesTaxReportPath(orgId!, `/iva?period=${encodeURIComponent(period)}`),
        );
      } catch (error) {
        // No documents in the period — render the empty state, not an error.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

/** Periods the org has IVA activity for — drives the period picker. */
export function useIvaReportPeriods(orgId: string | undefined) {
  return useQuery<IvaReportPeriod[]>({
    queryKey: ["iva-report-periods", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
    queryFn: async () => {
      try {
        return await salesApi.get<IvaReportPeriod[]>(
          salesTaxReportPath(orgId!, "/iva/periods"),
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return [];
        throw error;
      }
    },
  });
}
