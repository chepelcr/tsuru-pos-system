/**
 * The document-version race.
 *
 * The Hacienda catalogs take `document_version_id` as a REQUIRED query
 * parameter — without it the API answers 422 — and the version is itself
 * fetched asynchronously, then pushed into the client from an effect. A catalog
 * request issued before that effect ran used to omit the parameter silently.
 *
 * Because the query client sets `retry: false` globally, the resulting 422 was
 * permanent for the life of the page, and anything gated on a catalog never
 * resolved: the product drawer sat on "Cargando información…" forever. It only
 * reproduced on a cold cache, which is why it looked intermittent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

// `buildDataApiUrl` and `dataApiFetch` are module-local to the client, so the
// seam to mock is the global fetch plus Amplify's token lookup.
vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => "t" } } }),
}));

vi.stubGlobal("fetch", (url: string) => {
  fetchMock(url);
  return Promise.resolve({
    ok: true,
    json: async () => [],
  } as unknown as Response);
});

/** The URL of the nth request. */
const urlOf = (n = 0) => String(fetchMock.mock.calls[n][0]);

async function freshClient() {
  vi.resetModules();
  const mod = await import("./client");
  return mod.dataApiClient;
}

describe("document_version_id is never silently omitted", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("waits for the version instead of firing without it", async () => {
    const client = await freshClient();

    // The catalog call starts BEFORE the version is known — the race.
    const inFlight = client.getAllTaxes({ iso_code: "188" });

    // Nothing has gone out yet: the request is parked, not sent parameterless.
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();

    // The provider's effect lands.
    client.setDocumentVersionId(1);
    await inFlight;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf()).toContain("document_version_id=1");
  });

  it("does not release on the provider's initial undefined", async () => {
    const client = await freshClient();
    const inFlight = client.getAllTaxRates({ iso_code: "188" });

    // `DocumentVersionProvider` runs its effect on first render too, before its
    // own fetch resolves. Releasing on that would reopen the race.
    client.setDocumentVersionId(undefined);
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();

    client.setDocumentVersionId(1);
    await inFlight;
    expect(urlOf()).toContain("document_version_id=1");
  });

  it("goes straight out once the version is known", async () => {
    const client = await freshClient();
    client.setDocumentVersionId(4);
    await client.getAllTaxes({ iso_code: "188" });
    expect(urlOf()).toContain("document_version_id=4");
  });

  it("lets an explicit version win over the ambient one", async () => {
    const client = await freshClient();
    client.setDocumentVersionId(1);
    await client.getAllTaxes({ iso_code: "188", document_version_id: 9 } as never);
    expect(urlOf()).toContain("document_version_id=9");
  });

  it("never leaks the internal marker into the query string", async () => {
    const client = await freshClient();
    client.setDocumentVersionId(1);
    await client.getAllTaxes({ iso_code: "188" });
    expect(urlOf()).not.toContain("needsDocumentVersion");
  });

  it("does not make endpoints that need no version wait", async () => {
    // `/products/all` takes no document version, so it must not be parked
    // behind one that may never arrive.
    const client = await freshClient();
    await client.getAllProductTypes();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf()).not.toContain("document_version_id");
  });
});
