import { useStates, useCounties, useDistricts, useNeighborhoods } from "@/hooks/useDataApi";
import { CountryISO } from "@/lib/enums";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select } from "./Input";
import { FormLabel } from "./FormLabel";
import type { LocationData } from "@/types/location";

interface LocationSelectProps {
  value: LocationData;
  onChange: (loc: LocationData) => void;
  /** ISO numeric country code for location lookups. Defaults to Costa Rica.
   *  The province/cantón/distrito/barrio cascade is Costa-Rica-specific, so for
   *  any other country it is hidden and only the free-text address remains. */
  isoCode?: string;
  /** Optional header (used by the fiscal-info residence step in full mode). */
  title?: string;
  subtitle?: string;
}

/**
 * Shared structured-location field: the CR provincia → cantón → distrito →
 * barrio cascade (from the locations data-api) plus a free-text address. The
 * single source of this UI across registration, clients, org-settings contact,
 * and fiscal-info residence. When `isoCode` is not Costa Rica the cascade hides
 * (the catalogs don't apply) and only the address textarea shows.
 */
export function LocationSelect({ value, onChange, isoCode = CountryISO.COSTA_RICA, title, subtitle }: LocationSelectProps) {
  const { t } = useLanguage();
  const isCR = isoCode === CountryISO.COSTA_RICA;

  const stateId    = value.state_id    ?? null;
  const countyId   = value.county_id   ?? null;
  const districtId = value.district_id ?? null;

  const { data: states = [],        isLoading: statesLoading }    = useStates(
    { iso_code: isoCode },
    { enabled: isCR },
  );
  const { data: counties = [],      isLoading: countiesLoading }  = useCounties(
    { iso_code: isoCode, state_id: stateId! },
    { enabled: isCR && stateId != null && stateId > 0 },
  );
  const { data: districts = [],     isLoading: districtsLoading } = useDistricts(
    { iso_code: isoCode, state_id: stateId!, county_id: countyId! },
    { enabled: isCR && stateId != null && stateId > 0 && countyId != null && countyId > 0 },
  );
  const { data: neighborhoods = [], isLoading: nbLoading }        = useNeighborhoods(
    { iso_code: isoCode, state_id: stateId!, county_id: countyId!, district_id: districtId! },
    { enabled: isCR && stateId != null && stateId > 0 && countyId != null && countyId > 0 && districtId != null && districtId > 0 },
  );

  const handleState = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    onChange({ state_id: id, county_id: null, district_id: null, neighborhood_id: null, address: value.address });
  };

  const handleCounty = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    onChange({ ...value, county_id: id, district_id: null, neighborhood_id: null });
  };

  const handleDistrict = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    onChange({ ...value, district_id: id, neighborhood_id: null });
  };

  const handleNeighborhood = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    onChange({ ...value, neighborhood_id: id });
  };

  const selectPlaceholder = (loading: boolean) => (loading ? t("common.loading") : t("location.select"));

  return (
    <div className="flex flex-col gap-3.5">
      {title && (
        <header>
          <h2 className="t-h3 mb-1">{title}</h2>
          {subtitle && <p className="t-sm text-muted-foreground">{subtitle}</p>}
        </header>
      )}

      {isCR && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>{t("location.province")}</FormLabel>
            <Select value={stateId?.toString() ?? ""} onChange={handleState} disabled={statesLoading}>
              <option value="">{selectPlaceholder(statesLoading)}</option>
              {states.slice().sort((a, b) => a.state_id - b.state_id).map((s) => (
                <option key={s.state_id} value={s.state_id}>{s.state_name}</option>
              ))}
            </Select>
          </div>

          <div>
            <FormLabel>{t("location.canton")}</FormLabel>
            <Select value={countyId?.toString() ?? ""} onChange={handleCounty} disabled={!stateId || countiesLoading}>
              <option value="">{selectPlaceholder(countiesLoading)}</option>
              {counties.map((c) => (
                <option key={c.county_id} value={c.county_id}>{c.county_name}</option>
              ))}
            </Select>
          </div>

          <div>
            <FormLabel>{t("location.district")}</FormLabel>
            <Select value={districtId?.toString() ?? ""} onChange={handleDistrict} disabled={!countyId || districtsLoading}>
              <option value="">{selectPlaceholder(districtsLoading)}</option>
              {districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
              ))}
            </Select>
          </div>

          <div>
            <FormLabel>{t("location.neighborhood")}</FormLabel>
            <Select value={value.neighborhood_id?.toString() ?? ""} onChange={handleNeighborhood} disabled={!districtId || nbLoading}>
              <option value="">{selectPlaceholder(nbLoading)}</option>
              {neighborhoods.map((n) => (
                <option key={n.neighborhood_id} value={n.neighborhood_id}>{n.neighborhood_name}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      <div>
        <FormLabel>{t("location.address")}</FormLabel>
        <textarea
          className="input w-full resize-y text-sm"
          rows={2}
          value={value.address ?? ""}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder={t("location.addressPlaceholder")}
        />
      </div>
    </div>
  );
}
