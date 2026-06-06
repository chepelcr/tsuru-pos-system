import { useEffect, useState } from "react";
import { User, Phone, MapPin, Layers } from "lucide-react";
import { Drawer, Icon, Spinner } from "@/components/ui";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSaveRegisteredOrganization } from "@/hooks/useRegisteredOrganization";
import { isIdentificationLengthValid } from "@/lib/identification";
import { HaciendaInfoStep } from "./HaciendaInfoStep";
import { ContactStep } from "./ContactStep";
import { ResidenceStep } from "./ResidenceStep";
import { ActivitiesStep } from "./ActivitiesStep";
import {
  EMPTY_FISCAL_FORM,
  fromRegisteredOrganization,
  toPayload,
  type FiscalInfoFormState,
} from "./types";
import type { RegisteredOrganization, RegisteredOrgActivity } from "@/types/registeredOrganization";
import type { TaxpayerResponse } from "@/services/data-api/dtos/consumer-identifications";

interface FiscalInfoEditDrawerProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  reg: RegisteredOrganization | null | undefined;
}

/**
 * Side drawer that hosts all step components inside collapsible SectionWrappers.
 * Pre-populates from the existing record on open, mirrors the save path of the
 * stepper, and closes on success.
 */
export function FiscalInfoEditDrawer({ open, onClose, orgId, reg }: FiscalInfoEditDrawerProps) {
  const { t } = useLanguage();
  const saveMutation = useSaveRegisteredOrganization(orgId);

  const [form, setForm] = useState<FiscalInfoFormState>(EMPTY_FISCAL_FORM);
  const [expanded, setExpanded] = useState({
    haciendaInfo: true,
    contact: false,
    residence: false,
    activities: false,
  });

  useEffect(() => {
    if (open) {
      setForm(reg ? fromRegisteredOrganization(reg) : EMPTY_FISCAL_FORM);
      setExpanded({
        haciendaInfo: true,
        contact: false,
        residence: false,
        activities: false,
      });
    }
  }, [open, reg]);

  const patch = (next: Partial<FiscalInfoFormState>) =>
    setForm((f) => ({ ...f, ...next }));

  const handleClearAll = () => setForm(EMPTY_FISCAL_FORM);

  const toggle = (k: keyof typeof expanded) =>
    setExpanded((s) => ({ ...s, [k]: !s[k] }));

  const handleHaciendaLookup = (data: TaxpayerResponse) => {
    setForm((f) => {
      const activities: RegisteredOrgActivity[] = (data.activities ?? []).map((a) => ({
        code: a.code,
        description: a.description ?? null,
        status: a.status ?? null,
        type: a.type ?? null,
      }));
      // Hacienda is the source of truth — replace the activities list on
      // every lookup so we never end up with stale entries on edit.
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
        selectedActivityCodes: new Set(activities.map((a) => a.code)),
        fromHacienda: {
          name: !!data.name,
          regime: !!data.regime?.code || !!data.regime?.description,
          situation: data.situation != null,
          activities: activities.length > 0,
        },
      };
    });
  };

  const canSave =
    !saveMutation.isPending &&
    isIdentificationLengthValid(form.idCode, form.idNumber) &&
    form.name.trim().length > 0;

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(toPayload(form));
      onClose();
    } catch {
      // surfaces via saveMutation.isError
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("orgSettings.fiscalInfo.drawer.title")}
      subtitle={t("orgSettings.fiscalInfo.drawer.subtitle")}
      icon="user"
      width="min(640px, 100vw)"
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <button
            className="btn btn-outline btn-sm"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saveMutation.isPending ? (
              <>
                <Spinner size={14} />
                {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <SectionWrapper
          title={t("orgSettings.fiscalInfo.steps.haciendaInfo")}
          icon={User}
          isExpanded={expanded.haciendaInfo}
          onToggle={() => toggle("haciendaInfo")}
        >
          <HaciendaInfoStep
            form={form}
            patch={patch}
            onClearAll={handleClearAll}
            onHaciendaLookup={handleHaciendaLookup}
            compact
          />
        </SectionWrapper>

        <SectionWrapper
          title={t("orgSettings.fiscalInfo.steps.contact")}
          icon={Phone}
          isExpanded={expanded.contact}
          onToggle={() => toggle("contact")}
        >
          <ContactStep form={form} patch={patch} compact />
        </SectionWrapper>

        <SectionWrapper
          title={t("orgSettings.fiscalInfo.steps.residence")}
          icon={MapPin}
          isExpanded={expanded.residence}
          onToggle={() => toggle("residence")}
        >
          <ResidenceStep form={form} patch={patch} compact />
        </SectionWrapper>

        <SectionWrapper
          title={t("orgSettings.fiscalInfo.steps.activities")}
          icon={Layers}
          isExpanded={expanded.activities}
          onToggle={() => toggle("activities")}
          badge={form.selectedActivityCodes.size || undefined}
        >
          <ActivitiesStep form={form} patch={patch} compact />
        </SectionWrapper>

        {saveMutation.isError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">
              {t("orgSettings.fiscalInfo.saveError")}
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
