import { describe, expect, it } from "vitest";
import { formatIdentification } from "./identification";

describe("formatIdentification", () => {
  it("formats Costa Rican identity numbers when loaded as raw digits", () => {
    expect(formatIdentification("01", "102440077")).toBe("1-0244-0077");
    expect(formatIdentification("02", "3101123456")).toBe("3-101-123456");
  });

  it("does not add a second mask to an already formatted number", () => {
    expect(formatIdentification("01", "1-0244-0077")).toBe("1-0244-0077");
  });

  it("preserves unmasked and foreign identifiers", () => {
    expect(formatIdentification("03", "123-456789012")).toBe("123-456789012");
    expect(formatIdentification("05", "AB-012345")).toBe("AB-012345");
    expect(formatIdentification(undefined, "EXT-012345")).toBe("EXT-012345");
  });
});
