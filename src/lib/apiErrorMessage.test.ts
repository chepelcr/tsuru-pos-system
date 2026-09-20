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
