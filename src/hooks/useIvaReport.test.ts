import { describe, expect, it } from "vitest";
import {
  currentIvaPeriod,
  ivaDaysToDeadline,
  ivaDueDate,
  ivaPeriodKey,
  lastClosedIvaPeriod,
} from "./useIvaReport";

describe("IVA period helpers", () => {
  it("zero-pads the month in the period key", () => {
    expect(ivaPeriodKey(2026, 3)).toBe("2026-03");
    expect(ivaPeriodKey(2026, 12)).toBe("2026-12");
  });

  it("derives the current and last-closed periods", () => {
    const march = new Date(2026, 2, 9);
    expect(currentIvaPeriod(march)).toBe("2026-03");
    expect(lastClosedIvaPeriod(march)).toBe("2026-02");
  });

  it("rolls the last-closed period back across the year boundary", () => {
    expect(lastClosedIvaPeriod(new Date(2026, 0, 4))).toBe("2025-12");
  });

  it("puts the due date on day 15 of the following month", () => {
    const due = ivaDueDate("2026-02");
    expect(due?.getFullYear()).toBe(2026);
    expect(due?.getMonth()).toBe(2); // March, 0-indexed
    expect(due?.getDate()).toBe(15);
  });

  it("rolls the due date into the next year for a December period", () => {
    const due = ivaDueDate("2025-12");
    expect(due?.getFullYear()).toBe(2026);
    expect(due?.getMonth()).toBe(0);
  });

  it("counts days to the deadline and goes negative once it passes", () => {
    expect(ivaDaysToDeadline("2026-02", new Date(2026, 2, 10))).toBe(5);
    expect(ivaDaysToDeadline("2026-02", new Date(2026, 2, 15))).toBe(0);
    expect(ivaDaysToDeadline("2026-02", new Date(2026, 2, 18))).toBe(-3);
  });

  it("returns null for an unparseable period", () => {
    expect(ivaDueDate("not-a-period")).toBeNull();
    expect(ivaDaysToDeadline("not-a-period")).toBeNull();
  });
});
