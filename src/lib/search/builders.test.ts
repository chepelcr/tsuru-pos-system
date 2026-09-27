import { describe, expect, it } from "vitest";
import { plainSearchTerm, plainStatusFilter } from "@/services/offlineCatalog";
import { buildClientSearch } from "./builders";

/**
 * `GET /clients` silently drops any clause whose field it does not know, so a
 * malformed filter does not fail — it returns every client. The POS panel
 * (`clientName:*x*`) and the checkout picker (raw `x`) both did that. These pin
 * the one format the backend and the offline mirror both read.
 */
describe("buildClientSearch", () => {
  it("searches name, business name and identification as one OR group", () => {
    expect(buildClientSearch({ term: "juan", status: 1 })).toBe(
      "status:1,(client_name:juan,business_name:juan,id_number:juan)",
    );
  });

  it("uses only backend field names", () => {
    const fields = buildClientSearch({ term: "x", status: 1, customerType: 2, sort: ">client_name" })
      .replace(/[()]/g, "")
      .split(",")
      .map((c) => c.split(":")[0]);
    for (const f of fields) {
      expect(["status", "customer_type", "client_name", "business_name", "id_number", "orderBy>client_name"]).toContain(f);
    }
  });

  it("omits the term group when there is no term, and 'all' status", () => {
    expect(buildClientSearch({ term: "  ", status: "all" })).toBe("");
  });

  it("strips the grammar's own separators from the term", () => {
    expect(buildClientSearch({ term: "Pérez, (SA)" })).toBe(
      "(client_name:Pérez SA,business_name:Pérez SA,id_number:Pérez SA)",
    );
  });

  it("is read back by the offline mirror", () => {
    const filter = buildClientSearch({ term: "juan", status: 1 });
    expect(plainSearchTerm(filter)).toBe("juan");
    expect(plainStatusFilter(filter)).toBe(1);
  });
});

import {
  SEARCH_FIELDS,
  buildBranchSearch,
  buildDepartmentSearchString,
  buildFutureOrdersSearch,
  buildOrderSearchString,
  buildProductSearch,
  buildStoreSearchString,
} from "./builders";

/** The field of every clause (OR groups flattened, sort keyword skipped). */
function fieldsOf(search: string): string[] {
  return search
    .replace(/[()]/g, "")
    .split(",")
    .filter((c) => c && !c.startsWith("orderBy"))
    .map((c) => c.split(/[:<>]/)[0]);
}

/** Sort fields are snake_case too. */
function sortFieldOf(search: string): string | undefined {
  return search.split(",").find((c) => c.startsWith("orderBy"))?.slice("orderBy".length + 1);
}

describe("every builder speaks the backend's fields, snake_case only", () => {
  const cases: Array<[keyof typeof SEARCH_FIELDS, string]> = [
    ["clients", buildClientSearch({ term: "x", status: 1, customerType: 2, sort: ">client_name" })],
    ["products", buildProductSearch({ term: "x", status: 1, categoryId: "c", type: "program", price: { mode: "range", min: 1, max: 9 }, sort: ">name" })],
    ["branches", buildBranchSearch({ term: "x", status: 1, type: "store", sort: "<code" })],
    ["stores", buildStoreSearchString({ textSearch: "x", sortBy: "store_name", sortOrder: "asc" })],
    ["departments", buildDepartmentSearchString({ textSearch: "x", sortBy: "department_code" })],
    ["orders", buildOrderSearchString({ textSearch: "x", status: ["pending", "shipped"], startDate: "2026-09-01", endDate: "2026-09-30", creationStartDate: "2026-08-01", sortBy: "deliveryDate", sortOrder: "asc" })],
    ["orders", buildFutureOrdersSearch("x")],
  ];

  it.each(cases)("%s", (entity, search) => {
    const allowed: readonly string[] = SEARCH_FIELDS[entity];
    for (const field of fieldsOf(search)) {
      expect(allowed).toContain(field);
    }
    const sort = sortFieldOf(search);
    for (const f of [...fieldsOf(search), ...(sort ? [sort] : [])]) {
      expect(f).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("product search", () => {
  it("matches a partial name or an exact code, so a barcode finds its product", () => {
    expect(buildProductSearch({ term: "7441", status: 1 })).toBe("status:1,(name:*7441*,code:7441)");
  });
});

describe("order search", () => {
  it("excludes delivered and cancelled when no status is chosen", () => {
    expect(buildOrderSearchString({})).not.toMatch(/delivered|cancelled/);
  });

  it("sends ISO date ranges", () => {
    expect(buildOrderSearchString({ status: ["pending"], startDate: "2026-09-01", endDate: "2026-09-30" })).toBe(
      "order_status:pending,delivery_date:2026-09-01~2026-09-30",
    );
  });
});
