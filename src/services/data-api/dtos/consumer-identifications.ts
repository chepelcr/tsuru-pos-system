export interface TaxpayerIdentification {
  number: string;
  type: string | null;
}

export interface TaxpayerRegime {
  code: string | null;
  description: string | null;
}

export interface TaxpayerSituation {
  is_debtor: boolean;
  is_non_compliant: boolean;
  status: string | null;
  tax_administration: string | null;
}

export interface TaxpayerActivity {
  status: string | null;
  type: string | null;
  code: string;
  description: string | null;
}

export interface TaxpayerResponse {
  name: string;
  identification: TaxpayerIdentification;
  regime: TaxpayerRegime;
  situation: TaxpayerSituation;
  activities: TaxpayerActivity[];
  nationality: object | null;
}

export interface GetTaxpayerParams {
  iso_code: string;
  identification: string;
}
