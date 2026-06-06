import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { dataApiClient } from '@/services/data-api';

export const CATALOG_STALE_TIME = 24 * 60 * 60 * 1000; // 24h
export const CATALOG_GC_TIME = 7 * 24 * 60 * 60 * 1000; // 7d
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
  StateListResponse,
  GetStatesParams,
  CountyListResponse,
  GetCountiesParams,
  DistrictListResponse,
  GetDistrictsParams,
  NeighborhoodListResponse,
  GetNeighborhoodsParams,
  CurrencyListResponse,
  TaxResponse,
  TaxListResponse,
  GetTaxParams,
  GetAllTaxesParams,
  TaxRateResponse,
  TaxRateListResponse,
  GetTaxRateParams,
  GetAllTaxRatesParams,
} from '../services/data-api';

// Document Versions
export function useDocumentVersion(
  params: GetDocumentVersionParams,
  options?: Omit<UseQueryOptions<DocumentVersionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['documentVersion', params],
    queryFn: () => dataApiClient.getDocumentVersion(params),
    ...options,
  });
}

export function useAllDocumentVersions(
  params: GetAllDocumentVersionsParams,
  options?: Omit<UseQueryOptions<DocumentVersionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['documentVersions', params],
    queryFn: () => dataApiClient.getAllDocumentVersions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

export function useDocumentVersionById(
  params: GetDocumentVersionByIdParams,
  options?: Omit<UseQueryOptions<DocumentVersionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['documentVersion', params.iso_code, params.id],
    queryFn: () => dataApiClient.getDocumentVersionById(params),
    ...options,
  });
}

// Codes
export function useCode(
  params: GetCodeParams,
  options?: Omit<UseQueryOptions<CodeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['code', params],
    queryFn: () => dataApiClient.getCode(params),
    ...options,
  });
}

export function useAllCodes(
  params: GetAllCodesParams,
  options?: Omit<UseQueryOptions<CodeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['codes', params],
    queryFn: () => dataApiClient.getAllCodes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Customer Types
export function useAllCustomerTypes(
  params?: GetAllCustomerTypesParams,
  options?: Omit<UseQueryOptions<CustomerTypeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['customerTypes', params],
    queryFn: () => dataApiClient.getAllCustomerTypes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

export function useCustomerTypeById(
  params: GetCustomerTypeByIdParams,
  options?: Omit<UseQueryOptions<CustomerTypeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['customerType', params.id],
    queryFn: () => dataApiClient.getCustomerTypeById(params),
    ...options,
  });
}

// Discount Types
export function useDiscountType(
  params: GetDiscountTypeParams,
  options?: Omit<UseQueryOptions<DiscountTypeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['discountType', params],
    queryFn: () => dataApiClient.getDiscountType(params),
    ...options,
  });
}

export function useAllDiscountTypes(
  params: GetAllDiscountTypesParams,
  options?: Omit<UseQueryOptions<DiscountTypeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['discountTypes', params],
    queryFn: () => dataApiClient.getAllDiscountTypes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Documents
export function useDocumentType(
  params: GetDocumentTypeParams,
  options?: Omit<UseQueryOptions<DocumentTypeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['documentType', params],
    queryFn: () => dataApiClient.getDocumentType(params),
    ...options,
  });
}

export function useAllDocumentTypes(
  params: GetAllDocumentTypesParams,
  options?: Omit<UseQueryOptions<DocumentTypeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['documentTypes', params],
    queryFn: () => dataApiClient.getAllDocumentTypes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Economic Activities
export function useEconomicActivity(
  params: GetEconomicActivityParams,
  options?: Omit<UseQueryOptions<EconomicActivityResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['economicActivity', params],
    queryFn: () => dataApiClient.getEconomicActivity(params),
    ...options,
  });
}

export function useAllEconomicActivities(
  params: GetAllEconomicActivitiesParams,
  options?: Omit<UseQueryOptions<EconomicActivityListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['economicActivities', params],
    queryFn: () => dataApiClient.getAllEconomicActivities(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Exemptions
export function useExemption(
  params: GetExemptionParams,
  options?: Omit<UseQueryOptions<ExemptionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exemption', params],
    queryFn: () => dataApiClient.getExemption(params),
    ...options,
  });
}

export function useAllExemptions(
  params: GetAllExemptionsParams,
  options?: Omit<UseQueryOptions<ExemptionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exemptions', params],
    queryFn: () => dataApiClient.getAllExemptions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Exemptions Issuing Institutions
export function useExemptionIssuingInstitution(
  params: GetExemptionIssuingInstitutionParams,
  options?: Omit<UseQueryOptions<ExemptionIssuingInstitutionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exemptionIssuingInstitution', params],
    queryFn: () => dataApiClient.getExemptionIssuingInstitution(params),
    ...options,
  });
}

