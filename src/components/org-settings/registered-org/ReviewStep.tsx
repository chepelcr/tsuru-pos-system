import { useLanguage } from "@/contexts/LanguageContext";
import { Badge, Icon } from "@/components/ui";
import { formatIdentification } from "@/lib/identification";
import { useLocationNames } from "./useLocationNames";
import type { FiscalInfoFormState } from "./types";

interface ReviewStepProps {
  form: FiscalInfoFormState;
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="t-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`t-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1">
      <div className="h-px flex-1 bg-border" />
      <span className="t-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {children}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ReviewStep({ form }: ReviewStepProps) {
  const { t } = useLanguage();
  const names = useLocationNames({
    iso: form.residenceCountryCode || "188",
    stateId: form.stateId,
    countyId: form.countyId,
    districtId: form.districtId,
    neighborhoodId: form.neighborhoodId,
  });

  const phoneDisplay = form.phoneNumber
    ? `+${form.phoneCountryCode || "506"}${form.phoneAreaCode ? ` ${form.phoneAreaCode}` : ""} · ${form.phoneNumber}`
    : "";

  const residenceParts = [names.state, names.county, names.district, names.neighborhood]
    .filter(Boolean)
    .join(" / ");

  const selectedActivities = form.activities.filter((a) =>
    form.selectedActivityCodes.has(a.code),
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="t-h3 mb-1">{t("orgSettings.fiscalInfo.review.title")}</h2>
        <p className="t-sm text-muted-foreground">
          {t("orgSettings.fiscalInfo.review.subtitle")}
        </p>
      </header>

      <div className="card p-5">
        <Row
          label={t("orgSettings.fiscalInfo.legalName")}
          value={form.name}
        />
        <Row
          label={t("orgSettings.fiscalInfo.idType")}
          value={`${form.idCode} · ${formatIdentification(form.idCode, form.idNumber)}`}
          mono
        />
        <Row
          label={t("orgSettings.fiscalInfo.regimeDesc")}
          value={form.regimeDescription || form.regimeCode || "—"}
        />
        <Row
          label={t("orgSettings.fiscalInfo.situationStatus")}
          value={
            form.situationStatus ? (
              <Badge variant={form.isDebtor || form.isNonCompliant ? "warning" : "success"}>
                {form.situationStatus}
              </Badge>
            ) : (
              "—"
            )
          }
        />

        <SectionLabel>{t("orgSettings.fiscalInfo.summary.contact")}</SectionLabel>
        <Row
          label={t("orgSettings.fiscalInfo.email")}
          value={form.email || t("orgSettings.fiscalInfo.summary.noEmail")}
        />
        <Row
          label={t("orgSettings.fiscalInfo.phoneNumber")}
          value={phoneDisplay || t("orgSettings.fiscalInfo.summary.noPhone")}
        />

        <SectionLabel>{t("orgSettings.fiscalInfo.summary.residence")}</SectionLabel>
        <Row
          label={`${t("orgSettings.fiscalInfo.state")} / ${t("orgSettings.fiscalInfo.county")}`}
          value={[names.state, names.county].filter(Boolean).join(" / ") || "—"}
        />
        <Row
          label={`${t("orgSettings.fiscalInfo.district")} / ${t("orgSettings.fiscalInfo.neighborhood")}`}
          value={[names.district, names.neighborhood].filter(Boolean).join(" / ") || "—"}
        />
        <Row
          label={t("orgSettings.fiscalInfo.address")}
          value={form.address || "—"}
        />

        <SectionLabel>{t("orgSettings.fiscalInfo.summary.activities")}</SectionLabel>
        {selectedActivities.length === 0 ? (
          <p className="t-sm text-muted-foreground italic py-2">
            {t("orgSettings.fiscalInfo.summary.noActivities")}
          </p>
        ) : (
          <ul className="py-2 space-y-1.5">
            {selectedActivities.map((a) => (
              <li key={a.code} className="flex items-start gap-2 t-sm">
                <Icon name="check" size={13} className="text-success mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-mono font-semibold mr-2">{a.code}</span>
                  <span className="text-muted-foreground">{a.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* For screen readers — residence quick line */}
        {residenceParts && <span className="sr-only">{residenceParts}</span>}
      </div>
    </div>
  );
}
