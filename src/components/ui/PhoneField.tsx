import { CountrySelect } from "./CountrySelect";
import { CountryISO } from "@/lib/enums";

interface PhoneFieldProps {
  /** Country by ISO numeric code (e.g. "188"). Defaults to Costa Rica. */
  countryCode?: string | null;
  /** The local phone number (digits only kept). */
  number?: string | null;
  onChange: (value: { countryCode: string; number: string }) => void;
  disabled?: boolean;
  numberPlaceholder?: string;
  id?: string;
  numberId?: string;
  countryLabel?: string;
}

/**
 * Shared phone input: a flag-bearing country picker (dial code) + the local
 * number. Used by both the org-settings contact form and the fiscal-info
 * contact step so the two stay consistent. The selected country's `+CC` prefix
 * shows inside the CountrySelect trigger, so the number field stays clean.
 */
export function PhoneField({
  countryCode,
  number,
  onChange,
  disabled,
  numberPlaceholder = "22223333",
  id,
  numberId,
  countryLabel,
}: PhoneFieldProps) {
  const cc = countryCode || CountryISO.COSTA_RICA;
  const digits = (number ?? "").replace(/\D/g, "");

  return (
    <div className="flex flex-wrap gap-2.5">
      <CountrySelect
        className="min-w-0 basis-28 flex-1"
        id={id}
        ariaLabel={countryLabel}
        value={cc}
        display="dial"
        disabled={disabled}
        onChange={(iso) => onChange({ countryCode: iso, number: number ?? "" })}
      />
      <input
        id={numberId}
        autoComplete="tel-national"
        className="pp-input w-full min-w-0 basis-32 flex-1"
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        value={cc === CountryISO.COSTA_RICA && digits.length > 4
          ? `${digits.slice(0, 4)}-${digits.slice(4)}`
          : digits}
        onChange={(e) =>
          onChange({ countryCode: cc, number: e.target.value.replace(/\D+/g, "").slice(0, 20) })
        }
        placeholder={numberPlaceholder}
      />
    </div>
  );
}
