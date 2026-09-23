import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Share2 } from "lucide-react";
import { Spinner, LocationSelect, PhoneField } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import { CountryISO } from "@/lib/enums";
import type { OrgContactSettings } from "@/types";
import type { LocationData } from "@/types/location";

const buildSchema = (t: (k: string) => string) =>
  z.object({
    email: z
      .string()
      .email(t("orgSettings.contact.emailInvalid"))
      .optional()
      .or(z.literal("")),
    business_hours: z.string().optional(),
    facebook_url: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    instagram_url: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    twitter_url: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    whatsapp_number: z.string().optional(),
  });

type ContactValues = z.infer<ReturnType<typeof buildSchema>>;

interface ContactSettingsFormProps {
  initialValues?: OrgContactSettings;
  onSubmit: (data: OrgContactSettings) => Promise<void>;
  isSaving?: boolean;
  /** RBAC gate from the page call site — hides the save button when false. */
  canSave?: boolean;
}

/**
 * Storefront public contact + social-media form. Two SectionWrappers
 * ("Contacto" + "Redes sociales"). Re-skinned from the dashboard's shadcn form.
 */
export function ContactSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
  canSave = false,
}: ContactSettingsFormProps) {
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      email: initialValues?.email ?? "",
      business_hours: initialValues?.business_hours ?? "",
      facebook_url: initialValues?.facebook_url ?? "",
      instagram_url: initialValues?.instagram_url ?? "",
      twitter_url: initialValues?.twitter_url ?? "",
      whatsapp_number: initialValues?.whatsapp_number ?? "",
    },
  });

  // Phone (country + number) via the shared PhoneField, and structured location
  // via the shared LocationSelect — both controlled, merged into the payload on
  // submit. LocationSelect's "otras señas" textarea is the single address field.
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [phone_country_code, setPhoneCountryCode] = useState(
    initialValues?.phone_country_code ?? CountryISO.COSTA_RICA,
  );
  const [location, setLocation] = useState<LocationData>({
    state_id: initialValues?.state_id ?? null,
    county_id: initialValues?.county_id ?? null,
    district_id: initialValues?.district_id ?? null,
    neighborhood_id: initialValues?.neighborhood_id ?? null,
    address: initialValues?.address ?? "",
  });

  const submit = async (data: ContactValues) => {
    await onSubmit({
      ...data,
      phone,
      phone_country_code,
      address: location.address ?? "",
      state_id: location.state_id,
      county_id: location.county_id,
      district_id: location.district_id,
      neighborhood_id: location.neighborhood_id,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SectionWrapper title={t("orgSettings.contact.title")} icon={MapPin}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("common.email")} error={errors.email?.message}>
            <input
              className="pp-input w-full"
              type="email"
              placeholder={t("orgSettings.contact.emailPlaceholder")}
              {...register("email")}
            />
          </FormField>

          <FormField label={t("common.phone")}>
            <PhoneField
              countryCode={phone_country_code}
              number={phone}
              numberPlaceholder={t("orgSettings.contact.phonePlaceholder")}
              onChange={({ countryCode, number }) => {
                setPhoneCountryCode(countryCode);
                setPhone(number);
              }}
            />
          </FormField>
        </div>

        <div>
          <div className="t-label mb-2">{t("orgs.create.fields.location")}</div>
          <LocationSelect value={location} onChange={setLocation} />
        </div>

        <FormField label={t("orgSettings.contact.businessHours")} error={errors.business_hours?.message}>
          <textarea
            className="pp-input w-full"
            rows={3}
            placeholder={t("orgSettings.contact.businessHoursPlaceholder")}
            {...register("business_hours")}
          />
        </FormField>
      </SectionWrapper>

      <SectionWrapper title={t("orgSettings.contact.socialMedia")} icon={Share2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("orgSettings.contact.facebook")} error={errors.facebook_url?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.facebookPlaceholder")}
              {...register("facebook_url")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.instagram")} error={errors.instagram_url?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.instagramPlaceholder")}
              {...register("instagram_url")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.twitter")} error={errors.twitter_url?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.twitterPlaceholder")}
              {...register("twitter_url")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.whatsapp")} error={errors.whatsapp_number?.message}>
            <input
              className="pp-input w-full"
              type="tel"
              placeholder={t("orgSettings.contact.whatsappPlaceholder")}
              {...register("whatsapp_number")}
            />
          </FormField>
        </div>
      </SectionWrapper>

      {canSave && (
        <div className="flex justify-end pt-1">
          <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner size={14} /> {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </button>
        </div>
      )}
    </form>
  );
}