export function useAllExemptionIssuingInstitutions(
  params: GetAllExemptionIssuingInstitutionsParams,
  options?: Omit<UseQueryOptions<ExemptionIssuingInstitutionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exemptionIssuingInstitutions', params],
    queryFn: () => dataApiClient.getAllExemptionIssuingInstitutions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Factory Tax Charges
export function useFactoryTaxCharge(
  params: GetFactoryTaxChargeParams,
  options?: Omit<UseQueryOptions<FactoryTaxChargeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['factoryTaxCharge', params],
    queryFn: () => dataApiClient.getFactoryTaxCharge(params),
    ...options,
  });
}

export function useAllFactoryTaxCharges(
  params: GetAllFactoryTaxChargesParams,
  options?: Omit<UseQueryOptions<FactoryTaxChargeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['factoryTaxCharges', params],
    queryFn: () => dataApiClient.getAllFactoryTaxCharges(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Identifications
export function useIdentification(
  params: GetIdentificationParams,
  options?: Omit<UseQueryOptions<IdentificationResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['identification', params],
    queryFn: () => dataApiClient.getIdentification(params),
    ...options,
  });
}

export function useAllIdentifications(
  params: GetAllIdentificationsParams,
  options?: Omit<UseQueryOptions<IdentificationListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['identifications', params],
    queryFn: () => dataApiClient.getAllIdentifications(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Measurement Units
export function useMeasurementUnit(
  params: GetMeasurementUnitParams,
  options?: Omit<UseQueryOptions<MeasurementUnitResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['measurementUnit', params],
    queryFn: () => dataApiClient.getMeasurementUnit(params),
    ...options,
  });
}

export function useAllMeasurementUnits(
  params?: GetAllMeasurementUnitsParams,
  options?: Omit<UseQueryOptions<MeasurementUnitListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['measurementUnits', params],
    queryFn: () => dataApiClient.getAllMeasurementUnits(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// National Taxpayer Companies
export function useNationalTaxpayerCompany(
  params: GetNationalTaxpayerCompanyParams,
  options?: Omit<UseQueryOptions<NationalTaxpayerCompanyResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['nationalTaxpayerCompany', params],
    queryFn: () => dataApiClient.getNationalTaxpayerCompany(params),
    ...options,
  });
}

export function useAllNationalTaxpayerCompanies(
  params: GetAllNationalTaxpayerCompaniesParams,
  options?: Omit<UseQueryOptions<NationalTaxpayerCompanyListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['nationalTaxpayerCompanies', params],
    queryFn: () => dataApiClient.getAllNationalTaxpayerCompanies(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// National Taxpayer Special Fields
export function useNationalTaxpayerSpecialField(
  params: GetNationalTaxpayerSpecialFieldParams,
  options?: Omit<UseQueryOptions<NationalTaxpayerSpecialFieldResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['nationalTaxpayerSpecialField', params],
    queryFn: () => dataApiClient.getNationalTaxpayerSpecialField(params),
    ...options,
  });
}

export function useAllNationalTaxpayerSpecialFields(
  params: GetAllNationalTaxpayerSpecialFieldsParams,
  options?: Omit<UseQueryOptions<NationalTaxpayerSpecialFieldListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['nationalTaxpayerSpecialFields', params],
    queryFn: () => dataApiClient.getAllNationalTaxpayerSpecialFields(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Notification Codes
export function useNotificationCode(
  params: GetNotificationCodeParams,
  options?: Omit<UseQueryOptions<NotificationCodeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['notificationCode', params],
    queryFn: () => dataApiClient.getNotificationCode(params),
    ...options,
  });
}

export function useAllNotificationCodes(
  params?: GetAllNotificationCodesParams,
  options?: Omit<UseQueryOptions<NotificationCodeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['notificationCodes', params],
    queryFn: () => dataApiClient.getAllNotificationCodes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Other Charges
export function useOtherCharge(
  params: GetOtherChargeParams,
  options?: Omit<UseQueryOptions<OtherChargeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['otherCharge', params],
    queryFn: () => dataApiClient.getOtherCharge(params),
    ...options,
  });
}

export function useAllOtherCharges(
  params: GetAllOtherChargesParams,
  options?: Omit<UseQueryOptions<OtherChargeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['otherCharges', params],
    queryFn: () => dataApiClient.getAllOtherCharges(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Payments
export function usePayment(
  params: GetPaymentParams,
  options?: Omit<UseQueryOptions<PaymentResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['payment', params],
    queryFn: () => dataApiClient.getPayment(params),
    ...options,
  });
}

export function useAllPayments(
  params: GetAllPaymentsParams,
  options?: Omit<UseQueryOptions<PaymentListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => dataApiClient.getAllPayments(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Pharmaceutical Forms
export function usePharmaceuticalForm(
  params: GetPharmaceuticalFormParams,
  options?: Omit<UseQueryOptions<PharmaceuticalFormResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['pharmaceuticalForm', params],
    queryFn: () => dataApiClient.getPharmaceuticalForm(params),
    ...options,
  });
}

