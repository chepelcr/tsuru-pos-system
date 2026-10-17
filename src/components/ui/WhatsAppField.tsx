import { useMemo, useState } from "react";
import { useAllCountries } from "@/hooks/useDataApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO } from "@/lib/enums";
import { PhoneField } from "./PhoneField";

interface WhatsAppFieldProps {
  value: string;
  onChange: (value: string) => void;
  numberId?: string;
  fallbackCountryCode?: string | null;
  disabled?: boolean;
}

/** WhatsApp's independent prefix is stored with a leading + in whatsapp_number.
 * Legacy local-only values retain the contact phone's country until edited. */
export function WhatsAppField({ value, onChange, numberId, fallbackCountryCode, disabled }: WhatsAppFieldProps) {
  const { t } = useLanguage();
  const { data: countries = [], isLoading } = useAllCountries({ status: "1" });
  const [chosenCountry, setChosenCountry] = useState<string | null>(null);
  const fallback = chosenCountry ?? fallbackCountryCode ?? CountryISO.COSTA_RICA;
  const phone = useMemo(() => {
    const digits = value.replace(/\D/g, "");
    if (value.trim().startsWith("+")) {
      const matching = countries.filter((country) => {
        const prefix = country.phone_code?.replace(/\D/g, "");
        return prefix && digits.startsWith(prefix);
      }).sort((a, b) => b.phone_code.replace(/\D/g, "").length - a.phone_code.replace(/\D/g, "").length);
      // Shared prefixes (+1) keep the selected country when equally specific.
      const longest = matching[0]?.phone_code.replace(/\D/g, "").length;
      const country = matching.find((item) => item.iso_code === fallback && item.phone_code.replace(/\D/g, "").length === longest) ?? matching[0];
      if (country) return { countryCode: country.iso_code, number: digits.slice(country.phone_code.replace(/\D/g, "").length) };
    }
    return { countryCode: fallback, number: digits };
  }, [value, countries, fallback]);
  const countryAvailable = countries.some((country) => country.iso_code === phone.countryCode && country.phone_code);

  return <PhoneField
    numberId={numberId}
    countryLabel={t("orgSettings.contact.whatsappCountry")}
    numberPlaceholder={t("orgSettings.contact.whatsappPlaceholder")}
    countryCode={phone.countryCode}
    number={phone.number}
    disabled={disabled || isLoading || !countryAvailable}
    onChange={({ countryCode, number }) => {
      setChosenCountry(countryCode);
      const prefix = countries.find((country) => country.iso_code === countryCode)?.phone_code?.replace(/\D/g, "") ?? "";
      onChange(number && prefix ? `+${prefix}${number.replace(/\D/g, "")}` : "");
    }}
  />;
}
