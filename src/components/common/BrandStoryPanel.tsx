import { Sprout } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Brand origin-story panel shown beside the registration form (Tsuru = the Bribri
 * name for cacao). Content is the attributed Sibö/cacao cosmology — all copy lives in
 * LanguageContext (`auth.story.*`, ES + EN); colors are design-system tokens only.
 */
export function BrandStoryPanel() {
  const { t } = useLanguage();

  return (
    <aside className="rounded-2xl bg-primary text-primary-foreground p-8 lg:p-10 shadow-card h-full flex flex-col justify-center">
      <div className="mb-5 w-11 h-11 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
        <Sprout className="w-5 h-5" />
      </div>
      <h2 className="t-h3 mb-4">{t("auth.story.title")}</h2>
      <div className="flex flex-col gap-3 text-primary-foreground/90 t-sm leading-relaxed text-justify hyphens-auto">
        <p>{t("auth.story.p1")}</p>
        <p>{t("auth.story.p2")}</p>
        <p>{t("auth.story.p3")}</p>
      </div>
      <p className="mt-6 t-xs text-primary-foreground/60 border-t border-primary-foreground/15 pt-4">
        {t("auth.story.attribution")}
      </p>
    </aside>
  );
}
