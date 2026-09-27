import { describe, expect, it } from "vitest";
import { plainSearchTerm, plainStatusFilter } from "@/services/offlineCatalog";
import { buildClientSearch } from "./clientSearch";

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
      "(client_name:Pérez   SA,business_name:Pérez   SA,id_number:Pérez   SA)",
    );
  });

  it("is read back by the offline mirror", () => {
    const filter = buildClientSearch({ term: "juan", status: 1 });
    expect(plainSearchTerm(filter)).toBe("juan");
    expect(plainStatusFilter(filter)).toBe(1);
  });
});
