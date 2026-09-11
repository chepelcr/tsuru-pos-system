import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessType } from "@/hooks/useBusinessType";
import {
  HIDEABLE_MODULES,
  useOrgFeatureVisibility,
} from "@/store/orgFeatureVisibility";

interface FeatureVisibilityFieldsProps {
  orgId: string;
  disabled?: boolean;
}

/**
 * Which optional surfaces this organization wants to see.
 *
 * Every org has every feature — the business type stopped deciding that (see
 * `useBusinessType`). What remained was the legitimate half of the old gate: a
 * ferretería does not want a Mesas tab, and nine verticals presented flat to
 * everyone is its own kind of unusable.
 *
 * So this is a presentation preference, deliberately shaped like one: each row
 * is ON by default, the ones this business type leads with are marked, and
 * turning one off only hides the surface — the data, the endpoints and the
 * permissions are untouched, and the switch comes straight back.
 */
export function FeatureVisibilityFields({
  orgId,
  disabled,
}: FeatureVisibilityFieldsProps) {
  const { t } = useLanguage();
  const { emphasises } = useBusinessType();
  const hidden = useOrgFeatureVisibility((s) => s.hidden[orgId] ?? []);
  const setHidden = useOrgFeatureVisibility((s) => s.setHidden);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="label-section mb-1">{t("orgSettings.features.title")}</div>
        <p className="t-xs text-muted-foreground m-0">
          {t("orgSettings.features.hint")}
        </p>
      </div>

      <div className="grid-form">
        {HIDEABLE_MODULES.map((module) => {
          const isVisible = !hidden.includes(module);
          return (
            <label
              key={module}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={isVisible}
                disabled={disabled}
                onChange={(e) => setHidden(orgId, module, !e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block t-sm font-semibold">
                  {t(`feature.${module}`)}
                  {emphasises(module) && (
                    <span className="badge-mini badge-mini-primary ml-1.5">
                      {t("orgSettings.features.suggested")}
                    </span>
                  )}
                </span>
                <span className="block t-xs text-muted-foreground">
                  {t(`feature.${module}.hint`)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
