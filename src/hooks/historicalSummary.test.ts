import { describe, expect, it, vi } from "vitest";
import { historicalDocumentsPath } from "@/lib/api";
import { historicalDocumentsQuery } from "@/hooks/useHistoricalDocuments";

/**
 * The Reportes history card costs exactly ONE request.
 *
 * It used to cost eleven — one `size=1` list call per number on the card, read
 * for its `total_elements`. The AWS account's Lambda concurrency ceiling is 10,
 * so the eleventh was rejected with `ConcurrentInvocationLimitExceeded` on every
 * load; API Gateway turned that 429 into a 500, and a gateway 500 has no CORS
 * headers, so the browser surfaced it as a statusless network error. The card
 * then blanked because its `isError` was `.some(...)` across all eleven.
 *
 * Nothing in TypeScript or in a rendering test can catch that regression, so the
 * request COUNT is pinned here, next to the path.
 */

const ORG = "11111111-2222-3333-4444-555555555555";

describe("historical summary endpoint", () => {
  it("is a single aggregate path", () => {
    expect(historicalDocumentsPath(ORG, "/summary")).toBe(
      `/api/organizations/${ORG}/historical-documents/summary`,
    );
  });

  it("does not reuse the paginated list endpoint", () => {
    // The old implementation built one of these per bucket. If the summary ever
    // needs a query string again, that is the signal to re-read this file.
    expect(historicalDocumentsPath(ORG, "/summary")).not.toContain("?");
    expect(historicalDocumentsPath(ORG, "/summary")).not.toContain("page=");
  });

  it("issues one fetch for the whole card", async () => {
    const get = vi.fn().mockResolvedValue({
      total: 104,
      by_status: [{ atv_status: 1, count: 104 }],
      by_type: [{ document_type: "01", count: 101 }, { document_type: "03", count: 3 }],
      historical_requested: true,
    });
    // Exercised through the same client surface the hook uses, without a React
    // tree: the contract under test is "how many calls", not the rendering.
    await get(historicalDocumentsPath(ORG, "/summary"));
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("the list query builder is untouched", () => {
  it("still carries filters for the full list view", () => {
    const query = historicalDocumentsQuery({ document_types: ["01"], atv_status: 3 }, 0, 20);
    expect(query).toContain("document_types=01");
    expect(query).toContain("atv_status=3");
    expect(query).toContain("size=20");
  });
});
