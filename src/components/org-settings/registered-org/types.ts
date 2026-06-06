import type {
  RegisteredOrganization,
  RegisteredOrganizationPayload,
  RegisteredOrgActivity,
} from "@/types/registeredOrganization";

/**
 * Internal form state for the fiscal-info stepper + drawer. Mirrors the payload
 * shape but keeps the identification number as raw digits (display-only masking
 * happens in the input via `formatIdentification`).
 *
 * `fromHacienda` flags which sections came back from the taxpayer lookup so we
 * can lock those fields to read-only without losing the underlying value.
 */
export interface FiscalInfoFormState {
  name: string;
  nationality: string;            // ISO numeric (locked to "188" for now)

  idCode: string;                 // "01" | "02" | "03" | "04"
  idNumber: string;               // raw digits — display masked via formatIdentification

  regimeCode: string;
  regimeDescription: string;

  situationStatus: string;
  isDebtor: boolean;
  isNonCompliant: boolean;
  taxAdministration: string;

  email: string;
  phoneCountryCode: string;
  phoneAreaCode: string;
  phoneNumber: string;
  phoneDescription: string;

  residenceCountryCode: string;
  stateId: number | null;
  countyId: number | null;
  districtId: number | null;
  neighborhoodId: number | null;
  address: string;

  activities: RegisteredOrgActivity[];
  /** Subset of activity codes the user wants to persist. */
  selectedActivityCodes: Set<string>;

  /** Which sections were pre-filled by the Hacienda lookup (lock read-only). */
  fromHacienda: {
    name: boolean;
    regime: boolean;
    situation: boolean;
    activities: boolean;
  };
}

export const EMPTY_FISCAL_FORM: FiscalInfoFormState = {
  name: "",
  nationality: "188",

  idCode: "02",
  idNumber: "",

  regimeCode: "",
  regimeDescription: "",

  situationStatus: "",
  isDebtor: false,
  isNonCompliant: false,
  taxAdministration: "",

  email: "",
  phoneCountryCode: "506",
  phoneAreaCode: "",
  phoneNumber: "",
  phoneDescription: "",

  residenceCountryCode: "188",
  stateId: null,
  countyId: null,
  districtId: null,
  neighborhoodId: null,
  address: "",

  activities: [],
  selectedActivityCodes: new Set<string>(),

  fromHacienda: {
    name: false,
    regime: false,
    situation: false,
    activities: false,
  },
};

/** Hydrate the form state from a persisted RegisteredOrganization. */
export function fromRegisteredOrganization(reg: RegisteredOrganization): FiscalInfoFormState {
  const activities = reg.activities ?? [];
  return {
    name: reg.name ?? "",
    nationality: reg.nationality ?? "188",

    idCode: reg.identification?.code ?? "02",
    idNumber: reg.identification?.number ?? "",

    regimeCode: reg.regime?.code ?? "",
    regimeDescription: reg.regime?.description ?? "",

    situationStatus: reg.situation?.status ?? "",
    isDebtor: reg.situation?.is_debtor ?? false,
    isNonCompliant: reg.situation?.is_non_compliant ?? false,
    taxAdministration: reg.situation?.tax_administration ?? "",

    email: reg.email ?? "",
    phoneCountryCode: reg.phone?.country_code ?? "506",
    phoneAreaCode: reg.phone?.area_code ?? "",
    phoneNumber: reg.phone?.number ?? "",
    phoneDescription: reg.phone?.description ?? "",

    residenceCountryCode: reg.residence?.country_code ?? "188",
    stateId: reg.residence?.state_id ?? null,
    countyId: reg.residence?.county_id ?? null,
    districtId: reg.residence?.district_id ?? null,
    neighborhoodId: reg.residence?.neighborhood_id ?? null,
    address: reg.residence?.address ?? "",

    activities,
    selectedActivityCodes: new Set(activities.map((a) => a.code)),

    fromHacienda: {
      name: false,
      regime: false,
      situation: false,
      activities: false,
    },
  };
}

/** Convert the form state into the BE payload (no masking on the wire). */
export function toPayload(form: FiscalInfoFormState): RegisteredOrganizationPayload {
  // We persist every activity that came back from Hacienda — the user sees
  // them on the activities step but doesn't toggle a subset. The
  // `selectedActivityCodes` field is kept on the form state for backwards
  // compatibility with the read flow but is no longer consulted here.
  return {
    name: form.name.trim(),
    nationality: form.nationality || "188",
    identification: {
      code: form.idCode,
      number: form.idNumber.replace(/\D+/g, ""),
    },
    regime: form.regimeCode || form.regimeDescription
      ? {
          code: form.regimeCode || null,
          description: form.regimeDescription || null,
        }
      : null,
    situation: form.situationStatus || form.taxAdministration || form.isDebtor || form.isNonCompliant
      ? {
          status: form.situationStatus || null,
          is_debtor: form.isDebtor,
          is_non_compliant: form.isNonCompliant,
          tax_administration: form.taxAdministration || null,
        }
      : null,
    email: form.email || null,
    phone: form.phoneNumber || form.phoneCountryCode || form.phoneAreaCode || form.phoneDescription
      ? {
          country_code: form.phoneCountryCode || null,
          area_code: form.phoneAreaCode || null,
          number: form.phoneNumber || null,
          description: form.phoneDescription || null,
        }
      : null,
    residence: form.address || form.stateId || form.countyId || form.districtId || form.neighborhoodId
      ? {
          country_code: form.residenceCountryCode || "188",
          state_id: form.stateId,
          county_id: form.countyId,
          district_id: form.districtId,
          neighborhood_id: form.neighborhoodId,
          address: form.address || null,
        }
      : null,
    activities: form.activities,
    status: 1,
  };
}
