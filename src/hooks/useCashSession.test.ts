import { describe, expect, it } from "vitest";
import type { Assignment } from "@/types";
import { isAwaitingOpening, isOpenAssignment } from "./useCashSession";

const base = { assignment_id: "a-1", status: 1 } as Assignment;

describe("cash session gate", () => {
  it("blocks on the opening count while an active assignment is unopened", () => {
    expect(isAwaitingOpening({ ...base, opened_at: null })).toBe(true);
    expect(isOpenAssignment({ ...base, opened_at: null })).toBe(false);
  });

  it("is a live till once opened", () => {
    const opened = { ...base, opened_at: "2026-11-08T12:00:00Z", opening_cash: 20000 };
    expect(isAwaitingOpening(opened)).toBe(false);
    expect(isOpenAssignment(opened)).toBe(true);
  });

  it("is neither without an assignment or once it ended — sessions are optional", () => {
    expect(isAwaitingOpening(null)).toBe(false);
    expect(isOpenAssignment(undefined)).toBe(false);
    expect(isAwaitingOpening({ ...base, status: 2 } as Assignment)).toBe(false);
  });
});
