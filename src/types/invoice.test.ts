import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TYPES,
  EDITOR_DOCUMENT_TYPES,
  MANUAL_ORDER_DOC_TYPE,
  getDocumentTypeInfo,
  isManualOrderDocType,
} from "./invoice";

describe("editor document types", () => {
  // The Hacienda codes are literal types, so `d.code === 'PM'` is a compile
  // error rather than a runtime `false` — widen to string to assert it at
  // runtime too, which is what protects a code added later.
  const haciendaCodes: string[] = DOCUMENT_TYPES.map((d) => d.code);
  const editorCodes: string[] = EDITOR_DOCUMENT_TYPES.map((d) => d.code);

  it("keeps the manual order out of the Hacienda catalog", () => {
    expect(haciendaCodes).not.toContain(MANUAL_ORDER_DOC_TYPE);
    expect(editorCodes).toContain(MANUAL_ORDER_DOC_TYPE);
  });

  it("never collides with a Hacienda numeric code", () => {
    expect(MANUAL_ORDER_DOC_TYPE).not.toMatch(/^\d+$/);
    expect(haciendaCodes.every((code) => /^\d{2}$/.test(code))).toBe(true);
  });

  it("resolves both Hacienda and internal codes for tab rendering", () => {
    expect(getDocumentTypeInfo("01")?.short).toBe("FE");
    expect(getDocumentTypeInfo(MANUAL_ORDER_DOC_TYPE)?.short).toBe("PM");
    expect(getDocumentTypeInfo("zz")).toBeUndefined();
  });

  it("narrows only the manual-order code", () => {
    expect(isManualOrderDocType(MANUAL_ORDER_DOC_TYPE)).toBe(true);
    expect(isManualOrderDocType("01")).toBe(false);
    expect(isManualOrderDocType(undefined)).toBe(false);
  });

  it("gates the manual order on the orders submodule, not on documents", () => {
    const manual = EDITOR_DOCUMENT_TYPES.find((d) => d.code === MANUAL_ORDER_DOC_TYPE);
    expect(manual?.permSub).toBe("orders");
  });
});
