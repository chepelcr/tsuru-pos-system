import { describe, expect, it } from "vitest";
import { inferCustomerTypeFromIdCode } from "./ClientDrawerForm";
import { allowedIdCodes } from "@/lib/enums/identifications";
import { CustomerType } from "@/lib/enums/customerTypes";
import { CountryISO } from "@/lib/enums";

/**
 * The customer edit drawer used to exist twice, and the copies had drifted.
 * The detail page's copy seeded `customer_type` to a hardcoded 3 (persona
 * física) rather than inferring it from the identification code — which is
 * where the reported "the id does not load" came from, in four steps:
 *
 *   1. seed customer_type = 3
 *   2. allowedIdCodes(…, 3) excludes "02" (cédula jurídica)
 *   3. the form body resets the code to the first allowed one, AND blanks the
 *      number with it
 *   4. the number input renders empty, before the user has touched anything
 *
 * Every client auto-created from an order import has a cédula jurídica and no
 * `customer_type` on record, so this was the common case.
 */
describe("seeding the customer type from the identification", () => {
  it("reads a cédula jurídica as a company", () => {
    expect(inferCustomerTypeFromIdCode("02")).toBe(CustomerType.EMPRESA);
  });

  it("falls back to persona física for the other types", () => {
    for (const code of ["01", "03", "04", "05", undefined, null, ""]) {
      expect(inferCustomerTypeFromIdCode(code)).toBe(CustomerType.PERSONA_FISICA);
    }
  });

  it("keeps 02 selectable for the type it inferred — step 2 of the bug", () => {
    const inferred = inferCustomerTypeFromIdCode("02");
    expect(allowedIdCodes(CountryISO.COSTA_RICA, inferred)).toContain("02");
  });

  it("shows why the hardcoded 3 lost the id", () => {
    // The regression, stated directly: seeding persona física for a client
    // whose id IS a cédula jurídica filters that code out of the select.
    expect(
      allowedIdCodes(CountryISO.COSTA_RICA, CustomerType.PERSONA_FISICA),
    ).not.toContain("02");
  });
});
