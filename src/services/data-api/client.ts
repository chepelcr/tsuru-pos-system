import { fetchAuthSession } from "aws-amplify/auth";

const DATA_API_BASE = import.meta.env.VITE_DATA_API_URL || "https://data-api.tsuru.jcampos.dev";

function buildDataApiUrl(endpoint: string, params?: Record<string, any>): string {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(clean, DATA_API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }
  return url.toString();
}

async function dataApiFetch(url: string): Promise<Response> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || "Data API request failed");
  }
  return res;
}
import type {
  DocumentVersionResponse,
  DocumentVersionListResponse,
  GetDocumentVersionParams,
  GetAllDocumentVersionsParams,
  GetDocumentVersionByIdParams,
  CodeResponse,
  CodeListResponse,
  GetCodeParams,
  GetAllCodesParams,
  CustomerTypeResponse,
  CustomerTypeListResponse,
  GetAllCustomerTypesParams,
  GetCustomerTypeByIdParams,
  DiscountTypeResponse,
  DiscountTypeListResponse,
  GetDiscountTypeParams,
  GetAllDiscountTypesParams,
  DocumentTypeResponse,
  DocumentTypeListResponse,
  GetDocumentTypeParams,
  GetAllDocumentTypesParams,
  EconomicActivityResponse,
  EconomicActivityListResponse,
  GetEconomicActivityParams,
  GetAllEconomicActivitiesParams,
  ExemptionResponse,
  ExemptionListResponse,
  GetExemptionParams,
  GetAllExemptionsParams,
  ExemptionIssuingInstitutionResponse,
  ExemptionIssuingInstitutionListResponse,
  GetExemptionIssuingInstitutionParams,
  GetAllExemptionIssuingInstitutionsParams,
  FactoryTaxChargeResponse,
  FactoryTaxChargeListResponse,
  GetFactoryTaxChargeParams,
  GetAllFactoryTaxChargesParams,
  IdentificationResponse,
  IdentificationListResponse,
  GetIdentificationParams,
  GetAllIdentificationsParams,
  MeasurementUnitResponse,
  MeasurementUnitListResponse,
  GetMeasurementUnitParams,
  GetAllMeasurementUnitsParams,
  NationalTaxpayerCompanyResponse,
  NationalTaxpayerCompanyListResponse,
  GetNationalTaxpayerCompanyParams,
  GetAllNationalTaxpayerCompaniesParams,
  NationalTaxpayerSpecialFieldResponse,
  NationalTaxpayerSpecialFieldListResponse,
  GetNationalTaxpayerSpecialFieldParams,
  GetAllNationalTaxpayerSpecialFieldsParams,
  NotificationCodeResponse,
  NotificationCodeListResponse,
  GetNotificationCodeParams,
  GetAllNotificationCodesParams,
  OtherChargeResponse,
  OtherChargeListResponse,
  GetOtherChargeParams,
  GetAllOtherChargesParams,
  PaymentResponse,
  PaymentListResponse,
  GetPaymentParams,
  GetAllPaymentsParams,
  PharmaceuticalFormResponse,
  PharmaceuticalFormListResponse,
  GetPharmaceuticalFormParams,
  GetAllPharmaceuticalFormsParams,
  ProductTypeResponse,
  ProductTypeListResponse,
  GetProductTypeParams,
  GetAllProductTypesParams,
  ReferenceCodeResponse,
  ReferenceCodeListResponse,
  GetReferenceCodeParams,
  GetAllReferenceCodesParams,
  ReferenceResponse,
  ReferenceListResponse,
  GetReferenceParams,
  GetAllReferencesParams,
  RegimeResponse,
  RegimeListResponse,
  GetRegimeParams,
  GetAllRegimesParams,
  SaleConditionResponse,
  SaleConditionListResponse,
  GetSaleConditionParams,
  GetAllSaleConditionsParams,
  TaxAmountResponse,
  TaxAmountListResponse,
  GetTaxAmountParams,
  GetAllTaxAmountsParams,
  TaxConditionResponse,
  TaxConditionListResponse,
  GetTaxConditionParams,
  GetAllTaxConditionsParams,
  TaxFactorResponse,
  TaxFactorListResponse,
  GetTaxFactorParams,
  GetAllTaxFactorsParams,
  TaxRateCodeResponse,
  TaxRateCodeListResponse,
  GetTaxRateCodeParams,
  GetAllTaxRateCodesParams,
  TransactionResponse,
  TransactionListResponse,
  GetTransactionParams,
  GetAllTransactionsParams,
  CabysSearchResponse,
  SearchCabysParams,
  TaxpayerResponse,
  GetTaxpayerParams,
  ExemptionValidationResponse,
  ValidateExemptionParams,
  ExchangeRates,
  DollarRate,
  EuroRate,
  GetExchangeRateParams,
  CountryResponse,
  CountryListResponse,
  SearchCountryParams,
  GetAllCountriesParams,
  StateResponse,
  StateListResponse,
  GetStatesParams,
  GetStateParams,
  CountyResponse,
  CountyListResponse,
  GetCountiesParams,
  GetCountyParams,
  DistrictResponse,
  DistrictListResponse,
  GetDistrictsParams,
  GetDistrictParams,
  NeighborhoodResponse,
  NeighborhoodListResponse,
  GetNeighborhoodsParams,
  GetNeighborhoodParams,
  CurrencyListResponse,
  TaxResponse,
  TaxListResponse,
  GetTaxParams,
  GetAllTaxesParams,
  TaxRateResponse,
  TaxRateListResponse,
  GetTaxRateParams,
  GetAllTaxRatesParams,
} from './dtos';

