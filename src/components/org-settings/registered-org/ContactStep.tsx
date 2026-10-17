import { useLanguage } from "@/contexts/LanguageContext";
import { PhoneField } from "@/components/ui";
import type { FiscalInfoFormState } from "./types";
import { fiscalPhoneCountryIso, isFiscalEmailValid } from "./types";

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

  const isoCountryCode = fiscalPhoneCountryIso(form.phoneCountryCode);
  const emailInvalid = !isFiscalEmailValid(form.email);

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
          maxLength={255}
          aria-invalid={emailInvalid}
          aria-describedby={emailInvalid ? "reg-org-email-error" : undefined}
          value={form.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder={t("orgSettings.fiscalInfo.emailPlaceholder")}
        />
        {emailInvalid && <p id="reg-org-email-error" role="alert" className="t-xs text-destructive mt-1.5">{t("auth.validation.emailRequired")}</p>}
      </div>

      {/* Country (flag + dial code) + phone number — shared PhoneField. */}
      <div>
        <label className="pp-label" htmlFor="reg-org-phone-number">{t("orgSettings.fiscalInfo.phoneNumber")}</label>
        <div className="mt-1">
          <PhoneField
            numberId="reg-org-phone-number"
            countryCode={isoCountryCode}
            number={form.phoneNumber}
            onChange={({ countryCode, number }) =>
              patch({ phoneCountryCode: countryCode, phoneAreaCode: "", phoneNumber: number })
            }
          />
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
          maxLength={50}
          value={form.phoneDescription}
          onChange={(e) => patch({ phoneDescription: e.target.value })}
          placeholder={t("orgSettings.fiscalInfo.phoneDescriptionPlaceholder")}
        />
      </div>
    </div>
  );
}
