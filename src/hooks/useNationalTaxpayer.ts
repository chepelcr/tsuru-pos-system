import { useMemo } from "react";
import { useAllNationalTaxpayerCompanies } from "@/hooks/useDataApi";
import { unmaskIdentification } from "@/lib/identification";
import { CountryISO } from "@/lib/enums";

/**
 * Is this customer a registered *contribuyente nacional*?
 *
 * The registered companies are a CATALOG now (data-api
 * `national-taxpayers-companies`), not a constant in the bundle. That matters
 * because it is what decides whether a customer needs departments and delivery
 * points captured at all: adding a chain becomes a catalog row an administrator
 * creates, instead of a frontend release.
 *
 * It replaces nothing — `lib/chainClients` still names WHICH chain a document's
 * extra fields belong to, and its GLN matching still covers the imported-order
 * path where the client has no cédula at all. This answers the different
 * question of whether the customer is on the national registry.
 *
 * Matching is on digits only: identifications arrive as "3-102-007223",
 * "3102007223", spaced, occasionally padded, and only the digits identify the
 * taxpayer.
 */
export interface NationalTaxpayerState {
  /** The registry row, when one of the identifiers matched. */
  company: { name: string; identification_number: string } | null;
  /** Whether the customer is on the national taxpayer registry. */
  isNationalTaxpayer: boolean;
  /** True while the registry is still loading — callers should not conclude
   *  "not a taxpayer" from an unresolved lookup. */
  isLoading: boolean;
}

export function useNationalTaxpayer(
  identifiers: (string | null | undefined)[],
  isoCode: string = CountryISO.COSTA_RICA,
): NationalTaxpayerState {
  const wanted = useMemo(
    () => identifiers.map(unmaskIdentification).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identifiers.join("|")],
  );

  const { data, isLoading } = useAllNationalTaxpayerCompanies(
    { iso_code: isoCode },
    // Only ask once there is something to match; the registry is small and
    // changes rarely, so the shared catalog cache does the rest.
    { enabled: wanted.length > 0 },
  );

  const company = useMemo(() => {
    if (wanted.length === 0) return null;
    // The catalog answers with a bare array, not an envelope.
    const rows = data ?? [];
    const match = rows.find((row) =>
      wanted.includes(unmaskIdentification(row.identification_number)),
    );
    return match
      ? { name: match.name ?? "", identification_number: match.identification_number ?? "" }
      : null;
  }, [data, wanted]);

  return {
    company,
    isNationalTaxpayer: !!company,
    isLoading: wanted.length > 0 && isLoading,
  };
}
