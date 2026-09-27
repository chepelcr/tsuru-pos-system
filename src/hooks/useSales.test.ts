import { describe, expect, it } from "vitest";
import { toWireSearch } from "./useSales";

/**
 * sales-api's `DocumentSearchDTO` ignores unknown keys, so a misnamed filter
 * silently returns everything. These pin the documents filters to its fields.
 */
describe("toWireSearch", () => {
  it("sends the date range as start_date / end_date", () => {
    expect(toWireSearch({ start_date: "2026-09-01", end_date: "2026-09-11" } as never)).toEqual({
      start_date: "2026-09-01",
      end_date: "2026-09-11",
    });
  });

  it("reads a single '=' date as that whole day", () => {
    expect(toWireSearch({ dateMode: "single", dateOp: "=", dateValue: "2026-09-11" } as never)).toEqual({
      start_date: "2026-09-11",
      end_date: "2026-09-11",
    });
  });

  it("sends the total as total_min / total_max", () => {
    expect(toWireSearch({ totalMode: "single", totalOp: ">", totalValue: 5000 } as never)).toEqual({ total_min: 5000 });
    expect(toWireSearch({ totalMin: 1000, totalMax: 9000 } as never)).toEqual({ total_min: 1000, total_max: 9000 });
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
