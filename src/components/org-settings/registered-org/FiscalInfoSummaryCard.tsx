import { useLanguage } from "@/contexts/LanguageContext";
import { Badge, Icon } from "@/components/ui";
import { formatIdentification } from "@/lib/identification";
import { useLocationNames } from "./useLocationNames";
import type { RegisteredOrganization } from "@/types/registeredOrganization";

interface FiscalInfoSummaryCardProps {
  reg: RegisteredOrganization;
  /** Undefined when the user lacks organization/update/fiscal-info — edit button hides. */
  onEdit?: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="t-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="t-sm font-medium text-right break-words">{value || "—"}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <div className="h-px flex-1 bg-border" />
      <span className="t-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FiscalInfoSummaryCard({ reg, onEdit }: FiscalInfoSummaryCardProps) {
  const { t } = useLanguage();

  const names = useLocationNames({
    iso: reg.residence?.country_code || "188",
    stateId: reg.residence?.state_id ?? null,
    countyId: reg.residence?.county_id ?? null,
    districtId: reg.residence?.district_id ?? null,
    neighborhoodId: reg.residence?.neighborhood_id ?? null,
  });

  const phoneDisplay = reg.phone?.number
    ? `+${reg.phone.country_code || "506"}${reg.phone.area_code ? ` ${reg.phone.area_code}` : ""} · ${reg.phone.number}`
    : "";

  const situationVariant: "success" | "warning" | "secondary" = reg.situation
    ? reg.situation.is_debtor || reg.situation.is_non_compliant
      ? "warning"
      : "success"
    : "secondary";

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="icon-pill w-9 h-9 icon-pill-primary-soft">
            <Icon name="user" size={16} />
          </div>
          <div>
            <div className="t-h4">{t("orgSettings.tab.fiscalInfo")}</div>
            <div className="t-xs text-muted-foreground">
              {t("orgSettings.fiscalInfo.summary.subtitle")}
            </div>
          </div>
        </div>
        {onEdit && (
          <button className="btn btn-outline btn-sm" onClick={onEdit}>
            <Icon name="edit" size={13} />
            {t("orgSettings.fiscalInfo.edit")}
          </button>
        )}
      </div>

      {/* Identity rows */}
      <Row label={t("orgSettings.fiscalInfo.legalName")} value={reg.name} />
      <Row
        label={t("orgSettings.fiscalInfo.idType")}
        value={
          <span className="font-mono">
            {reg.identification.code} · {formatIdentification(reg.identification.code, reg.identification.number)}
          </span>
        }
      />
      <Row
        label={t("orgSettings.fiscalInfo.regimeDesc")}
        value={reg.regime?.description || reg.regime?.code || "—"}
      />
      <Row
        label={t("orgSettings.fiscalInfo.situationStatus")}
        value={
          reg.situation?.status ? (
            <Badge variant={situationVariant}>{reg.situation.status}</Badge>
          ) : (
            "—"
          )
        }
      />

      {/* Contact */}
      <SectionDivider label={t("orgSettings.fiscalInfo.summary.contact")} />
      <Row
        label={t("orgSettings.fiscalInfo.email")}
        value={reg.email || t("orgSettings.fiscalInfo.summary.noEmail")}
      />
      <Row
        label={t("orgSettings.fiscalInfo.phoneNumber")}
        value={phoneDisplay || t("orgSettings.fiscalInfo.summary.noPhone")}
      />

      {/* Residence */}
      <SectionDivider label={t("orgSettings.fiscalInfo.summary.residence")} />
      {reg.residence ? (
        <>
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
            value={reg.residence.address || "—"}
          />
        </>
      ) : (
        <p className="t-sm text-muted-foreground italic py-2">
          {t("orgSettings.fiscalInfo.summary.noResidence")}
        </p>
      )}

      {/* Activities */}
      <SectionDivider label={t("orgSettings.fiscalInfo.summary.activities")} />
      {reg.activities.length === 0 ? (
        <p className="t-sm text-muted-foreground italic py-2">
          {t("orgSettings.fiscalInfo.summary.noActivities")}
        </p>
      ) : (
        <ul className="py-2 space-y-1.5">
          {reg.activities.map((a) => (
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
    </div>
  );
}
