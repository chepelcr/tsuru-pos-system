import { useLanguage } from "@/contexts/LanguageContext";
import {
  useStates,
  useCounties,
  useDistricts,
  useNeighborhoods,
} from "@/hooks/useDataApi";
import type { FiscalInfoFormState } from "./types";

interface ResidenceStepProps {
  form: FiscalInfoFormState;
  patch: (next: Partial<FiscalInfoFormState>) => void;
  compact?: boolean;
}

export function ResidenceStep({ form, patch, compact = false }: ResidenceStepProps) {
  const { t } = useLanguage();
  // Residence country mirrors the nationality (locked to "188" for now). The
  // explicit country select is gone — the cascading state/county/district/
  // neighborhood selects bootstrap directly from the nationality ISO.
  const iso = form.nationality || form.residenceCountryCode || "188";

  const { data: states = [], isLoading: statesLoading } = useStates({ iso_code: iso });
  const { data: counties = [], isLoading: countiesLoading } = useCounties(
    { iso_code: iso, state_id: form.stateId! },
    { enabled: form.stateId != null },
  );
  const { data: districts = [], isLoading: districtsLoading } = useDistricts(
    { iso_code: iso, state_id: form.stateId!, county_id: form.countyId! },
    { enabled: form.stateId != null && form.countyId != null },
  );
  const { data: neighborhoods = [], isLoading: nbLoading } = useNeighborhoods(
    { iso_code: iso, state_id: form.stateId!, county_id: form.countyId!, district_id: form.districtId! },
    { enabled: form.stateId != null && form.countyId != null && form.districtId != null },
  );

  const placeholder = statesLoading ? t("common.loading") : t("orgSettings.fiscalInfo.selectPlaceholder");

  return (
    <div className="space-y-5">
      {!compact && (
        <header>
          <h2 className="t-h3 mb-1">{t("orgSettings.fiscalInfo.residence.title")}</h2>
          <p className="t-sm text-muted-foreground">
            {t("orgSettings.fiscalInfo.residence.subtitle")}
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="pp-label" htmlFor="reg-org-state">
            {t("orgSettings.fiscalInfo.state")}
          </label>
          <select
            id="reg-org-state"
            className="pp-input w-full mt-1"
            value={form.stateId?.toString() ?? ""}
            disabled={statesLoading}
            onChange={(e) =>
              patch({
                stateId: e.target.value ? Number(e.target.value) : null,
                countyId: null,
                districtId: null,
                neighborhoodId: null,
              })
            }
          >
            <option value="">{placeholder}</option>
            {states
              .slice()
              .sort((a, b) => a.state_id - b.state_id)
              .map((s) => (
                <option key={s.state_id} value={s.state_id}>
                  {s.state_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="pp-label" htmlFor="reg-org-county">
            {t("orgSettings.fiscalInfo.county")}
          </label>
          <select
            id="reg-org-county"
            className="pp-input w-full mt-1"
            value={form.countyId?.toString() ?? ""}
            disabled={form.stateId == null || countiesLoading}
            onChange={(e) =>
              patch({
                countyId: e.target.value ? Number(e.target.value) : null,
                districtId: null,
                neighborhoodId: null,
              })
            }
          >
            <option value="">
              {countiesLoading ? t("common.loading") : t("orgSettings.fiscalInfo.selectPlaceholder")}
            </option>
            {counties.map((c) => (
              <option key={c.county_id} value={c.county_id}>
                {c.county_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="pp-label" htmlFor="reg-org-district">
            {t("orgSettings.fiscalInfo.district")}
          </label>
          <select
            id="reg-org-district"
            className="pp-input w-full mt-1"
            value={form.districtId?.toString() ?? ""}
            disabled={form.countyId == null || districtsLoading}
            onChange={(e) =>
              patch({
                districtId: e.target.value ? Number(e.target.value) : null,
                neighborhoodId: null,
              })
            }
          >
            <option value="">
              {districtsLoading ? t("common.loading") : t("orgSettings.fiscalInfo.selectPlaceholder")}
            </option>
            {districts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="pp-label" htmlFor="reg-org-neighborhood">
            {t("orgSettings.fiscalInfo.neighborhood")}
          </label>
          <select
            id="reg-org-neighborhood"
            className="pp-input w-full mt-1"
            value={form.neighborhoodId?.toString() ?? ""}
            disabled={form.districtId == null || nbLoading}
            onChange={(e) =>
              patch({ neighborhoodId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">
              {nbLoading ? t("common.loading") : t("orgSettings.fiscalInfo.selectPlaceholder")}
            </option>
            {neighborhoods.map((n) => (
              <option key={n.neighborhood_id} value={n.neighborhood_id}>
                {n.neighborhood_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="pp-label" htmlFor="reg-org-address">
          {t("orgSettings.fiscalInfo.address")}
        </label>
        <textarea
          id="reg-org-address"
          className="pp-input w-full mt-1 resize-y"
          rows={3}
          value={form.address}
          onChange={(e) => patch({ address: e.target.value })}
          placeholder={t("orgSettings.fiscalInfo.addressPlaceholder")}
        />
      </div>
    </div>
  );
}
