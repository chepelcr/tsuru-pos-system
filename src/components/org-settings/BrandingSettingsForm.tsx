import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgThemeBranding } from "@/types";

// Font and icon option values are data identifiers (not translatable copy, §10.3).
const FONT_FAMILIES = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Raleway",
  "Lato",
  "Nunito",
  "Playfair Display",
] as const;

const ICON_OPTIONS = [
  "Sparkles",
  "Leaf",
  "ShieldCheck",
  "Heart",
  "Award",
  "Users",
  "ShoppingBag",
  "Package",
  "Box",
  "Image",
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const buildSchema = (t: (k: string) => string) =>
  z.object({
    primaryColor: z
      .string()
      .min(4, t("orgSettings.branding.colorRequired"))
      .regex(HEX_RE, t("orgSettings.branding.colorInvalid")),
    secondaryColor: z
      .string()
      .min(4, t("orgSettings.branding.colorRequired"))
      .regex(HEX_RE, t("orgSettings.branding.colorInvalid")),
    fontFamily: z.string().optional(),
    logoUrl: z.string().url(t("orgSettings.branding.urlInvalid")).optional().or(z.literal("")),
    faviconUrl: z.string().url(t("orgSettings.branding.urlInvalid")).optional().or(z.literal("")),
    loadingIcon: z.string().optional(),
    productFallbackIcon: z.string().optional(),
  });

type BrandingValues = z.infer<ReturnType<typeof buildSchema>>;

interface BrandingSettingsFormProps {
  initialValues?: OrgThemeBranding;
  onSubmit: (data: OrgThemeBranding) => Promise<void>;
  isSaving?: boolean;
}

/**
 * STOREFRONT branding form (settings.theme) — logo / brand colors / fonts for
 * the public customer-facing store. DISTINCT from the POS UI theme (OrgThemePage
 * + ThemeContext); this form does NOT call setThemeId / useUpdateOrgTheme.
 *
 * v1 ships logo/favicon as plain URL text inputs.
 * TODO(verify-endpoint): image picker / S3 upload for logo & favicon is a
 * follow-up — POS ships components/ui/ImagePicker but its upload target is
 * unconfirmed. See plan §10.5.
 */
export function BrandingSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
}: BrandingSettingsFormProps) {
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BrandingValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      primaryColor: initialValues?.primaryColor || "#e91e63",
      secondaryColor: initialValues?.secondaryColor || "#9c27b0",
      fontFamily: initialValues?.fontFamily || "Inter",
      logoUrl: initialValues?.logoUrl ?? "",
      faviconUrl: initialValues?.faviconUrl ?? "",
      loadingIcon: initialValues?.loadingIcon || "Sparkles",
      productFallbackIcon: initialValues?.productFallbackIcon || "Sparkles",
    },
  });

  const submit = async (data: BrandingValues) => {
    await onSubmit(data);
  };

  // Color row: native <input type="color"> (data-driven value, allowed by §3.6)
  // paired with a hex text field. Both bind to the same RHF field.
  const ColorRow = ({
    name,
    label,
    desc,
    placeholder,
    error,
  }: {
    name: "primaryColor" | "secondaryColor";
    label: string;
    desc: string;
    placeholder: string;
    error?: string;
  }) => (
    <FormField label={label} required error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={HEX_RE.test(field.value) ? field.value : "#000000"}
              onChange={(e) => field.onChange(e.target.value)}
              className="h-10 w-14 rounded-md border border-border bg-card cursor-pointer flex-shrink-0 p-1"
              aria-label={label}
            />
            <input
              type="text"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              placeholder={placeholder}
              className="pp-input flex-1"
            />
          </div>
        )}
      />
      <span className="block t-xs text-muted-foreground mt-1">{desc}</span>
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="card p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorRow
          name="primaryColor"
          label={t("orgSettings.branding.primaryColor")}
          desc={t("orgSettings.branding.primaryColorDesc")}
          placeholder="#e91e63"
          error={errors.primaryColor?.message}
        />
        <ColorRow
          name="secondaryColor"
          label={t("orgSettings.branding.secondaryColor")}
          desc={t("orgSettings.branding.secondaryColorDesc")}
          placeholder="#9c27b0"
          error={errors.secondaryColor?.message}
        />
      </div>

      <FormField label={t("orgSettings.branding.fontFamily")} error={errors.fontFamily?.message}>
        <select className="pp-input w-full" {...register("fontFamily")}>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="block t-xs text-muted-foreground mt-1">
          {t("orgSettings.branding.fontFamilyDesc")}
        </span>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("orgSettings.branding.logoUrl")} error={errors.logoUrl?.message}>
          <input
            className="pp-input w-full"
            type="url"
            placeholder={t("orgSettings.branding.logoUrlPlaceholder")}
            {...register("logoUrl")}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.logoUrlDesc")}
          </span>
        </FormField>

        <FormField label={t("orgSettings.branding.faviconUrl")} error={errors.faviconUrl?.message}>
          <input
            className="pp-input w-full"
            type="url"
            placeholder={t("orgSettings.branding.faviconUrlPlaceholder")}
            {...register("faviconUrl")}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.faviconUrlDesc")}
          </span>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("orgSettings.branding.loadingIcon")} error={errors.loadingIcon?.message}>
          <select className="pp-input w-full" {...register("loadingIcon")}>
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.loadingIconDesc")}
          </span>
        </FormField>

        <FormField
          label={t("orgSettings.branding.productFallbackIcon")}
          error={errors.productFallbackIcon?.message}
        >
          <select className="pp-input w-full" {...register("productFallbackIcon")}>
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.productFallbackIconDesc")}
          </span>
        </FormField>
      </div>

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
