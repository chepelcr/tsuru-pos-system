import { describe, expect, it } from "vitest";
import { crossAppOrgPath, documentsOrgPath } from "@/lib/api";

/**
 * The dashboard panel URLs, pinned.
 *
 * These exist because a wrong path here is invisible to TypeScript and to every
 * other test: the call compiles, the hook runs, and the request 404s at runtime
 * in a panel that already knows how to render an error. That happened while
 * building this — the document panels were first written with `salesOrgPath`,
 * which appends to `/sales`, producing `/sales/documents/summary` instead of
 * `/documents/summary`.
 *
 * Asserted against the literal strings the backends actually serve, taken from
 * the route definitions rather than re-derived from the builders:
 *   store-be  app/controllers/dashboard_controller.py  ORG + "/sales-summary" …
 *   sales-be  app/sales-api/src/controllers/document_metrics_controller.py
 */

const ORG = "11111111-2222-3333-4444-555555555555";

describe("order panel paths (store-be)", () => {
  it.each([
    ["sales-summary", `/api/organizations/${ORG}/dashboard/sales-summary`],
    ["order-status", `/api/organizations/${ORG}/dashboard/order-status`],
    ["top-products", `/api/organizations/${ORG}/dashboard/top-products`],
    ["sales-trend", `/api/organizations/${ORG}/dashboard/sales-trend`],
    ["session-sales", `/api/organizations/${ORG}/dashboard/session-sales`],
    ["stations", `/api/organizations/${ORG}/dashboard/stations`],
  ])("%s", (panel, expected) => {
    expect(crossAppOrgPath(ORG, `/dashboard/${panel}`)).toBe(expected);
  });
});

describe("document panel paths (sales-be)", () => {
  it.each([
    ["summary", `/api/organizations/${ORG}/documents/summary`],
    ["status", `/api/organizations/${ORG}/documents/status`],
    ["top-products", `/api/organizations/${ORG}/documents/top-products`],
    ["trend", `/api/organizations/${ORG}/documents/trend`],
  ])("%s", (panel, expected) => {
    expect(documentsOrgPath(ORG, `/${panel}`)).toBe(expected);
  });

  it("sits beside /sales, not under it", () => {
    // The mistake this file exists to prevent.
    expect(documentsOrgPath(ORG, "/summary")).not.toContain("/sales/");
  });
});
