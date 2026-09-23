import { Phone } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel, PhoneField } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";

export interface BranchPhoneValue {
  /** ISO numeric country code (188) — the countries-catalog key, like client phones. */
  country_code: string;
  number: string;
}

interface BranchContactSectionProps {
  phone: BranchPhoneValue;
  setPhone: (value: BranchPhoneValue) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Branch phone — the same flag picker + number as a client's (shared PhoneField). */
export function BranchContactSection({
  phone,
  setPhone,
  isExpanded,
  onToggle,
}: BranchContactSectionProps) {
  const { t } = useLanguage();
  return (
    <SectionWrapper
      title={t("clients.contact")}
      icon={Phone}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <FormLabel>{t("common.phone")}</FormLabel>
        <PhoneField
          countryCode={phone.country_code}
          number={phone.number}
          numberPlaceholder="22223333"
          onChange={({ countryCode, number }) => setPhone({ country_code: countryCode, number })}
        />
      </div>
    </SectionWrapper>
  );
}
