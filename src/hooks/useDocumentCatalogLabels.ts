/**
 * Hacienda codes → the names people read, for the document views.
 *
 * The detail page printed raw codes (payment "04", sale condition "01",
 * reference "01 / 09"). Every label here comes from the same data-api catalogs
 * the checkout uses — already cached and offline-persisted — so a document and
 * the form that created it name things the same way. A code the catalog does
 * not know falls back to the code itself, never to a guess.
 */

import { useCallback } from 'react';
import {
  useAllCustomerTypes,
  useAllIdentifications,
  useAllOtherCharges,
  useAllPayments,
  useAllReferenceCodes,
  useAllReferences,
  useAllSaleConditions,
} from '@/hooks/useDataApi';
import { CountryISO } from '@/lib/enums/countries';
import type { GetAllPaymentsParams } from '@/services/data-api/dtos/payments';
import type { GetAllReferenceCodesParams } from '@/services/data-api/dtos/reference-codes';
import type { GetAllReferencesParams } from '@/services/data-api/dtos/references';
import type { GetAllSaleConditionsParams } from '@/services/data-api/dtos/sale-conditions';
import type { GetAllOtherChargesParams } from '@/services/data-api/dtos/other-charges';

interface CodedRow {
  code: string;
  description?: string | null;
}

function byCode(rows: CodedRow[] | undefined): Map<string, string> {
  return new Map((rows ?? []).map((row) => [row.code, row.description ?? row.code]));
}

export interface DocumentCatalogLabels {
  payment: (code?: string | null) => string;
  saleCondition: (code?: string | null) => string;
  referenceType: (code?: string | null) => string;
  referenceCode: (code?: string | null) => string;
  identificationType: (code?: string | null) => string;
  customerType: (code?: string | null) => string;
  otherCharge: (code?: string | null) => string;
}

export function useDocumentCatalogLabels(): DocumentCatalogLabels {
  const iso = CountryISO.COSTA_RICA;
  const { data: payments } = useAllPayments({ iso_code: iso } as GetAllPaymentsParams);
  const { data: saleConditions } = useAllSaleConditions({ iso_code: iso } as GetAllSaleConditionsParams);
  const { data: referenceTypes } = useAllReferences({ iso_code: iso } as GetAllReferencesParams);
  const { data: referenceCodes } = useAllReferenceCodes({ iso_code: iso } as GetAllReferenceCodesParams);
  const { data: identifications } = useAllIdentifications({ iso_code: iso });
  const { data: otherCharges } = useAllOtherCharges({ iso_code: iso } as GetAllOtherChargesParams);
  const { data: customerTypes } = useAllCustomerTypes();

  const label = useCallback(
    (rows: CodedRow[] | undefined) => {
      const map = byCode(rows);
      return (code?: string | null) => (code ? map.get(code) ?? code : '—');
    },
    [],
  );

  return {
    payment: label(payments),
    saleCondition: label(saleConditions),
    referenceType: label(referenceTypes),
    referenceCode: label(referenceCodes),
    identificationType: label(identifications),
    otherCharge: label(otherCharges),
    // Customer types are keyed by numeric id; the document carries "01".."05".
    customerType: (code?: string | null) => {
      if (!code) return '—';
      const match = (customerTypes ?? []).find((row) => row.id === Number(code));
      return match?.description ?? code;
    },
  };
}
