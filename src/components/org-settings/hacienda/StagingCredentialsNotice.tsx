import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui";
import { IS_STAGING } from "@/lib/environment";

export function StagingCredentialsNotice() {
  const { t } = useLanguage();
  if (!IS_STAGING) return null;

  return <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
    <Icon name="alertCircle" size={16} className="mt-0.5 shrink-0 text-foreground" />
    <p className="t-sm text-foreground">{t("orgSettings.hacienda.stagingNotice")}</p>
  </div>;
}
