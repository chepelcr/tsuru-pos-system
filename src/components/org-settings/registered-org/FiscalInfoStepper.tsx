import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { useSaveRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { HaciendaInfoStep } from "./HaciendaInfoStep";
import { ContactStep } from "./ContactStep";
import { ResidenceStep } from "./ResidenceStep";
import { ActivitiesStep } from "./ActivitiesStep";
import { ReviewStep } from "./ReviewStep";
import {
  EMPTY_FISCAL_FORM,
  toPayload,
  type FiscalInfoFormState,
} from "./types";
import type { TaxpayerResponse } from "@/services/data-api/dtos/consumer-identifications";
import type { RegisteredOrgActivity } from "@/types/registeredOrganization";

interface FiscalInfoStepperProps {
  orgId: string;
  onSaved: () => void;
}

/**
 * Fiscal info wizard. Flow (after the parent's welcome ghost overlay):
 *
 *   0  Hacienda info  — identification entry + read-only post-lookup display
 *                       (legal name, regime, situation, activities count). Gates
 *                       on the org actually being registered with Hacienda.
 *   1  Contact        — email + phone (country select stores ISO; +CC derived).
 *   2  Residence      — cascading state → county → district → neighborhood.
 *                       Country defaults to the nationality ISO (no select).
 *   3  Activities     — user picks which Hacienda activities apply to this org.
 *   4  Review + Save  — final summary, submit.
 *
 * Identification, name, and fiscal situation used to be three separate steps;
 * they're consolidated into step 0 because the user can't edit Hacienda-sourced
 * data anyway — labels-only display is faster and avoids the misconception
 * that the user can override what Hacienda reports.
 */
export function FiscalInfoStepper({ orgId, onSaved }: FiscalInfoStepperProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<FiscalInfoFormState>(EMPTY_FISCAL_FORM);
  const [current, setCurrent] = useState(0);

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
        name: data.name || f.name,
        regimeCode: data.regime?.code ?? f.regimeCode,
        regimeDescription: data.regime?.description ?? f.regimeDescription,
        situationStatus: data.situation?.status ?? f.situationStatus,
        isDebtor: data.situation?.is_debtor ?? f.isDebtor,
        isNonCompliant: data.situation?.is_non_compliant ?? f.isNonCompliant,
        taxAdministration: data.situation?.tax_administration ?? f.taxAdministration,
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
      { id: "contact", titleKey: "orgSettings.fiscalInfo.steps.contact" },
      { id: "residence", titleKey: "orgSettings.fiscalInfo.steps.residence" },
      { id: "activities", titleKey: "orgSettings.fiscalInfo.steps.activities" },
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
    !!form.name &&
    !!form.regimeCode &&
    !isUnregisteredRegime &&
    form.activities.length > 0;

  const canAdvance = useMemo(() => {
    switch (current) {
      case 0: // Hacienda info — gated on actually being registered
        return haciendaInfoReady;
      default:
        return true;
    }
  }, [current, haciendaInfoReady]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(toPayload(form));
      onSaved();
    } catch {
      // Error surfaces via saveMutation.isError below the buttons.
    }
  };

  return (
    <div className="space-y-6">
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
        {current === 1 && <ContactStep form={form} patch={patch} />}
        {current === 2 && <ResidenceStep form={form} patch={patch} />}
        {current === 3 && <ActivitiesStep form={form} patch={patch} />}
        {current === 4 && <ReviewStep form={form} />}
      </Stepper>

      {/* Inline validation hint — augments the per-step gates the user sees. */}
      {!canAdvance && current === 0 && form.idNumber.length === 0 && (
        <p className="t-xs text-muted-foreground">
          <Icon name="info" size={12} className="inline-block mr-1 align-text-bottom" />
          {t("orgSettings.fiscalInfo.requiredId")}
        </p>
      )}

      {saveMutation.isError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
          <span className="t-sm text-destructive">
            {t("orgSettings.fiscalInfo.saveError")}
          </span>
        </div>
      )}
    </div>
  );
}
