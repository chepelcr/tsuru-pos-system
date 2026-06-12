import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgShippingSettings } from "@/types";

const buildSchema = (t: (k: string) => string) =>
  z.object({
    freeShippingThreshold: z.number().min(0, t("orgSettings.shipping.minZero")),
    defaultShippingCost: z.number().min(0, t("orgSettings.shipping.minZero")),
    enableLocalPickup: z.boolean(),
    enableCorreosShipping: z.boolean(),
    enableUberFlash: z.boolean(),
  });

type ShippingValues = z.infer<ReturnType<typeof buildSchema>>;

interface ShippingSettingsFormProps {
  initialValues?: OrgShippingSettings;
  onSubmit: (data: OrgShippingSettings) => Promise<void>;
  isSaving?: boolean;
  /** RBAC gate from the page call site — hides the save button when false. */
  canSave?: boolean;
}

/**
 * Storefront delivery config. Two number inputs (free-shipping threshold +
 * default cost) and three toggle rows. Re-skinned from the dashboard form.
 */
export function ShippingSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
  canSave = true,
}: ShippingSettingsFormProps) {
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ShippingValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      freeShippingThreshold: initialValues?.freeShippingThreshold ?? 0,
      defaultShippingCost: initialValues?.defaultShippingCost ?? 0,
      enableLocalPickup: initialValues?.enableLocalPickup ?? false,
      enableCorreosShipping: initialValues?.enableCorreosShipping ?? false,
      enableUberFlash: initialValues?.enableUberFlash ?? false,
    },
  });

  const submit = async (data: ShippingValues) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="card p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("orgSettings.shipping.freeShippingThreshold")}
          error={errors.freeShippingThreshold?.message}
        >
          <Controller
            control={control}
            name="freeShippingThreshold"
            render={({ field }) => (
              <input
                className="pp-input w-full"
                type="number"
                min="0"
                step="0.01"
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.shipping.freeShippingThresholdDesc")}
          </span>
        </FormField>

        <FormField
          label={t("orgSettings.shipping.defaultShippingCost")}
          error={errors.defaultShippingCost?.message}
        >
          <Controller
            control={control}
            name="defaultShippingCost"
            render={({ field }) => (
              <input
                className="pp-input w-full"
                type="number"
                min="0"
                step="0.01"
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                onBlur={field.onBlur}
              />
            )}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.shipping.defaultShippingCostDesc")}
          </span>
        </FormField>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 flex-shrink-0" {...register("enableLocalPickup")} />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.shipping.enableLocalPickup")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.shipping.enableLocalPickupDesc")}
          </span>
        </div>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 flex-shrink-0" {...register("enableCorreosShipping")} />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.shipping.enableCorreosShipping")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.shipping.enableCorreosShippingDesc")}
          </span>
        </div>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input type="checkbox" className="mt-0.5 flex-shrink-0" {...register("enableUberFlash")} />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.shipping.enableUberFlash")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.shipping.enableUberFlashDesc")}
          </span>
        </div>
      </label>

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
