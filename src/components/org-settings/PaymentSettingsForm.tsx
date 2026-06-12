import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgPaymentSettings } from "@/types";

// Currency codes are Hacienda/locale identifiers, not translatable copy (§10.3).
const CURRENCIES = ["USD", "CRC", "EUR", "GBP", "MXN"] as const;

const buildSchema = (t: (k: string) => string) =>
  z.object({
    currency: z.string().min(1, t("orgSettings.payment.currencyRequired")),
    cashOnDeliveryEnabled: z.boolean(),
    bankTransferEnabled: z.boolean(),
    bankAccountDetails: z.string().optional(),
  });

type PaymentValues = z.infer<ReturnType<typeof buildSchema>>;

interface PaymentSettingsFormProps {
  initialValues?: OrgPaymentSettings;
  onSubmit: (data: OrgPaymentSettings) => Promise<void>;
  isSaving?: boolean;
  /** RBAC gate from the page call site — hides the save button when false. */
  canSave?: boolean;
}

/**
 * Storefront checkout-payment config. Currency select + two toggle rows
 * (cash on delivery / bank transfer) + a conditional bank-account textarea.
 * Re-skinned from the dashboard's shadcn form to POS border-row toggles.
 */
export function PaymentSettingsForm({
  initialValues,
  onSubmit,
  isSaving = false,
  canSave = true,
}: PaymentSettingsFormProps) {
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      currency: initialValues?.currency ?? "USD",
      cashOnDeliveryEnabled: initialValues?.cashOnDeliveryEnabled ?? false,
      bankTransferEnabled: initialValues?.bankTransferEnabled ?? false,
      bankAccountDetails: initialValues?.bankAccountDetails ?? "",
    },
  });

  const bankTransferEnabled = watch("bankTransferEnabled");

  const submit = async (data: PaymentValues) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="card p-5 space-y-4">
      <FormField
        label={t("orgSettings.payment.currency")}
        required
        error={errors.currency?.message}
      >
        <select className="pp-input w-full" {...register("currency")}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {`${c} — ${t(`orgSettings.payment.currencyName.${c}`)}`}
            </option>
          ))}
        </select>
        <span className="block t-xs text-muted-foreground mt-1">
          {t("orgSettings.payment.currencyDesc")}
        </span>
      </FormField>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 flex-shrink-0"
          {...register("cashOnDeliveryEnabled")}
        />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.payment.cashOnDelivery")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.payment.cashOnDeliveryDesc")}
          </span>
        </div>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 flex-shrink-0"
          {...register("bankTransferEnabled")}
        />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.payment.bankTransfer")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.payment.bankTransferDesc")}
          </span>
        </div>
      </label>

      {bankTransferEnabled && (
        <FormField
          label={t("orgSettings.payment.bankAccountDetails")}
          error={errors.bankAccountDetails?.message}
        >
          <textarea
            className="pp-input w-full"
            rows={4}
            placeholder={t("orgSettings.payment.bankAccountDetailsPlaceholder")}
            {...register("bankAccountDetails")}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.payment.bankAccountDetailsDesc")}
          </span>
        </FormField>
      )}

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
