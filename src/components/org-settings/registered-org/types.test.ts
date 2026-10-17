import { describe, expect, it } from "vitest";
import { EMPTY_FISCAL_FORM, emptyHaciendaInfo, fiscalPhoneCountryIso, toPayload } from "./types";

describe("fiscal setup field mapping", () => {
  it("normalizes the legacy Costa Rica dial prefix to the country ISO key", () => {
    expect(EMPTY_FISCAL_FORM.phoneCountryCode).toBe("188");
    expect(fiscalPhoneCountryIso("506")).toBe("188");
    expect(fiscalPhoneCountryIso("+506")).toBe("188");
    expect(fiscalPhoneCountryIso("840")).toBe("840");
    expect(toPayload({ ...EMPTY_FISCAL_FORM, phoneCountryCode: "506", phoneNumber: "8888-8888", email: " billing@example.com " })).toMatchObject({ phone: { country_code: "188", number: "88888888" }, email: "billing@example.com" });
  });

  it("clears lookup-derived fields without discarding contact or residence edits", () => {
    const reset = { ...EMPTY_FISCAL_FORM, name: "Old name", email: "billing@example.com", address: "Saved draft address", ...emptyHaciendaInfo() };
    expect(reset).toMatchObject({ name: "", regimeCode: "", activities: [], email: "billing@example.com", address: "Saved draft address" });
  });
});