/**
 * Marker set by `injectDocumentVersion` and consumed by `request`.
 *
 * It exists so the WAIT for the document version happens inside `request`,
 * where there is already an async boundary, without every one of the ~40
 * catalog methods having to await something.
 */
const NEEDS_DOCUMENT_VERSION = "__needsDocumentVersion";

/** How long a request will wait for the document version before giving up. */
const DOCUMENT_VERSION_TIMEOUT_MS = 15_000;

class DataApiClient {
  private documentVersionId: number | undefined;

  /**
   * Resolves when `setDocumentVersionId` has supplied a version.
   *
   * The Hacienda catalogs (`taxes`, `taxRates`, `codes`, …) take
   * `document_version_id` as a REQUIRED query parameter — without it the API
   * answers 422 — and the version itself is fetched asynchronously by
   * `DocumentVersionContext`, which then pushes it in here from an effect.
   *
   * That is a race, and it was being lost silently: a catalog hook mounting in
   * the same tick as the provider called `injectDocumentVersion` while the id
   * was still undefined, the parameter was quietly omitted, and the request
   * came back 422. Because the query client sets `retry: false` globally, that
   * failure was permanent for the life of the page — so anything gated on a
   * catalog never resolved. The product drawer waits for `taxes` and
   * `taxRates`, so it sat on "Cargando información…" forever.
   *
   * It only reproduced on a cold cache: with the catalogs already in
   * localStorage the hooks had data immediately and the race went unnoticed.
   */
  private documentVersionReady: Promise<void>;
  private resolveDocumentVersion!: () => void;

  constructor() {
    this.documentVersionReady = new Promise<void>((resolve) => {
      this.resolveDocumentVersion = resolve;
    });
  }

  /**
   * Set the active document version ID to be used for Hacienda-related endpoints.
   * This is managed internally by the DocumentVersionContext.
   */
  setDocumentVersionId(id: number | undefined) {
    this.documentVersionId = id;
    // Only a real version releases the waiters. The provider also calls this
    // with `undefined` on its first render, before its fetch resolves, and
    // releasing then would reintroduce the very race this closes.
    if (id !== undefined) this.resolveDocumentVersion();
  }

  /**
   * Get the current document version ID.
   */
  getDocumentVersionId(): number | undefined {
    return this.documentVersionId;
  }

  private async request<T>(path: string, params?: Record<string, any>): Promise<T> {
    let query = params;

    if (query?.[NEEDS_DOCUMENT_VERSION]) {
      const { [NEEDS_DOCUMENT_VERSION]: _marker, ...rest } = query;
      query = rest;

      if (this.documentVersionId === undefined) {
        // Bounded: a request that hangs forever is worse than one that fails,
        // and the caller surfaces an error it can retry. Without the bound an
        // environment where the version never loads would hold every catalog
        // request open indefinitely.
        await Promise.race([
          this.documentVersionReady,
          new Promise<void>((resolve) =>
            setTimeout(resolve, DOCUMENT_VERSION_TIMEOUT_MS),
          ),
        ]);
      }

      if (this.documentVersionId !== undefined && !rest.document_version_id) {
        query = { ...rest, document_version_id: this.documentVersionId };
      }
    }

    const url = buildDataApiUrl(path, query);
    const response = await dataApiFetch(url);
    return response.json();
  }

  /**
   * Mark a request as needing `document_version_id`.
   *
   * The value is NOT read here: at the moment a catalog method runs, the
   * version may still be in flight. `request` waits for it instead — see
   * `documentVersionReady`.
   */
  private injectDocumentVersion(params: Record<string, any>): Record<string, any> {
    return { ...params, [NEEDS_DOCUMENT_VERSION]: true };
  }

