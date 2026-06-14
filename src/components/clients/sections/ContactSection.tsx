import { Mail } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel, PhoneField } from "@/components/ui";
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

      {/* Phone: flag country picker + number (shared PhoneField) */}
      <div>
        <FormLabel>Teléfono</FormLabel>
        <PhoneField
          countryCode={form.phone?.country_code ?? CountryISO.COSTA_RICA}
          number={form.phone?.number ?? ""}
          numberPlaceholder="88888888"
          onChange={({ countryCode, number }) =>
            setForm((f) => ({ ...f, phone: { ...f.phone, country_code: countryCode, number } }))
          }
        />
      </div>
    </SectionWrapper>
  );
}
