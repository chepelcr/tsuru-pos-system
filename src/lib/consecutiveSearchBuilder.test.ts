import { describe, expect, it } from "vitest";
import {
  ConsecutiveSearchFilter,
  buildConsecutiveSearchString,
  hasActiveConsecutiveFilters,
  parseConsecutiveSearchString,
} from "./consecutiveSearchBuilder";

describe("consecutiveSearchBuilder", () => {
  it("builds the platform search DSL in enum order", () => {
    expect(
      buildConsecutiveSearchString({
        [ConsecutiveSearchFilter.DocumentTypeCode]: "01",
        [ConsecutiveSearchFilter.BranchId]: "b-1",
        [ConsecutiveSearchFilter.TerminalId]: "t-1",
        sort: { field: "updated_on", direction: "desc" },
      }),
    ).toBe("branch_id:b-1,terminal_id:t-1,document_type_code:01,orderBy<updated_on");
  });

  it("omits empty filters", () => {
    expect(buildConsecutiveSearchString({ [ConsecutiveSearchFilter.BranchId]: "" })).toBe("");
  });

  it("keeps the zero-padded document-type code as a string", () => {
    const parsed = parseConsecutiveSearchString("document_type_code:04");
    expect(parsed[ConsecutiveSearchFilter.DocumentTypeCode]).toBe("04");
  });

  it("round-trips", () => {
    const filters = {
      [ConsecutiveSearchFilter.BranchId]: "b-1",
      [ConsecutiveSearchFilter.TerminalId]: "t-1",
      sort: { field: "current_number" as const, direction: "asc" as const },
    };
    expect(parseConsecutiveSearchString(buildConsecutiveSearchString(filters))).toEqual(filters);
  });

  it("drops unknown fields and unsortable orderBy", () => {
    expect(parseConsecutiveSearchString("foo:bar,orderBy>created_by,terminal_id:t")).toEqual({
      [ConsecutiveSearchFilter.TerminalId]: "t",
    });
  });

  it("cannot inject extra tokens through a value", () => {
    expect(
      buildConsecutiveSearchString({ [ConsecutiveSearchFilter.BranchId]: "x,terminal_id:y" }),
    ).toBe("branch_id:xterminal_idy");
  });

  it("reports whether any filter is active (sort alone is not a filter)", () => {
    expect(hasActiveConsecutiveFilters({ sort: { field: "updated_on", direction: "asc" } })).toBe(false);
    expect(hasActiveConsecutiveFilters({ [ConsecutiveSearchFilter.TerminalId]: "t" })).toBe(true);
  });
});
