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

describe("chainClientFor with several partial identities", () => {
  it("matches on whichever identifier is present", () => {
    // The two routes into the checkout know different things about the same
    // customer: the POS picker has the catalog client's cédula, an imported
    // order has only what the spreadsheet carried. A single-argument lookup
    // works on one path and fails on the other.
    expect(chainClientFor(null, ChainClientId.WALMART)?.name).toBe("Walmart");
    expect(chainClientFor("", "   ", "3-102-007223")?.name).toBe("Walmart");
    expect(chainClientFor(undefined, null)).toBeNull();
  });

  it("does not match an ordinary client on any identifier", () => {
    expect(chainClientFor("116640506", "7441234567890")).toBeNull();
    expect(isChainClient("116640506", null)).toBe(false);
  });

  it("registered identifiers are all digits, so a lookup cannot miss", () => {
    // Both cédulas and GLNs are compared digits-only; a registry entry stored
    // with punctuation would never match anything.
    for (const chain of CHAIN_CLIENTS) {
      for (const identifier of chain.identifiers) {
        expect(identifier).toMatch(/^\d+$/);
      }
    }
  });

  it("every chain lists its cédula among its identifiers", () => {
    for (const chain of CHAIN_CLIENTS) {
      expect(chain.identifiers).toContain(chain.identification);
    }
  });
});
