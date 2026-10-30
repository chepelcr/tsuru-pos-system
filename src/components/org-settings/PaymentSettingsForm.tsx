import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, Spinner } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrgPaymentSettings } from "@/types";
import { useAllCurrencies } from "@/hooks/useDataApi";

const buildSchema = (t: (k: string) => string) =>
  z.object({
    currency: z.string().min(1, t("orgSettings.payment.currencyRequired")),
    cash_on_delivery_enabled: z.boolean(),
    bank_transfer_enabled: z.boolean(),
    bank_account_details: z.string().optional(),
  });

type PaymentValues = z.infer<ReturnType<typeof buildSchema>>;

interface PaymentSettingsFormProps {
  formId?: string;
  hideActions?: boolean;
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
  formId,
  hideActions = false,
  initialValues,
  onSubmit,
  isSaving = false,
  canSave = false,
}: PaymentSettingsFormProps) {
  const { t, language } = useLanguage();
  const currencies = useAllCurrencies({ staleTime: 60 * 60 * 1000 });

  const {
    register,
    control,
    reset,
    setError,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      currency: initialValues?.currency?.trim().toUpperCase() || "CRC",
      cash_on_delivery_enabled: initialValues?.cash_on_delivery_enabled ?? false,
      bank_transfer_enabled: initialValues?.bank_transfer_enabled ?? false,
      bank_account_details: initialValues?.bank_account_details ?? "",
    },
  });

  useEffect(() => {
    reset({
      currency: initialValues?.currency?.trim().toUpperCase() || "CRC",
      cash_on_delivery_enabled: initialValues?.cash_on_delivery_enabled ?? false,
      bank_transfer_enabled: initialValues?.bank_transfer_enabled ?? false,
      bank_account_details: initialValues?.bank_account_details ?? "",
    }, { keepDirtyValues: true });
  }, [initialValues, reset]);

  const bank_transfer_enabled = watch("bank_transfer_enabled");

  const submit = async (data: PaymentValues) => {
    if (!currencies.data?.some(currency => currency.code === data.currency)) {
      setError("currency", { message: t("orgSettings.payment.currencyLoadError") });
      return;
    }
    await onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className={hideActions ? "space-y-4" : "card p-5 space-y-4"}>
      <FormField
        htmlFor="payment-currency"
        label={t("orgSettings.payment.currency")}
        required
        error={errors.currency?.message}
      >
        <Controller name="currency" control={control} render={({ field }) => (
          <Select id="payment-currency" className="pp-input w-full" value={field.value} name={field.name} onChange={event => field.onChange(event.target.value)} onBlur={field.onBlur} disabled={isSaving || currencies.isPending || currencies.isError}>
            <option value="" disabled>{t("orgSettings.payment.currencyPlaceholder")}</option>
            {(currencies.data ?? []).map(currency => <option key={currency.code} value={currency.code}>{`${currency.code} — ${language === "es" ? currency.currency_name_es : currency.currency_name_en}`}</option>)}
          </Select>
        )} />
        {currencies.isError && <div role="alert" className="t-sm text-destructive mt-2">{t("orgSettings.payment.currencyLoadError")} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void currencies.refetch()}>{t("common.retry")}</button></div>}
        <span className="block t-xs text-muted-foreground mt-1">
          {t("orgSettings.payment.currencyDesc")}
        </span>
      </FormField>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 flex-shrink-0"
          {...register("cash_on_delivery_enabled")}
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
          {...register("bank_transfer_enabled")}
        />
        <div className="min-w-0">
          <span className="t-sm font-medium block">{t("orgSettings.payment.bankTransfer")}</span>
          <span className="t-xs text-muted-foreground block mt-0.5">
            {t("orgSettings.payment.bankTransferDesc")}
          </span>
        </div>
      </label>

      {bank_transfer_enabled && (
        <FormField
          label={t("orgSettings.payment.bankAccountDetails")}
          error={errors.bank_account_details?.message}
        >
          <textarea
            className="pp-input w-full"
            rows={4}
            placeholder={t("orgSettings.payment.bankAccountDetailsPlaceholder")}
            {...register("bank_account_details")}
          />
          <span className="block t-xs text-muted-foreground mt-1">
            {t("orgSettings.payment.bankAccountDetailsDesc")}
          </span>
        </FormField>
      )}

      {canSave && !hideActions && (
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
