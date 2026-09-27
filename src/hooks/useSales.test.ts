import { describe, expect, it } from "vitest";
import { toWireSearch } from "./useSales";

/**
 * sales-api's `DocumentSearchDTO` ignores unknown keys, so a misnamed filter
 * silently returns everything. `sale_date` and `total_amount` are ranges in the
 * platform grammar: `a~b`, `a~`, `~b`, or a single value.
 */
describe("toWireSearch", () => {
  it("sends the date range as sale_date a~b", () => {
    expect(toWireSearch({ start_date: "2026-09-01", end_date: "2026-09-11" } as never)).toEqual({
      sale_date: "2026-09-01~2026-09-11",
    });
    expect(toWireSearch({ start_date: "2026-09-01" } as never)).toEqual({ sale_date: "2026-09-01~" });
    expect(toWireSearch({ end_date: "2026-09-11" } as never)).toEqual({ sale_date: "~2026-09-11" });
  });

  it("sends a single date as that day, and >= / <= as open ranges", () => {
    expect(toWireSearch({ dateMode: "single", dateOp: "=", dateValue: "2026-09-11" } as never)).toEqual({ sale_date: "2026-09-11" });
    expect(toWireSearch({ dateMode: "single", dateOp: ">=", dateValue: "2026-09-11" } as never)).toEqual({ sale_date: "2026-09-11~" });
    expect(toWireSearch({ dateMode: "single", dateOp: "<=", dateValue: "2026-09-11" } as never)).toEqual({ sale_date: "~2026-09-11" });
  });

  it("sends the amount as total_amount a~b", () => {
    expect(toWireSearch({ totalMode: "single", totalOp: ">", totalValue: 5000 } as never)).toEqual({ total_amount: "5000~" });
    expect(toWireSearch({ totalMode: "single", totalOp: "=", totalValue: 750 } as never)).toEqual({ total_amount: "750" });
    expect(toWireSearch({ totalMin: 1000, totalMax: 9000 } as never)).toEqual({ total_amount: "1000~9000" });
  });

  it("sends the sort as {field: direction}", () => {
    expect(toWireSearch({ sort: "total_amount,asc" } as never)).toEqual({ sort: { total_amount: "asc" } });
  });

  it("uses snake_case keys only", () => {
    const wire = toWireSearch({
      searchTerm: "ana", sort: "sale_date,desc", start_date: "2026-01-01", totalMin: 1,
      branch_number: 1, terminal_number: 2, origin: "POS",
    } as never)!;
    for (const key of Object.keys(wire)) expect(key).toMatch(/^[a-z_]+$/);
  });
});
