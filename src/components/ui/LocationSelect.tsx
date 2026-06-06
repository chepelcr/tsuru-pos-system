import { useStates, useCounties, useDistricts, useNeighborhoods } from "@/hooks/useDataApi";
import { CountryISO } from "@/lib/enums";
import { Select } from "./Input";
import { FormLabel } from "./FormLabel";
import type { LocationData } from "@/types/location";

interface LocationSelectProps {
  value: LocationData;
  onChange: (loc: LocationData) => void;
  /** ISO country code for location lookups. Defaults to Costa Rica. */
  isoCode?: string;
}

export function LocationSelect({ value, onChange, isoCode = CountryISO.COSTA_RICA }: LocationSelectProps) {
  const stateId    = value.state_id    ?? null;
  const countyId   = value.county_id   ?? null;
  const districtId = value.district_id ?? null;

  const { data: states = [],        isLoading: statesLoading }    = useStates({ iso_code: isoCode });
  const { data: counties = [],      isLoading: countiesLoading }  = useCounties(
    { iso_code: isoCode, state_id: stateId! },
    { enabled: stateId != null && stateId > 0 }
  );
  const { data: districts = [],     isLoading: districtsLoading } = useDistricts(
    { iso_code: isoCode, state_id: stateId!, county_id: countyId! },
    { enabled: stateId != null && stateId > 0 && countyId != null && countyId > 0 }
  );
  const { data: neighborhoods = [], isLoading: nbLoading }        = useNeighborhoods(
    { iso_code: isoCode, state_id: stateId!, county_id: countyId!, district_id: districtId! },
    { enabled: stateId != null && stateId > 0 && countyId != null && countyId > 0 && districtId != null && districtId > 0 }
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

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Provincia</FormLabel>
          <Select value={stateId?.toString() ?? ""} onChange={handleState} disabled={statesLoading}>
            <option value="">{statesLoading ? "Cargando…" : "Seleccionar…"}</option>
            {states.sort((a, b) => a.state_id - b.state_id).map((s) => (
              <option key={s.state_id} value={s.state_id}>{s.state_name}</option>
            ))}
          </Select>
        </div>

        <div>
          <FormLabel>Cantón</FormLabel>
          <Select value={countyId?.toString() ?? ""} onChange={handleCounty} disabled={!stateId || countiesLoading}>
            <option value="">{countiesLoading ? "Cargando…" : "Seleccionar…"}</option>
            {counties.map((c) => (
              <option key={c.county_id} value={c.county_id}>{c.county_name}</option>
            ))}
          </Select>
        </div>

        <div>
          <FormLabel>Distrito</FormLabel>
          <Select value={districtId?.toString() ?? ""} onChange={handleDistrict} disabled={!countyId || districtsLoading}>
            <option value="">{districtsLoading ? "Cargando…" : "Seleccionar…"}</option>
            {districts.map((d) => (
              <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
            ))}
          </Select>
        </div>

        <div>
          <FormLabel>Barrio</FormLabel>
          <Select value={value.neighborhood_id?.toString() ?? ""} onChange={handleNeighborhood} disabled={!districtId || nbLoading}>
            <option value="">{nbLoading ? "Cargando…" : "Seleccionar…"}</option>
            {neighborhoods.map((n) => (
              <option key={n.neighborhood_id} value={n.neighborhood_id}>{n.neighborhood_name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <FormLabel>Otras señas</FormLabel>
        <textarea
          className="input w-full resize-y text-sm"
          rows={2}
          value={value.address ?? ""}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Sector norte, fila 3, frente a la entrada principal"
        />
      </div>
    </div>
  );
}
