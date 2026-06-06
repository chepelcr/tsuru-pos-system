import { useLanguage } from "@/contexts/LanguageContext";
import { Badge, Icon } from "@/components/ui";
import type { FiscalInfoFormState } from "./types";

interface ActivitiesStepProps {
  form: FiscalInfoFormState;
  patch?: (next: Partial<FiscalInfoFormState>) => void;
  compact?: boolean;
}

/**
 * Activities are sourced exclusively from the Hacienda lookup — the user
 * never toggles or adds them by hand. They're displayed read-only here so the
 * user can confirm what will be stored. All activities returned by Hacienda
 * are persisted on save (`selectedActivityCodes` is wired to "everything"
 * by the parent on lookup).
 *
 * The `patch` prop is accepted for API parity with the other step components
 * but is intentionally unused.
 */
export function ActivitiesStep({ form, compact = false }: ActivitiesStepProps) {
  const { t } = useLanguage();
  const isEmpty = form.activities.length === 0;

  return (
    <div className="space-y-5">
      {!compact && (
        <header>
          <h2 className="t-h3 mb-1">{t("orgSettings.fiscalInfo.activities.title")}</h2>
          <p className="t-sm text-muted-foreground">
            {t("orgSettings.fiscalInfo.activities.subtitleReadonly")}
          </p>
        </header>
      )}

      {form.fromHacienda.activities && (
        <Badge variant="primary-soft">
          <Icon name="checkCircle" size={12} className="mr-1" />
          {t("orgSettings.fiscalInfo.fromHacienda")}
        </Badge>
      )}

      {isEmpty ? (
        <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20">
          <p className="t-sm text-muted-foreground">
            {t("orgSettings.fiscalInfo.activitiesEmpty")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {form.activities.map((a) => (
            <li key={a.code}>
              <div className="card p-3 flex items-start gap-3">
                <Icon name="checkCircle" size={16} className="text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="t-sm font-semibold">{a.code}</span>
                    {a.type && (
                      <Badge variant="secondary">
                        {t(`orgSettings.fiscalInfo.activityType.${a.type}`) || a.type}
                      </Badge>
                    )}
                    {a.status === "A" && (
                      <Badge variant="success">
                        {t("orgSettings.fiscalInfo.activityStatus.A")}
                      </Badge>
                    )}
                    {a.status && a.status !== "A" && (
                      <Badge variant="secondary">
                        {t(`orgSettings.fiscalInfo.activityStatus.${a.status}`) || a.status}
                      </Badge>
                    )}
                  </div>
                  {a.description && (
                    <div className="t-sm text-muted-foreground mt-1 leading-relaxed">
                      {a.description}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
