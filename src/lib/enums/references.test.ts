/**
 * The reference rules, mirrored from sales-be.
 *
 * These exist because `ReferenceCode` in sales-be disagreed with the data-api
 * catalog on eight of fourteen codes (TSR-126) and nothing caught it. The same
 * failure is possible here: the POS fills its dropdowns from the catalog at
 * runtime, but these constants decide which of those options it is allowed to
 * offer, so a constant that drifts silently re-opens an illegal combination.
 *
 * Expectations are the catalog's and the analysis doc's, written longhand.
 */
import { describe, expect, it } from "vitest";
import {
  DOC_TYPES_REQUIRING_REFERENCE,
  LOCAL_EXEMPTION_CODES,
  MAX_REFERENCES,
  NC_ND_ONLY_EXEMPTION_CODES,
  REFERENCE_CODE_DOC_TYPES,
  REFERENCE_TYPE_DOC_TYPES,
  ReferenceActionCode,
  ReferenceDocType,
  ExemptionCode,
} from "./hacienda";

/** `catalogs.referenceCodes` — 12 rows, plus doc-only 17. */
const CATALOG_REFERENCE_CODES = [
  "01", "02", "04", "05", "06", "07", "08", "09", "10", "11", "12", "99",
];

/** `catalogs.referenceTypes` — 19 rows. */
const CATALOG_REFERENCE_TYPES = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "99",
];

describe("reference action codes match the catalog", () => {
  it("covers every catalog row", () => {
    const values = Object.values(ReferenceActionCode) as string[];
    for (const code of CATALOG_REFERENCE_CODES) {
      expect(values, `catalog code ${code} must be in the enum`).toContain(code);
    }
  });

  it("invents nothing beyond the doc-only code 17", () => {
    // "17=Pago a comprobante (Solo REP)" is in the analysis doc and absent from
    // the catalog. Omitting it made a REP impossible to file.
    const extra = (Object.values(ReferenceActionCode) as string[]).filter(
      (v) => !CATALOG_REFERENCE_CODES.includes(v),
    );
    expect(extra).toEqual(["17"]);
  });

  it("does not resurrect codes 03 or 13, which no catalog row defines", () => {
    const values = Object.values(ReferenceActionCode) as string[];
    expect(values).not.toContain("03");
    expect(values).not.toContain("13");
  });

  it("names 06 as a merchandise return, not a contingency substitution", () => {
    // The old sales-be enum called 06 SUBSTITUTE_CONTINGENCY. A cashier picking
    // "substitutes a contingency receipt" would have filed "merchandise return".
    expect(ReferenceActionCode.MERCHANDISE_RETURN).toBe("06");
    expect(ReferenceActionCode.SUBSTITUTE_PROVISIONAL_CONTINGENCY).toBe("05");
  });

  it("names 09 and 10 as the financial note codes", () => {
    expect(ReferenceActionCode.FINANCIAL_CREDIT_NOTE).toBe("09");
    expect(ReferenceActionCode.FINANCIAL_DEBIT_NOTE).toBe("10");
  });
});

describe("reference document types match the catalog", () => {
  it("covers every catalog row, including 99", () => {
    const values = Object.values(ReferenceDocType) as string[];
    for (const code of CATALOG_REFERENCE_TYPES) {
      expect(values, `catalog type ${code} must be in the enum`).toContain(code);
    }
  });

  it("keeps the doc-only REP type so a REP is representable", () => {
    const extra = (Object.values(ReferenceDocType) as string[]).filter(
      (v) => !CATALOG_REFERENCE_TYPES.includes(v),
    );
    expect(extra).toEqual(["20"]);
  });
});

describe("per-document-type restrictions", () => {
  it("restricts code 17 to a REP", () => {
    expect(REFERENCE_CODE_DOC_TYPES[ReferenceActionCode.PAYMENT_ON_DOCUMENT]).toEqual(["10"]);
  });

  it("restricts merchandise return to credit and debit notes", () => {
    expect(REFERENCE_CODE_DOC_TYPES[ReferenceActionCode.MERCHANDISE_RETURN]).toEqual(["02", "03"]);
  });

  it("restricts the non-domiciled-supplier type to an FEC", () => {
    expect(REFERENCE_TYPE_DOC_TYPES[ReferenceDocType.NON_DOMICILED_SUPPLIER]).toEqual(["08"]);
  });

  it("leaves the substitution codes unrestricted, so a Factura may use them", () => {
    // This is the whole point of ungating references: 05/07/08 describe a
    // Factura replacing an earlier comprobante.
    for (const code of [
      ReferenceActionCode.SUBSTITUTE_PROVISIONAL_CONTINGENCY,
      ReferenceActionCode.SUBSTITUTE_ELECTRONIC_DOC,
      ReferenceActionCode.ENDORSED_INVOICE,
      ReferenceActionCode.REFERENCE_OTHER_DOC,
    ]) {
      expect(REFERENCE_CODE_DOC_TYPES[code]).toBeUndefined();
    }
  });
});

describe("when references are mandatory", () => {
  it("always for a debit note, a credit note and a REP", () => {
    expect([...DOC_TYPES_REQUIRING_REFERENCE].sort()).toEqual(["02", "03", "10"]);
  });

  it("not for an ordinary Factura or Tiquete", () => {
    expect(DOC_TYPES_REQUIRING_REFERENCE).not.toContain("01");
    expect(DOC_TYPES_REQUIRING_REFERENCE).not.toContain("04");
  });

  it("identifies the Nota 10.1 LOCAL authorizations that pull one in", () => {
    // "Obligatorio en … FE con exoneraciones locales."
    expect([...LOCAL_EXEMPTION_CODES].sort()).toEqual(["04", "11"]);
    expect(LOCAL_EXEMPTION_CODES).toContain(ExemptionCode.DGH_GENERIC_LOCAL_EXEMPTION);
    expect(LOCAL_EXEMPTION_CODES).toContain(ExemptionCode.DGH_SPECIFIC_LOCAL_EXEMPTION);
  });

  it("identifies the NC/ND-only exemption codes", () => {
    expect([...NC_ND_ONLY_EXEMPTION_CODES].sort()).toEqual(["01", "05", "06", "07"]);
  });
});

describe("cardinality", () => {
  it("caps references at 10 per document", () => {
    // `"Repeticiones": "1 a 10"`.
    expect(MAX_REFERENCES).toBe(10);
  });
});
