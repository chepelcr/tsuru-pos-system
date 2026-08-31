import { beforeEach, describe, expect, it } from "vitest";
import { rememberFiscalMode, rememberedFiscalMode } from "./useFiscalMode";

describe("remembered fiscal mode", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a mode per organization", () => {
    rememberFiscalMode("org-1", "orders-only");
    rememberFiscalMode("org-2", "electronic");

    expect(rememberedFiscalMode("org-1")).toBe("orders-only");
    expect(rememberedFiscalMode("org-2")).toBe("electronic");
  });

  it("returns null for an org never resolved on this device", () => {
    expect(rememberedFiscalMode("org-unknown")).toBeNull();
    expect(rememberedFiscalMode(undefined)).toBeNull();
  });

  it("ignores a stored value that is not a mode", () => {
    // An older build wrote a boolean under a different key; a stray value must
    // not be read back as a mode.
    localStorage.setItem("pos-fiscal-mode:org-1", "true");
    expect(rememberedFiscalMode("org-1")).toBeNull();
  });

  it("stores nothing that could identify the taxpayer", () => {
    rememberFiscalMode("org-1", "electronic");
    const stored = localStorage.getItem("pos-fiscal-mode:org-1");
    expect(stored).toBe("electronic");
  });
});
