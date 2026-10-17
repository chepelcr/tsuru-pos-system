import { useCallback, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardBody, Icon } from "@/components/ui";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { useSaveRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { HaciendaInfoStep } from "./HaciendaInfoStep";
import { ContactStep } from "./ContactStep";
import { ResidenceStep } from "./ResidenceStep";
import { ReviewStep } from "./ReviewStep";
import {
  EMPTY_FISCAL_FORM,
  isFiscalEmailValid,
  toPayload,
  type FiscalInfoFormState,
} from "./types";
import type { TaxpayerResponse } from "@/services/data-api/dtos/consumer-identifications";
import type { RegisteredOrgActivity } from "@/types/registeredOrganization";
import { isIdentificationLengthValid } from "@/lib/identification";

interface FiscalInfoStepperProps {
  orgId: string;
  onSaved: () => void;
}

/**
 * Three stages after the unnumbered welcome: Hacienda information,
 * contact/residence, and review/save. Hacienda activities are read-only and
 * appear in the review; they do not require a separate empty action step.
 */
export function FiscalInfoStepper({ orgId, onSaved }: FiscalInfoStepperProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FiscalInfoFormState>(EMPTY_FISCAL_FORM);
  const [current, setCurrent] = useState(0);
  const saveInFlight = useRef(false);

  const saveMutation = useSaveRegisteredOrganization(orgId);

  const patch = useCallback((next: Partial<FiscalInfoFormState>) => {
    setForm((f) => ({ ...f, ...next }));
  }, []);

  const handleClearAll = useCallback(() => {
    setForm(EMPTY_FISCAL_FORM);
    setCurrent(0);
  }, []);

  const handleHaciendaLookup = useCallback((data: TaxpayerResponse) => {
    setForm((f) => {
      const activities: RegisteredOrgActivity[] = (data.activities ?? []).map((a) => ({
        code: a.code,
        description: a.description ?? null,
        status: a.status ?? null,
        type: a.type ?? null,
      }));
      // Mark every Hacienda-returned activity as "selected" for backwards
      // compat with the form state. The user no longer toggles them — all
      // activities are persisted on save.
      const selected = new Set<string>(activities.map((a) => a.code));
      return {
        ...f,
        name: data.name || "",
        regimeCode: data.regime?.code ?? "",
        regimeDescription: data.regime?.description ?? "",
        situationStatus: data.situation?.status ?? "",
        isDebtor: data.situation?.is_debtor ?? false,
        isNonCompliant: data.situation?.is_non_compliant ?? false,
        taxAdministration: data.situation?.tax_administration ?? "",
        activities,
        selectedActivityCodes: selected,
        fromHacienda: {
          name: !!data.name,
          regime: !!data.regime?.code || !!data.regime?.description,
          situation: data.situation != null,
          activities: activities.length > 0,
        },
      };
    });
  }, []);

  const steps: StepperStep[] = useMemo(
    () => [
      { id: "hacienda", titleKey: "orgSettings.fiscalInfo.steps.haciendaInfo" },
      { id: "contact-residence", titleKey: "orgSettings.fiscalInfo.steps.contactResidence" },
      { id: "review", titleKey: "orgSettings.fiscalInfo.steps.review" },
    ],
    [],
  );

  // ── Validation gates ──────────────────────────────────────────────────────
  const isUnregisteredRegime = useMemo(() => {
    const code = (form.regimeCode || "").trim();
    const desc = (form.regimeDescription || "").trim().toLowerCase();
    return code === "0" || desc.includes("no inscrito");
  }, [form.regimeCode, form.regimeDescription]);

  const haciendaInfoReady =
    isIdentificationLengthValid(form.idCode, form.idNumber) &&
    !!form.name.trim() &&
    !!form.regimeCode &&
    !isUnregisteredRegime &&
    form.activities.length > 0;

  const contactReady =
    isFiscalEmailValid(form.email) &&
    form.phoneDescription.length <= 50 &&
    form.address.length <= 1000;
  const canAdvance = haciendaInfoReady && (current === 0 || contactReady);

  const handleSave = async () => {
    if (saveInFlight.current || !haciendaInfoReady || !contactReady) return;
    saveInFlight.current = true;
    try {
      await saveMutation.mutateAsync(toPayload(form));
      onSaved();
    } catch {
      // Error surfaces via saveMutation.isError above the buttons.
    } finally {
      saveInFlight.current = false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardBody className="!p-4 sm:!p-6">
        <Stepper
          steps={steps}
          current={current}
          canAdvance={canAdvance}
          isSaving={saveMutation.isPending}
          onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
          onNext={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          onSave={handleSave}
        >
          {current === 0 && (
            <HaciendaInfoStep
              form={form}
              patch={patch}
              onClearAll={handleClearAll}
              onHaciendaLookup={handleHaciendaLookup}
            />
          )}
          {current === 1 && (
            <div className="space-y-6">
              <ContactStep form={form} patch={patch} />
              <div className="border-t border-border pt-6">
                <ResidenceStep form={form} patch={patch} />
              </div>
            </div>
          )}
          {current === 2 && <ReviewStep form={form} />}

          {!canAdvance && current === 0 && form.idNumber.length === 0 && (
            <p className="t-xs text-muted-foreground">
              <Icon name="info" size={12} className="inline-block mr-1 align-text-bottom" />
              {t("orgSettings.fiscalInfo.requiredId")}
            </p>
          )}

          {saveMutation.isError && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
              <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
              <span className="t-sm text-destructive">
                {t("orgSettings.fiscalInfo.saveError")}
              </span>
            </div>
          )}
        </Stepper>
      </CardBody>
    </Card>
  );
}
