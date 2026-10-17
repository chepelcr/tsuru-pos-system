import { CR, US } from "country-flag-icons/react/3x2";
import { useLanguageSwitch } from "@/hooks/useLanguageSwitch";
import { useLanguage } from "@/contexts/LanguageContext";

/** One rectangular, bundled language flag for every application header. */
export function LanguageToggle() {
  const { language, toggle } = useLanguageSwitch();
  const { t } = useLanguage();
  const Flag = language === "es" ? CR : US;

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost btn-sm btn-icon"
      aria-label={t("auth.toggleLanguage")}
    >
      <Flag className="block w-6 h-4 shrink-0 rounded-none" aria-hidden="true" />
    </button>
  );
}
