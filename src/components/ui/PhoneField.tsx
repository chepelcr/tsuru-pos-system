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
}: PhoneFieldProps) {
  const cc = countryCode || CountryISO.COSTA_RICA;

  return (
    <div className="grid grid-cols-[150px_1fr] gap-2.5">
      <CountrySelect
        id={id}
        value={cc}
        display="dial"
        disabled={disabled}
        onChange={(iso) => onChange({ countryCode: iso, number: number ?? "" })}
      />
      <input
        className="pp-input w-full"
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        value={number ?? ""}
        onChange={(e) =>
          onChange({ countryCode: cc, number: e.target.value.replace(/\D+/g, "").slice(0, 20) })
        }
        placeholder={numberPlaceholder}
      />
    </div>
  );
}
