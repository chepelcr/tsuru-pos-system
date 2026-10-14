import { describe, it, expect } from "vitest";
import { rawPartyPayload } from "./partyNumbers";

describe("party API payloads", () => {
  it("removes display masks without mutating the form", () => {
    const form = { identification: { code: "01", number: "1-1234-0567" }, phone: { number: "8888-7777", area_code: "(01)" } };
    const payload = rawPartyPayload(form);
    expect(payload.identification.number).toBe("112340567");
    expect(payload.phone.number).toBe("88887777");
    expect(payload.phone.area_code).toBe("01");
    expect(form.phone.number).toBe("8888-7777");
    expect(form.identification.number).toBe("1-1234-0567");
  });
  it("preserves foreign identifiers and leading zeroes", () => {
    expect(rawPartyPayload({ identification: { code: "05", number: "AB-012345" } }).identification.number).toBe("AB-012345");
    expect(rawPartyPayload({ identification: { code: "04", number: "0123 456789" } }).identification.number).toBe("0123456789");
  });
});
