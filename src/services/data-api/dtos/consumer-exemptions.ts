export interface ExemptionInstitution {
  code: string | null;
  name: string | null;
}

export interface ExemptionValidationResponse {
  authorization: string | null;
  document_number: string | null;
  percentage: number | null;
  valid_from: string | null;
  valid_until: string | null;
  identification: string | null;
  name: string | null;
  institution: ExemptionInstitution | null;
  status: string | null;
}

export interface ValidateExemptionParams {
  iso_code: string;
  authorization: string;
}
