import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAllCountries } from "@/hooks/useDataApi";
import type { FiscalInfoFormState } from "./types";

interface ContactStepProps {
  form: FiscalInfoFormState;
  patch: (next: Partial<FiscalInfoFormState>) => void;
  compact?: boolean;
}

/**
 * Phone contact step.
 *
 * Two design decisions that diverge from the original client-form shape:
 *   • `phoneCountryCode` stores the country's ISO numeric code (e.g. "188")
 *     so the BE has a stable FK reference. The international dial prefix
 *     ("+506") is derived at display time from the country's `phone_code`
 *     column — no separate input.
 *   • The legacy `phoneAreaCode` input is gone. CR doesn't use area codes
 *     and the wire payload just sends "" for that slot.
 */
export function ContactStep({ form, patch, compact = false }: ContactStepProps) {
  const { t } = useLanguage();

  const { data: countries = [] } = useAllCountries({ status: "1" });

  // Default to CR if the form still has the legacy "+506" string in state.
  const isoCountryCode = useMemo(() => {
    // If the stored value is already a valid 3-char ISO, keep it.
    if (form.phoneCountryCode && /^\d{3}$/.test(form.phoneCountryCode)) {
      return form.phoneCountryCode;
    }
    return "188";
  }, [form.phoneCountryCode]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso_code === isoCountryCode),
    [countries, isoCountryCode],
  );
  const phonePrefix = selectedCountry?.phone_code ?? "";

  return (
    <div className="space-y-5">
      {!compact && (
        <header>
          <h2 className="t-h3 mb-1">{t("orgSettings.fiscalInfo.contact.title")}</h2>
          <p className="t-sm text-muted-foreground">
            {t("orgSettings.fiscalInfo.contact.subtitle")}
          </p>
        </header>
      )}

      <div>
        <label className="pp-label" htmlFor="reg-org-email">
          {t("orgSettings.fiscalInfo.email")}
        </label>
        <input
          id="reg-org-email"
          className="pp-input w-full mt-1"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder={t("orgSettings.fiscalInfo.emailPlaceholder")}
        />
      </div>

      {/* Country (ISO) + phone number with derived +CC prefix. */}
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
        <div>
          <label className="pp-label" htmlFor="reg-org-phone-country">
            {t("orgSettings.fiscalInfo.phoneCountry")}
          </label>
          <select
            id="reg-org-phone-country"
            className="pp-input w-full mt-1"
            value={isoCountryCode}
            onChange={(e) => patch({ phoneCountryCode: e.target.value, phoneAreaCode: "" })}
          >
            {countries.length === 0 && <option value="188">Costa Rica (+506)</option>}
            {countries.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                {(c.spanish_name || c.name) + (c.phone_code ? ` (${c.phone_code})` : "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="pp-label" htmlFor="reg-org-phone-number">
            {t("orgSettings.fiscalInfo.phoneNumber")}
          </label>
          <div className="relative mt-1">
            {phonePrefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 t-sm text-muted-foreground pointer-events-none">
                {phonePrefix}
              </span>
            )}
            <input
              id="reg-org-phone-number"
              className="pp-input w-full"
              style={phonePrefix ? { paddingLeft: `${phonePrefix.length * 8 + 18}px` } : undefined}
              type="tel"
              inputMode="numeric"
              value={form.phoneNumber}
              onChange={(e) => patch({ phoneNumber: e.target.value.replace(/\D+/g, "").slice(0, 20) })}
              placeholder="22223333"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="pp-label" htmlFor="reg-org-phone-desc">
          {t("orgSettings.fiscalInfo.phoneDescription")}
          <span className="t-xs text-muted-foreground font-normal ml-1.5">
            ({t("common.optional")})
          </span>
        </label>
        <input
          id="reg-org-phone-desc"
          className="pp-input w-full mt-1"
          type="text"
          value={form.phoneDescription}
          onChange={(e) => patch({ phoneDescription: e.target.value })}
          placeholder={t("orgSettings.fiscalInfo.phoneDescriptionPlaceholder")}
        />
      </div>
    </div>
  );
}
