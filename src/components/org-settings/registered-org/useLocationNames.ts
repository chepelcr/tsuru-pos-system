import {
  useStates,
  useCounties,
  useDistricts,
  useNeighborhoods,
} from "@/hooks/useDataApi";

interface LocationIds {
  iso: string;
  stateId: number | null;
  countyId: number | null;
  districtId: number | null;
  neighborhoodId: number | null;
}

interface LocationNames {
  state: string | null;
  county: string | null;
  district: string | null;
  neighborhood: string | null;
}

/**
 * Resolve location IDs into human-readable names by re-using the same data-api
 * hooks the cascading select uses. Returns `null` for each level not yet
 * fetched or not present. Used by the summary card and the review step so we
 * show "San José / Escazú / San Rafael" instead of "1 / 1 / 1".
 */
export function useLocationNames({
  iso,
  stateId,
  countyId,
  districtId,
  neighborhoodId,
}: LocationIds): LocationNames {
  const { data: states = [] } = useStates(
    { iso_code: iso },
    { enabled: !!iso && stateId != null },
  );
  const { data: counties = [] } = useCounties(
    { iso_code: iso, state_id: stateId! },
    { enabled: stateId != null && countyId != null },
  );
  const { data: districts = [] } = useDistricts(
    { iso_code: iso, state_id: stateId!, county_id: countyId! },
    { enabled: stateId != null && countyId != null && districtId != null },
  );
  const { data: neighborhoods = [] } = useNeighborhoods(
    {
      iso_code: iso,
      state_id: stateId!,
      county_id: countyId!,
      district_id: districtId!,
    },
    {
      enabled:
        stateId != null && countyId != null && districtId != null && neighborhoodId != null,
    },
  );

  return {
    state: states.find((s) => s.state_id === stateId)?.state_name ?? null,
    county: counties.find((c) => c.county_id === countyId)?.county_name ?? null,
    district: districts.find((d) => d.district_id === districtId)?.district_name ?? null,
    neighborhood:
      neighborhoods.find((n) => n.neighborhood_id === neighborhoodId)?.neighborhood_name ?? null,
  };
}
