import { useLanguage } from "@/contexts/LanguageContext";
import { LocationSelect } from "@/components/ui";
import { CountryISO } from "@/lib/enums";
import type { FiscalInfoFormState } from "./types";

interface ResidenceStepProps {
  form: FiscalInfoFormState;
  patch: (next: Partial<FiscalInfoFormState>) => void;
  compact?: boolean;
}

/**
 * Fiscal-residence step — now a thin adapter over the shared <LocationSelect>
 * (all the cascade/i18n/hide-when-non-CR logic lives there). Residence country
 * mirrors the nationality ISO; when it isn't Costa Rica the CR cascade hides and
 * only the free-text address remains.
 */
export function ResidenceStep({ form, patch, compact = false }: ResidenceStepProps) {
  const { t } = useLanguage();
  const iso = form.nationality || form.residenceCountryCode || CountryISO.COSTA_RICA;

  return (
    <LocationSelect
      isoCode={iso}
      title={compact ? undefined : t("orgSettings.fiscalInfo.residence.title")}
      subtitle={compact ? undefined : t("orgSettings.fiscalInfo.residence.subtitle")}
      value={{
        state_id: form.stateId,
        county_id: form.countyId,
        district_id: form.districtId,
        neighborhood_id: form.neighborhoodId,
        address: form.address,
      }}
      onChange={(loc) =>
        patch({
          stateId: loc.state_id ?? null,
          countyId: loc.county_id ?? null,
          districtId: loc.district_id ?? null,
          neighborhoodId: loc.neighborhood_id ?? null,
          address: loc.address ?? "",
        })
      }
    />
  );
}
