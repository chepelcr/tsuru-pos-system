import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MediaPicker, Select, Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgThemeBranding } from "@/types";
import { EDITOR_COLORS } from "@/theme/editorColors";

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
    primary_color: z
      .string()
      .min(4, t("orgSettings.branding.colorRequired"))
      .regex(HEX_RE, t("orgSettings.branding.colorInvalid")),
    secondary_color: z
      .string()
      .min(4, t("orgSettings.branding.colorRequired"))
      .regex(HEX_RE, t("orgSettings.branding.colorInvalid")),
    font_family: z.string().optional(),
    logo_url: z.string().url(t("orgSettings.branding.urlInvalid")).optional().or(z.literal("")),
    favicon_url: z.string().url(t("orgSettings.branding.urlInvalid")).optional().or(z.literal("")),
    loading_icon: z.string().optional(),
    product_fallback_icon: z.string().optional(),
  });

type BrandingValues = z.infer<ReturnType<typeof buildSchema>>;

interface BrandingSettingsFormProps {
  initialValues?: OrgThemeBranding;
  onSubmit: (data: OrgThemeBranding) => Promise<void>;
  isSaving?: boolean;
  /** RBAC gate from the page call site — hides the save button when false. */
  canSave?: boolean;
}

/**
 * STOREFRONT branding form (settings.theme) — logo / brand colors / fonts for
 * the public customer-facing store. DISTINCT from the POS UI theme (OrgThemePage
 * + ThemeContext); this form does NOT call setThemeId / useUpdateOrgTheme.
 *
 * Logo & favicon use the org media library (MediaPicker → S3 upload + gallery);
 * the stored value is the asset's absolute CloudFront URL.
 */
export function BrandingSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
  canSave = true,
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
      primary_color: initialValues?.primary_color || EDITOR_COLORS.brandPrimary,
      secondary_color: initialValues?.secondary_color || EDITOR_COLORS.brandSecondary,
      font_family: initialValues?.font_family || "Inter",
      logo_url: initialValues?.logo_url ?? "",
      favicon_url: initialValues?.favicon_url ?? "",
      loading_icon: initialValues?.loading_icon || "Sparkles",
      product_fallback_icon: initialValues?.product_fallback_icon || "Sparkles",
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
    name: "primary_color" | "secondary_color";
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
              value={HEX_RE.test(field.value) ? field.value : EDITOR_COLORS.black}
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
          name="primary_color"
          label={t("orgSettings.branding.primaryColor")}
          desc={t("orgSettings.branding.primaryColorDesc")}
          placeholder={EDITOR_COLORS.brandPrimary}
          error={errors.primary_color?.message}
        />
        <ColorRow
          name="secondary_color"
          label={t("orgSettings.branding.secondaryColor")}
          desc={t("orgSettings.branding.secondaryColorDesc")}
          placeholder={EDITOR_COLORS.brandSecondary}
          error={errors.secondary_color?.message}
        />
      </div>

      <FormField label={t("orgSettings.branding.fontFamily")} error={errors.font_family?.message}>
        <Select className="pp-input w-full" {...register("font_family")}>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <span className="block t-xs text-muted-foreground mt-1">
          {t("orgSettings.branding.fontFamilyDesc")}
        </span>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("orgSettings.branding.logoUrl")} error={errors.logo_url?.message}>
          <Controller
            control={control}
            name="logo_url"
            render={({ field }) => (
              <MediaPicker value={field.value ?? ""} onChange={field.onChange} />
            )}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.logoUrlDesc")}
          </span>
        </FormField>

        <FormField label={t("orgSettings.branding.faviconUrl")} error={errors.favicon_url?.message}>
          <Controller
            control={control}
            name="favicon_url"
            render={({ field }) => (
              <MediaPicker value={field.value ?? ""} onChange={field.onChange} />
            )}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.faviconUrlDesc")}
          </span>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("orgSettings.branding.loadingIcon")} error={errors.loading_icon?.message}>
          <Select className="pp-input w-full" {...register("loading_icon")}>
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.loadingIconDesc")}
          </span>
        </FormField>

        <FormField
          label={t("orgSettings.branding.productFallbackIcon")}
          error={errors.product_fallback_icon?.message}
        >
          <Select className="pp-input w-full" {...register("product_fallback_icon")}>
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.branding.productFallbackIconDesc")}
          </span>
        </FormField>
      </div>

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
