import { MapPin } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { LocationSelect } from "@/components/ui/LocationSelect";
import { FormLabel } from "@/components/ui";
import { CountryISO } from "@/lib/enums";
import type { CreateClientDto } from "@/hooks/useClients";

interface AddressSectionProps {
  form: CreateClientDto;
  setForm: React.Dispatch<React.SetStateAction<CreateClientDto>>;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function AddressSection({
  form,
  setForm,
  isExpanded,
  onToggle,
  disabled,
}: AddressSectionProps) {
  const nationality = form.nationality ?? CountryISO.COSTA_RICA;
  const isCR = nationality === CountryISO.COSTA_RICA;

  return (
    <SectionWrapper
      title="Dirección"
      icon={MapPin}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      {isCR ? (
        <LocationSelect
          isoCode={nationality}
          value={{
            state_id: form.residence?.state_id ?? null,
            county_id: form.residence?.county_id ?? null,
            district_id: form.residence?.district_id ?? null,
            neighborhood_id: form.residence?.neighborhood_id ?? null,
            address: form.residence?.address ?? "",
          }}
          onChange={(loc) =>
            setForm((f) => ({
              ...f,
              residence: {
                state_id: loc.state_id ?? undefined,
                county_id: loc.county_id ?? undefined,
                district_id: loc.district_id ?? undefined,
                neighborhood_id: loc.neighborhood_id ?? undefined,
                address: loc.address ?? "",
              },
            }))
          }
        />
      ) : (
        <div>
          <FormLabel>Dirección completa</FormLabel>
          <textarea
            className="pp-input resize-y"
            rows={3}
            value={form.residence?.address ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                residence: { address: e.target.value },
              }))
            }
            placeholder="Dirección completa"
          />
        </div>
      )}
    </SectionWrapper>
  );
}
