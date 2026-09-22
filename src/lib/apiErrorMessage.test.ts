import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api";

/**
 * Only `message` used to be read, and FastAPI answers `detail` — so every 4xx
 * from a Python backend reached the user as the bare fallback "Request failed".
 * A 422 naming the exact field at fault looked identical to a network blip,
 * which is why the customer-save bug was opaque for as long as it was.
 */
describe("apiErrorMessage", () => {
  it("reads FastAPI's detail string", () => {
    expect(apiErrorMessage({ detail: "Client not found" })).toBe("Client not found");
  });

  it("reads an Express-style message", () => {
    expect(apiErrorMessage({ message: "Nope" })).toBe("Nope");
  });

  it("flattens a FastAPI validation error and keeps the field", () => {
    expect(
      apiErrorMessage({
        detail: [{ type: "missing", loc: ["body", "status"], msg: "Field required" }],
      }),
    ).toBe("status: Field required");
  });

  it("joins several field errors", () => {
    expect(
      apiErrorMessage({
        detail: [
          { loc: ["body", "email"], msg: "invalid" },
          { loc: ["body", "identification", "number"], msg: "too short" },
        ],
      }),
    ).toBe("email: invalid; identification.number: too short");
  });

  it("drops the leading 'body', which says nothing to a user", () => {
    expect(apiErrorMessage({ detail: [{ loc: ["body"], msg: "bad" }] })).toBe("bad");
  });

  it("returns undefined when there is nothing readable, so the caller falls back", () => {
    expect(apiErrorMessage(undefined)).toBeUndefined();
    expect(apiErrorMessage({})).toBeUndefined();
    expect(apiErrorMessage("nope")).toBeUndefined();
    expect(apiErrorMessage({ detail: [] })).toBeUndefined();
    expect(apiErrorMessage({ detail: [{ loc: ["body"] }] })).toBeUndefined();
  });
});

describe("standard service error details", () => {
  it("keeps the stable code, field and validation explanation", () => {
    expect(apiErrorMessage({
      message: "HACIENDA_VALIDATION", error: "Unprocessable Entity",
      details: [{ path: "activity_code", type: "domain_validation", message: "Activity is not registered.", code: "HACIENDA_ACTIVITY_NOT_REGISTERED" }],
    })).toBe("HACIENDA_VALIDATION\nactivity_code: Activity is not registered. (HACIENDA_ACTIVITY_NOT_REGISTERED)");
  });

  it("shows paths from older standard responses that omitted the explanation", () => {
    expect(apiErrorMessage({ message: "HACIENDA_VALIDATION", details: [{ path: "details[0].cabys", type: "domain_validation" }] }))
      .toBe("HACIENDA_VALIDATION\ndetails[0].cabys: domain_validation");
  });

  it("tolerates malformed entries and preserves array indexes", () => {
    expect(apiErrorMessage({ message: "COMMON_422", details: [null, "bad", {}, { path: "body.details.0.cabys", type: "missing" }] }))
      .toBe("COMMON_422\ndetails.0.cabys: missing");
    expect(apiErrorMessage({ detail: [{ loc: ["body", "details", 0, "cabys"], msg: "Required" }], error: "Unprocessable Entity" }))
      .toBe("details.0.cabys: Required");
  });
});