export function useAllPharmaceuticalForms(
  params: GetAllPharmaceuticalFormsParams,
  options?: Omit<UseQueryOptions<PharmaceuticalFormListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['pharmaceuticalForms', params],
    queryFn: () => dataApiClient.getAllPharmaceuticalForms(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Product Types
export function useProductType(
  params: GetProductTypeParams,
  options?: Omit<UseQueryOptions<ProductTypeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['productType', params],
    queryFn: () => dataApiClient.getProductType(params),
    ...options,
  });
}

export function useAllProductTypes(
  params?: GetAllProductTypesParams,
  options?: Omit<UseQueryOptions<ProductTypeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['productTypes', params],
    queryFn: () => dataApiClient.getAllProductTypes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Reference Codes
export function useReferenceCode(
  params: GetReferenceCodeParams,
  options?: Omit<UseQueryOptions<ReferenceCodeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['referenceCode', params],
    queryFn: () => dataApiClient.getReferenceCode(params),
    ...options,
  });
}

export function useAllReferenceCodes(
  params: GetAllReferenceCodesParams,
  options?: Omit<UseQueryOptions<ReferenceCodeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['referenceCodes', params],
    queryFn: () => dataApiClient.getAllReferenceCodes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// References
export function useReference(
  params: GetReferenceParams,
  options?: Omit<UseQueryOptions<ReferenceResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['reference', params],
    queryFn: () => dataApiClient.getReference(params),
    ...options,
  });
}

export function useAllReferences(
  params: GetAllReferencesParams,
  options?: Omit<UseQueryOptions<ReferenceListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['references', params],
    queryFn: () => dataApiClient.getAllReferences(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Regimes
export function useRegime(
  params: GetRegimeParams,
  options?: Omit<UseQueryOptions<RegimeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['regime', params],
    queryFn: () => dataApiClient.getRegime(params),
    ...options,
  });
}

export function useAllRegimes(
  params: GetAllRegimesParams,
  options?: Omit<UseQueryOptions<RegimeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['regimes', params],
    queryFn: () => dataApiClient.getAllRegimes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Sale Conditions
export function useSaleCondition(
  params: GetSaleConditionParams,
  options?: Omit<UseQueryOptions<SaleConditionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['saleCondition', params],
    queryFn: () => dataApiClient.getSaleCondition(params),
    ...options,
  });
}

export function useAllSaleConditions(
  params: GetAllSaleConditionsParams,
  options?: Omit<UseQueryOptions<SaleConditionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['saleConditions', params],
    queryFn: () => dataApiClient.getAllSaleConditions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Tax Amounts
export function useTaxAmount(
  params: GetTaxAmountParams,
  options?: Omit<UseQueryOptions<TaxAmountResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxAmount', params],
    queryFn: () => dataApiClient.getTaxAmount(params),
    ...options,
  });
}

export function useAllTaxAmounts(
  params: GetAllTaxAmountsParams,
  options?: Omit<UseQueryOptions<TaxAmountListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxAmounts', params],
    queryFn: () => dataApiClient.getAllTaxAmounts(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Tax Conditions
export function useTaxCondition(
  params: GetTaxConditionParams,
  options?: Omit<UseQueryOptions<TaxConditionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxCondition', params],
    queryFn: () => dataApiClient.getTaxCondition(params),
    ...options,
  });
}

export function useAllTaxConditions(
  params: GetAllTaxConditionsParams,
  options?: Omit<UseQueryOptions<TaxConditionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxConditions', params],
    queryFn: () => dataApiClient.getAllTaxConditions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Tax Factors
export function useTaxFactor(
  params: GetTaxFactorParams,
  options?: Omit<UseQueryOptions<TaxFactorResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxFactor', params],
    queryFn: () => dataApiClient.getTaxFactor(params),
    ...options,
  });
}

export function useAllTaxFactors(
  params: GetAllTaxFactorsParams,
  options?: Omit<UseQueryOptions<TaxFactorListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxFactors', params],
    queryFn: () => dataApiClient.getAllTaxFactors(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Tax Rate Codes
export function useTaxRateCode(
  params: GetTaxRateCodeParams,
  options?: Omit<UseQueryOptions<TaxRateCodeResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxRateCode', params],
    queryFn: () => dataApiClient.getTaxRateCode(params),
    ...options,
  });
}

export function useAllTaxRateCodes(
  params?: GetAllTaxRateCodesParams,
  options?: Omit<UseQueryOptions<TaxRateCodeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxRateCodes', params],
    queryFn: () => dataApiClient.getAllTaxRateCodes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Transactions
export function useTransaction(
  params: GetTransactionParams,
  options?: Omit<UseQueryOptions<TransactionResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['transaction', params],
    queryFn: () => dataApiClient.getTransaction(params),
    ...options,
  });
}

