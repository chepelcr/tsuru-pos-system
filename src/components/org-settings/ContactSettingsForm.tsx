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
    businessHours: z.string().optional(),
    facebookUrl: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    instagramUrl: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    twitterUrl: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
    whatsappNumber: z.string().optional(),
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
  canSave = true,
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
      businessHours: initialValues?.businessHours ?? "",
      facebookUrl: initialValues?.facebookUrl ?? "",
      instagramUrl: initialValues?.instagramUrl ?? "",
      twitterUrl: initialValues?.twitterUrl ?? "",
      whatsappNumber: initialValues?.whatsappNumber ?? "",
    },
  });

  // Phone (country + number) via the shared PhoneField, and structured location
  // via the shared LocationSelect — both controlled, merged into the payload on
  // submit. LocationSelect's "otras señas" textarea is the single address field.
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initialValues?.phoneCountryCode ?? CountryISO.COSTA_RICA,
  );
  const [location, setLocation] = useState<LocationData>({
    state_id: initialValues?.stateId ?? null,
    county_id: initialValues?.countyId ?? null,
    district_id: initialValues?.districtId ?? null,
    neighborhood_id: initialValues?.neighborhoodId ?? null,
    address: initialValues?.address ?? "",
  });

  const submit = async (data: ContactValues) => {
    await onSubmit({
      ...data,
      phone,
      phoneCountryCode,
      address: location.address ?? "",
      stateId: location.state_id,
      countyId: location.county_id,
      districtId: location.district_id,
      neighborhoodId: location.neighborhood_id,
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
              countryCode={phoneCountryCode}
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

        <FormField label={t("orgSettings.contact.businessHours")} error={errors.businessHours?.message}>
          <textarea
            className="pp-input w-full"
            rows={3}
            placeholder={t("orgSettings.contact.businessHoursPlaceholder")}
            {...register("businessHours")}
          />
        </FormField>
      </SectionWrapper>

      <SectionWrapper title={t("orgSettings.contact.socialMedia")} icon={Share2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("orgSettings.contact.facebook")} error={errors.facebookUrl?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.facebookPlaceholder")}
              {...register("facebookUrl")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.instagram")} error={errors.instagramUrl?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.instagramPlaceholder")}
              {...register("instagramUrl")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.twitter")} error={errors.twitterUrl?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.twitterPlaceholder")}
              {...register("twitterUrl")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.whatsapp")} error={errors.whatsappNumber?.message}>
            <input
              className="pp-input w-full"
              type="tel"
              placeholder={t("orgSettings.contact.whatsappPlaceholder")}
              {...register("whatsappNumber")}
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