  // Document Versions
  async getDocumentVersion(params: GetDocumentVersionParams): Promise<DocumentVersionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/document-versions`, queryParams);
  }

  async getAllDocumentVersions(params: GetAllDocumentVersionsParams): Promise<DocumentVersionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/document-versions/all`, queryParams);
  }

  async getDocumentVersionById(params: GetDocumentVersionByIdParams): Promise<DocumentVersionResponse> {
    const { iso_code, id } = params;
    return this.request(`/countries/${iso_code}/document-versions/${id}`);
  }

  // Codes
  async getCode(params: GetCodeParams): Promise<CodeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/codes`, this.injectDocumentVersion(queryParams));
  }

  async getAllCodes(params: GetAllCodesParams): Promise<CodeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/codes/all`, this.injectDocumentVersion(queryParams));
  }

  // Customer Types
  async getAllCustomerTypes(params?: GetAllCustomerTypesParams): Promise<CustomerTypeListResponse> {
    return this.request('/customer-types/all', params);
  }

  async getCustomerTypeById(params: GetCustomerTypeByIdParams): Promise<CustomerTypeResponse> {
    return this.request(`/customer-types/${params.id}`);
  }

  // Discount Types
  async getDiscountType(params: GetDiscountTypeParams): Promise<DiscountTypeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/discounts`, queryParams);
  }

  async getAllDiscountTypes(params: GetAllDiscountTypesParams): Promise<DiscountTypeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/discounts/all`, queryParams);
  }

  // Documents
  async getDocumentType(params: GetDocumentTypeParams): Promise<DocumentTypeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/documents`, queryParams);
  }

  async getAllDocumentTypes(params: GetAllDocumentTypesParams): Promise<DocumentTypeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/documents/all`, queryParams);
  }

  // Economic Activities
  async getEconomicActivity(params: GetEconomicActivityParams): Promise<EconomicActivityResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/economic-activities`, queryParams);
  }

  async getAllEconomicActivities(params: GetAllEconomicActivitiesParams): Promise<EconomicActivityListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/economic-activities/all`, queryParams);
  }

  // Exemptions
  async getExemption(params: GetExemptionParams): Promise<ExemptionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/exemptions`, this.injectDocumentVersion(queryParams));
  }

  async getAllExemptions(params: GetAllExemptionsParams): Promise<ExemptionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/exemptions/all`, this.injectDocumentVersion(queryParams));
  }

  // Exemptions Issuing Institutions
  async getExemptionIssuingInstitution(params: GetExemptionIssuingInstitutionParams): Promise<ExemptionIssuingInstitutionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/exemptions-issuing-institutions`, this.injectDocumentVersion(queryParams));
  }

  async getAllExemptionIssuingInstitutions(params: GetAllExemptionIssuingInstitutionsParams): Promise<ExemptionIssuingInstitutionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/exemptions-issuing-institutions/all`, this.injectDocumentVersion(queryParams));
  }

  // Factory Tax Charges
  async getFactoryTaxCharge(params: GetFactoryTaxChargeParams): Promise<FactoryTaxChargeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/factory-tax-charges`, this.injectDocumentVersion(queryParams));
  }

  async getAllFactoryTaxCharges(params: GetAllFactoryTaxChargesParams): Promise<FactoryTaxChargeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/factory-tax-charges/all`, this.injectDocumentVersion(queryParams));
  }

  // Identifications
  async getIdentification(params: GetIdentificationParams): Promise<IdentificationResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/identifications`, queryParams);
  }

  async getAllIdentifications(params: GetAllIdentificationsParams): Promise<IdentificationListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/identifications/all`, queryParams);
  }

  // Measurement Units
  async getMeasurementUnit(params: GetMeasurementUnitParams): Promise<MeasurementUnitResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/measurement-units`, queryParams);
  }

  async getAllMeasurementUnits(params?: GetAllMeasurementUnitsParams): Promise<MeasurementUnitListResponse> {
    return this.request(`/measurement-units/all`, params || {});
  }

  // National Taxpayer Companies
  async getNationalTaxpayerCompany(params: GetNationalTaxpayerCompanyParams): Promise<NationalTaxpayerCompanyResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/national-taxpayer-companies`, queryParams);
  }

  async getAllNationalTaxpayerCompanies(params: GetAllNationalTaxpayerCompaniesParams): Promise<NationalTaxpayerCompanyListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/national-taxpayer-companies/all`, queryParams);
  }

  // National Taxpayer Special Fields
  async getNationalTaxpayerSpecialField(params: GetNationalTaxpayerSpecialFieldParams): Promise<NationalTaxpayerSpecialFieldResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/national-taxpayer-special-fields`, queryParams);
  }

  async getAllNationalTaxpayerSpecialFields(params: GetAllNationalTaxpayerSpecialFieldsParams): Promise<NationalTaxpayerSpecialFieldListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/national-taxpayer-special-fields/all`, queryParams);
  }

  // Notification Codes
  async getNotificationCode(params: GetNotificationCodeParams): Promise<NotificationCodeResponse> {
    return this.request('/notification-codes', params);
  }

  async getAllNotificationCodes(params?: GetAllNotificationCodesParams): Promise<NotificationCodeListResponse> {
    return this.request('/notification-codes/all', params);
  }

  // Other Charges
  async getOtherCharge(params: GetOtherChargeParams): Promise<OtherChargeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/other-charges`, this.injectDocumentVersion(queryParams));
  }

  async getAllOtherCharges(params: GetAllOtherChargesParams): Promise<OtherChargeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/other-charges/all`, this.injectDocumentVersion(queryParams));
  }

  // Payments
  async getPayment(params: GetPaymentParams): Promise<PaymentResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/payments`, this.injectDocumentVersion(queryParams));
  }

  async getAllPayments(params: GetAllPaymentsParams): Promise<PaymentListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/payments/all`, this.injectDocumentVersion(queryParams));
  }

  // Pharmaceutical Forms
  async getPharmaceuticalForm(params: GetPharmaceuticalFormParams): Promise<PharmaceuticalFormResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/pharmaceutical-forms`, queryParams);
  }

  async getAllPharmaceuticalForms(params: GetAllPharmaceuticalFormsParams): Promise<PharmaceuticalFormListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/pharmaceutical-forms/all`, queryParams);
  }

  // Product Types
  async getProductType(params: GetProductTypeParams): Promise<ProductTypeResponse> {
    return this.request('/products', params);
  }

  async getAllProductTypes(params?: GetAllProductTypesParams): Promise<ProductTypeListResponse> {
    return this.request('/products/all', params);
  }

  // Reference Codes
  async getReferenceCode(params: GetReferenceCodeParams): Promise<ReferenceCodeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/reference-codes`, this.injectDocumentVersion(queryParams));
  }

  async getAllReferenceCodes(params: GetAllReferenceCodesParams): Promise<ReferenceCodeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/reference-codes/all`, this.injectDocumentVersion(queryParams));
  }

  // References
  async getReference(params: GetReferenceParams): Promise<ReferenceResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/references`, this.injectDocumentVersion(queryParams));
  }

  async getAllReferences(params: GetAllReferencesParams): Promise<ReferenceListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/references/all`, this.injectDocumentVersion(queryParams));
  }

  // Regimes
  async getRegime(params: GetRegimeParams): Promise<RegimeResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/regimes`, queryParams);
  }

  async getAllRegimes(params: GetAllRegimesParams): Promise<RegimeListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/regimes/all`, queryParams);
  }

  // Sale Conditions
  async getSaleCondition(params: GetSaleConditionParams): Promise<SaleConditionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/sale-conditions`, this.injectDocumentVersion(queryParams));
  }

  async getAllSaleConditions(params: GetAllSaleConditionsParams): Promise<SaleConditionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/sale-conditions/all`, this.injectDocumentVersion(queryParams));
  }

  // Tax Amounts (nested under taxes)
  async getTaxAmount(params: GetTaxAmountParams): Promise<TaxAmountResponse> {
    const { iso_code, tax_id, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/taxes/${tax_id}/amounts`, queryParams);
  }

  async getAllTaxAmounts(params: GetAllTaxAmountsParams): Promise<TaxAmountListResponse> {
    const { iso_code, tax_id, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/taxes/${tax_id}/amounts/all`, queryParams);
  }

  // Tax Conditions
  async getTaxCondition(params: GetTaxConditionParams): Promise<TaxConditionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-conditions`, this.injectDocumentVersion(queryParams));
  }

  async getAllTaxConditions(params: GetAllTaxConditionsParams): Promise<TaxConditionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-conditions/all`, this.injectDocumentVersion(queryParams));
  }

  // Tax Factors
  async getTaxFactor(params: GetTaxFactorParams): Promise<TaxFactorResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-factors`, queryParams);
  }

  async getAllTaxFactors(params: GetAllTaxFactorsParams): Promise<TaxFactorListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-factors/all`, queryParams);
  }

  // Tax Rate Codes
  async getTaxRateCode(params: GetTaxRateCodeParams): Promise<TaxRateCodeResponse> {
    return this.request('/tax-rate-codes', params);
  }

  async getAllTaxRateCodes(params?: GetAllTaxRateCodesParams): Promise<TaxRateCodeListResponse> {
    return this.request('/tax-rate-codes/all', params);
  }

  // Transactions
  async getTransaction(params: GetTransactionParams): Promise<TransactionResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/transactions`, this.injectDocumentVersion(queryParams));
  }

  async getAllTransactions(params: GetAllTransactionsParams): Promise<TransactionListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/transactions/all`, this.injectDocumentVersion(queryParams));
  }

  // Locations - Countries
  async searchCountry(params: SearchCountryParams): Promise<CountryResponse> {
    return this.request('/countries', params);
  }

  async getAllCountries(params?: GetAllCountriesParams): Promise<CountryListResponse> {
    return this.request('/countries/all', params);
  }

  // Locations - States
  async getStates(params: GetStatesParams): Promise<StateListResponse> {
    return this.request(`/countries/${params.iso_code}/states`);
  }

  async getState(params: GetStateParams): Promise<StateResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}`);
  }

  // Locations - Counties
  async getCounties(params: GetCountiesParams): Promise<CountyListResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties`);
  }

  async getCounty(params: GetCountyParams): Promise<CountyResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties/${params.county_id}`);
  }

  // Locations - Districts
  async getDistricts(params: GetDistrictsParams): Promise<DistrictListResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties/${params.county_id}/districts`);
  }

  async getDistrict(params: GetDistrictParams): Promise<DistrictResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties/${params.county_id}/districts/${params.district_id}`);
  }

  // Locations - Neighborhoods
  async getNeighborhoods(params: GetNeighborhoodsParams): Promise<NeighborhoodListResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties/${params.county_id}/districts/${params.district_id}/neighborhoods`);
  }

  async getNeighborhood(params: GetNeighborhoodParams): Promise<NeighborhoodResponse> {
    return this.request(`/countries/${params.iso_code}/states/${params.state_id}/counties/${params.county_id}/districts/${params.district_id}/neighborhoods/${params.neighborhood_id}`);
  }

  // Currencies
  async getAllCurrencies(): Promise<CurrencyListResponse> {
    return this.request('/currencies');
  }

  async getCurrencyByCode(code: string): Promise<CurrencyListResponse[0]> {
    return this.request(`/currencies/${code}`);
  }

  // Taxes
  async getTax(params: GetTaxParams): Promise<TaxResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/taxes`, this.injectDocumentVersion(queryParams));
  }

  async getAllTaxes(params: GetAllTaxesParams): Promise<TaxListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/taxes/all`, this.injectDocumentVersion(queryParams));
  }

  // Tax Rates
  async getTaxRate(params: GetTaxRateParams): Promise<TaxRateResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-rates`, this.injectDocumentVersion(queryParams));
  }

  async getAllTaxRates(params: GetAllTaxRatesParams): Promise<TaxRateListResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/tax-rates/all`, this.injectDocumentVersion(queryParams));
  }

  // Consumer - CABYS
  async searchCabys(params: SearchCabysParams): Promise<CabysSearchResponse> {
    const { iso_code, ...queryParams } = params;
    return this.request(`/countries/${iso_code}/cabys`, queryParams);
  }

  // Consumer - Taxpayer Identification
  async getTaxpayerInfo(params: GetTaxpayerParams): Promise<TaxpayerResponse> {
    const { iso_code, identification } = params;
    return this.request(`/countries/${iso_code}/taxpayer/${identification}/hacienda-info`);
  }

  // Consumer - Exemption Validation
  async validateExemption(params: ValidateExemptionParams): Promise<ExemptionValidationResponse> {
    const { iso_code, authorization } = params;
    return this.request(`/countries/${iso_code}/exemptions/${authorization}`);
  }

  // Consumer - Exchange Rates
  async getExchangeRates(params: GetExchangeRateParams): Promise<ExchangeRates> {
    return this.request(`/countries/${params.iso_code}/exchange-rate`);
  }

  async getDollarRate(params: GetExchangeRateParams): Promise<DollarRate> {
    return this.request(`/countries/${params.iso_code}/exchange-rate/dollar`);
  }

  async getEuroRate(params: GetExchangeRateParams): Promise<EuroRate> {
    return this.request(`/countries/${params.iso_code}/exchange-rate/euro`);
  }
}

export const dataApiClient = new DataApiClient();
export default dataApiClient;