export function useAllTransactions(
  params: GetAllTransactionsParams,
  options?: Omit<UseQueryOptions<TransactionListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => dataApiClient.getAllTransactions(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Locations - Countries
export function useSearchCountry(
  params: SearchCountryParams,
  options?: Omit<UseQueryOptions<CountryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['country', params],
    queryFn: () => dataApiClient.searchCountry(params),
    ...options,
  });
}

export function useAllCountries(
  params?: GetAllCountriesParams,
  options?: Omit<UseQueryOptions<CountryListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['countries', params],
    queryFn: () => dataApiClient.getAllCountries(params),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// Locations - States
export function useStates(
  params: GetStatesParams,
  options?: Omit<UseQueryOptions<StateListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['states', params.iso_code],
    queryFn: () => dataApiClient.getStates(params),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Locations - Counties
export function useCounties(
  params: GetCountiesParams,
  options?: Omit<UseQueryOptions<CountyListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['counties', params.iso_code, params.state_id],
    queryFn: () => dataApiClient.getCounties(params),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Locations - Districts
export function useDistricts(
  params: GetDistrictsParams,
  options?: Omit<UseQueryOptions<DistrictListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['districts', params.iso_code, params.state_id, params.county_id],
    queryFn: () => dataApiClient.getDistricts(params),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Locations - Neighborhoods
export function useNeighborhoods(
  params: GetNeighborhoodsParams,
  options?: Omit<UseQueryOptions<NeighborhoodListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['neighborhoods', params.iso_code, params.state_id, params.county_id, params.district_id],
    queryFn: () => dataApiClient.getNeighborhoods(params),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Currencies
export function useAllCurrencies(
  options?: Omit<UseQueryOptions<CurrencyListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => dataApiClient.getAllCurrencies(),
    ...options,
  });
}

export function useCurrencyByCode(
  code: string,
  options?: Omit<UseQueryOptions<CurrencyListResponse[0]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['currency', code],
    queryFn: () => dataApiClient.getCurrencyByCode(code),
    ...options,
  });
}

// Taxes
export function useTax(
  params: GetTaxParams,
  options?: Omit<UseQueryOptions<TaxResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['tax', params],
    queryFn: () => dataApiClient.getTax(params),
    ...options,
  });
}

export function useAllTaxes(
  params: GetAllTaxesParams,
  options?: Omit<UseQueryOptions<TaxListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxes', params],
    queryFn: () => dataApiClient.getAllTaxes(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Tax Rates
export function useTaxRate(
  params: GetTaxRateParams,
  options?: Omit<UseQueryOptions<TaxRateResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxRate', params],
    queryFn: () => dataApiClient.getTaxRate(params),
    ...options,
  });
}

export function useAllTaxRates(
  params: GetAllTaxRatesParams,
  options?: Omit<UseQueryOptions<TaxRateListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxRates', params],
    queryFn: () => dataApiClient.getAllTaxRates(params),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
    ...options,
  });
}

// Consumer - CABYS
export function useCabysSearch(
  params: SearchCabysParams,
  options?: Omit<UseQueryOptions<CabysSearchResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['cabys', params],
    queryFn: () => dataApiClient.searchCabys(params),
    ...options,
  });
}

// Consumer - Taxpayer Identification
export function useTaxpayerInfo(
  params: GetTaxpayerParams,
  options?: Omit<UseQueryOptions<TaxpayerResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['taxpayer', params.iso_code, params.identification],
    queryFn: () => dataApiClient.getTaxpayerInfo(params),
    ...options,
  });
}

// Consumer - Exemption Validation
export function useExemptionValidation(
  params: ValidateExemptionParams,
  options?: Omit<UseQueryOptions<ExemptionValidationResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exemptionValidation', params.iso_code, params.authorization],
    queryFn: () => dataApiClient.validateExemption(params),
    ...options,
  });
}

// Consumer - Exchange Rates
export function useExchangeRates(
  params: GetExchangeRateParams,
  options?: Omit<UseQueryOptions<ExchangeRates>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['exchangeRates', params.iso_code],
    queryFn: () => dataApiClient.getExchangeRates(params),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

export function useDollarRate(
  params: GetExchangeRateParams,
  options?: Omit<UseQueryOptions<DollarRate>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['dollarRate', params.iso_code],
    queryFn: () => dataApiClient.getDollarRate(params),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
}

export function useEuroRate(
  params: GetExchangeRateParams,
  options?: Omit<UseQueryOptions<EuroRate>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['euroRate', params.iso_code],
    queryFn: () => dataApiClient.getEuroRate(params),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
}
