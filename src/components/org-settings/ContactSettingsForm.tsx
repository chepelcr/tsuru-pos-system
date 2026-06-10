import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Share2 } from "lucide-react";
import { Spinner } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgContactSettings } from "@/types";

const buildSchema = (t: (k: string) => string) =>
  z.object({
    email: z
      .string()
      .email(t("orgSettings.contact.emailInvalid"))
      .optional()
      .or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    businessHours: z.string().optional(),
    socialMedia: z
      .object({
        facebook: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
        instagram: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
        twitter: z.string().url(t("orgSettings.contact.urlInvalid")).optional().or(z.literal("")),
        whatsapp: z.string().optional(),
      })
      .optional(),
  });

type ContactValues = z.infer<ReturnType<typeof buildSchema>>;

interface ContactSettingsFormProps {
  initialValues?: OrgContactSettings;
  onSubmit: (data: OrgContactSettings) => Promise<void>;
  isSaving?: boolean;
}

/**
 * Storefront public contact + social-media form. Two SectionWrappers
 * ("Contacto" + "Redes sociales"). Re-skinned from the dashboard's shadcn form.
 */
export function ContactSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
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
      phone: initialValues?.phone ?? "",
      address: initialValues?.address ?? "",
      businessHours: initialValues?.businessHours ?? "",
      socialMedia: {
        facebook: initialValues?.socialMedia?.facebook ?? "",
        instagram: initialValues?.socialMedia?.instagram ?? "",
        twitter: initialValues?.socialMedia?.twitter ?? "",
        whatsapp: initialValues?.socialMedia?.whatsapp ?? "",
      },
    },
  });

  const submit = async (data: ContactValues) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SectionWrapper title={t("orgSettings.contact.title")} icon={MapPin}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("orgSettings.contact.email")} error={errors.email?.message}>
            <input
              className="pp-input w-full"
              type="email"
              placeholder={t("orgSettings.contact.emailPlaceholder")}
              {...register("email")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.phone")} error={errors.phone?.message}>
            <input
              className="pp-input w-full"
              type="tel"
              placeholder={t("orgSettings.contact.phonePlaceholder")}
              {...register("phone")}
            />
          </FormField>
        </div>

        <FormField label={t("orgSettings.contact.address")} error={errors.address?.message}>
          <textarea
            className="pp-input w-full"
            rows={3}
            placeholder={t("orgSettings.contact.addressPlaceholder")}
            {...register("address")}
          />
        </FormField>

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
          <FormField label={t("orgSettings.contact.facebook")} error={errors.socialMedia?.facebook?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.facebookPlaceholder")}
              {...register("socialMedia.facebook")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.instagram")} error={errors.socialMedia?.instagram?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.instagramPlaceholder")}
              {...register("socialMedia.instagram")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.twitter")} error={errors.socialMedia?.twitter?.message}>
            <input
              className="pp-input w-full"
              type="url"
              placeholder={t("orgSettings.contact.twitterPlaceholder")}
              {...register("socialMedia.twitter")}
            />
          </FormField>

          <FormField label={t("orgSettings.contact.whatsapp")} error={errors.socialMedia?.whatsapp?.message}>
            <input
              className="pp-input w-full"
              type="tel"
              placeholder={t("orgSettings.contact.whatsappPlaceholder")}
              {...register("socialMedia.whatsapp")}
            />
          </FormField>
        </div>
      </SectionWrapper>

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
    </form>
  );
}
