import { describe, expect, it } from "vitest";
import {
  REPORT_GRANULARITY,
  reportWindow,
  trendWindow,
} from "./dashboardPeriod";

/**
 * These bounds are what the dashboard was missing entirely — it sent a
 * granularity and no window, so every tab aggregated all of history and showed
 * the same figures.
 */
describe("trendWindow", () => {
  it("gives every granularity a different window", () => {
    const windows = (["hour", "day", "week", "month", "year"] as const).map(
      (g) => trendWindow(g).dateFrom,
    );
    expect(new Set(windows).size).toBe(windows.length);
  });

  it("ends today, inclusive", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
    expect(trendWindow("day").dateTo).toBe(expected);
  });

  it("emits date-only bounds", () => {
    // A bare date is what makes the backend read the end bound as the whole of
    // that day. A timestamp would exclude everything issued today.
    const { dateFrom, dateTo } = trendWindow("month");
    expect(dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("looks further back the coarser the bucket", () => {
    const from = (g: "day" | "week" | "month" | "year") => trendWindow(g).dateFrom;
    expect(from("day") > from("week")).toBe(true);
    expect(from("week") > from("month")).toBe(true);
    expect(from("month") > from("year")).toBe(true);
  });
});

describe("reportWindow", () => {
  // A Wednesday.
  const wednesday = new Date(2026, 8, 16, 15, 30);

  it("a daily report is that one day", () => {
    expect(reportWindow("day", wednesday)).toEqual({
      dateFrom: "2026-09-16",
      dateTo: "2026-09-16",
    });
  });

  it("a weekly report starts on Monday", () => {
    expect(reportWindow("week", wednesday).dateFrom).toBe("2026-09-14");
  });

  it("a Sunday belongs to the week that started six days earlier", () => {
    // The off-by-one that a `getDay()`-based week start invites: JS counts
    // Sunday as 0, so a naive subtraction puts Sunday at the START of a week.
    const sunday = new Date(2026, 8, 20, 9, 0);
    expect(reportWindow("week", sunday).dateFrom).toBe("2026-09-14");
  });

  it("a monthly report starts on the first", () => {
    expect(reportWindow("month", wednesday).dateFrom).toBe("2026-09-01");
  });

  it("a yearly report starts on 1 January", () => {
    expect(reportWindow("year", wednesday).dateFrom).toBe("2026-01-01");
  });

  it("never runs past the reference day", () => {
    for (const period of ["day", "week", "month", "year"] as const) {
      expect(reportWindow(period, wednesday).dateTo).toBe("2026-09-16");
    }
  });
});

describe("REPORT_GRANULARITY", () => {
  it("charts each period one level finer than itself", () => {
    // A yearly report bucketed by year would be a single point.
    expect(REPORT_GRANULARITY).toEqual({
      day: "hour",
      week: "day",
      month: "day",
      year: "month",
    });
  });
});
