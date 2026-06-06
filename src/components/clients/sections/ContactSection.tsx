import { Mail } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel } from "@/components/ui";
import { useAllCountries } from "@/hooks/useDataApi";
import { CountryISO } from "@/lib/enums";
import type { CreateClientDto } from "@/hooks/useClients";

interface ContactSectionProps {
  form: CreateClientDto;
  setForm: React.Dispatch<React.SetStateAction<CreateClientDto>>;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ContactSection({
  form,
  setForm,
  isExpanded,
  onToggle,
  disabled,
}: ContactSectionProps) {
  const { data: countries = [], isLoading: loadingCountries } = useAllCountries();

  return (
    <SectionWrapper
      title="Contacto"
      icon={Mail}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      {/* Email */}
      <div>
        <FormLabel required>Correo electrónico</FormLabel>
        <input
          type="email"
          className="pp-input"
          value={form.email ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="correo@ejemplo.com"
        />
      </div>

      {/* Phone Country & Number */}
      <div className="flex gap-2.5">
        <div className="flex-1">
          <FormLabel>País (teléfono)</FormLabel>
          <select
            className="pp-input"
            value={form.phone?.country_code ?? CountryISO.COSTA_RICA}
            onChange={(e) => setForm((f) => ({ ...f, phone: { ...f.phone, country_code: e.target.value } }))}
            disabled={loadingCountries}
          >
            {countries.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                {c.phone_code} {c.spanish_name || c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <FormLabel>Número de teléfono</FormLabel>
          <input
            className="pp-input"
            value={form.phone?.number ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phone: { ...f.phone, number: e.target.value } }))}
            placeholder="8888-8888"
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
