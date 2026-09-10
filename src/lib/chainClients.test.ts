import { describe, it, expect } from "vitest";
import {
  chainClientFor,
  isChainClient,
  CHAIN_CLIENTS,
  ChainClientId,
} from "./chainClients";

describe("Chain clients are matched by identification, not by name", () => {
  it("recognises Walmart by its cédula jurídica", () => {
    expect(chainClientFor("3102007223")?.card).toBe("walmart");
  });

  it.each([
    "3-102-007223",
    "3 102 007223",
    " 3102007223 ",
    "3.102.007223",
  ])("tolerates the formatting variant %s", (formatted) => {
    // The same taxpayer is written a dozen ways; only the digits identify it.
    expect(chainClientFor(formatted)?.identification).toBe(ChainClientId.WALMART);
  });

  it("does not match an ordinary client", () => {
    expect(chainClientFor("116640506")).toBeNull();
    expect(isChainClient("116640506")).toBe(false);
  });

  it("treats absent or empty identification as ordinary", () => {
    expect(chainClientFor(null)).toBeNull();
    expect(chainClientFor(undefined)).toBeNull();
    expect(chainClientFor("")).toBeNull();
    expect(chainClientFor("   ")).toBeNull();
  });

  it("every registered chain has a unique identification", () => {
    const ids = CHAIN_CLIENTS.map((c) => c.identification);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every identification is digits only, so lookups cannot miss", () => {
    for (const c of CHAIN_CLIENTS) {
      expect(c.identification).toMatch(/^\d+$/);
    }
  });
});
