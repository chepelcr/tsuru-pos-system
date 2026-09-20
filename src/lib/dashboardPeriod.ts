import type { DashboardGranularity } from "@/types/dashboard";

/**
 * Date windows for the dashboard chart and the Reportes page.
 *
 * The bug this exists for: the dashboard sent a `granularity` and NO window, so
 * every bucket size aggregated the organization's entire history. Switching
 * Hora → Mes re-bucketed the same corpus, and the headline above the chart was
 * the all-time revenue summary, which no granularity affects — so all four tabs
 * showed identical numbers and the selector looked broken. It wasn't: nothing
 * had ever told the server which period to answer for.
 *
 * Bounds are ISO **date strings**, not timestamps. That is deliberate: the
 * backend's `DocumentSearchDTO` reads a bare date end-bound as "the whole of
 * that day" and a timestamped one as "up to that instant", so a date-only bound
 * is what makes `end` inclusive. Sending `2026-09-20T00:00:00` as the end of
 * today would exclude all of today.
 */

function iso(date: Date): string {
  // Local calendar date, not `toISOString()` — that converts to UTC first, and
  // in Costa Rica (UTC-6) every date before 18:00 would come out a day early.
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface DateWindow {
  dateFrom: string;
  dateTo: string;
}

/** How many buckets back each granularity looks, so a chart has a shape. */
const TREND_SPAN: Record<DashboardGranularity, (from: Date) => void> = {
  hour: (d) => d.setDate(d.getDate() - 1),
  day: (d) => d.setDate(d.getDate() - 29),
  week: (d) => d.setDate(d.getDate() - 7 * 11),
  month: (d) => d.setMonth(d.getMonth() - 11),
  year: (d) => d.setFullYear(d.getFullYear() - 4),
};

/**
 * The window the trend chart should ask for at a given bucket size.
 *
 * Enough buckets to read a trend from and few enough to stay legible: 24 hours,
 * 30 days, 12 weeks, 12 months, 5 years.
 */
export function trendWindow(granularity: DashboardGranularity): DateWindow {
  const to = new Date();
  const from = new Date();
  TREND_SPAN[granularity](from);
  return { dateFrom: iso(from), dateTo: iso(to) };
}

/** The four periods a report is asked for. */
export const REPORT_PERIODS = ["day", "week", "month", "year"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/**
 * The period a report covers: today, this week, this month, this year.
 *
 * A report is about a closed question ("what did we sell this month?"), unlike
 * the dashboard chart, which is about a trend — so this is the CURRENT period,
 * not a rolling span. The week starts Monday, as it does in Costa Rica.
 */
export function reportWindow(period: ReportPeriod, reference = new Date()): DateWindow {
  const to = new Date(reference);
  const from = new Date(reference);

  switch (period) {
    case "day":
      break;
    case "week": {
      // getDay(): 0 = Sunday. Monday-based, so Sunday is 6 days into its week.
      const offset = (from.getDay() + 6) % 7;
      from.setDate(from.getDate() - offset);
      break;
    }
    case "month":
      from.setDate(1);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
  }
  return { dateFrom: iso(from), dateTo: iso(to) };
}

/**
 * The bucket to chart a report period at.
 *
 * One level finer than the period itself, so the chart has points to draw: a
 * yearly report is charted by month, a daily one by hour.
 */
export const REPORT_GRANULARITY: Record<ReportPeriod, DashboardGranularity> = {
  day: "hour",
  week: "day",
  month: "day",
  year: "month",
};
