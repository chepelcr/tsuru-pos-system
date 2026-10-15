import { useLocation } from "wouter";
import { BookOpen, ArrowRight, Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTutorial } from "@/components/onboarding/TutorialProvider";
import { Button } from "@/components/ui";
import { ROUTES } from "@/routePaths";

export default function TutorialGuidePage() {
  const { t } = useLanguage();
  const tutorial = useTutorial();
  const [, navigate] = useLocation();
  usePageTitle([t("onboarding.guide.title")]);
  return (
    <div className="px-6 pt-6 pb-12 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-primary mb-2"><BookOpen size={20} aria-hidden="true" />
            <span className="t-label">{t("onboarding.label")}</span></div>
          <h1 className="t-h1 mb-2">{t("onboarding.guide.title")}</h1>
          <p className="t-body text-muted-foreground">{t("onboarding.guide.body")}</p>
        </div>
        <Button type="button" onClick={tutorial.replay} disabled={!tutorial.ready}>
          <Play size={16} aria-hidden="true" />{t("onboarding.restart.button")}
        </Button>
      </div>
      <div className="card p-5 mb-6">
        <h2 className="t-h3 mb-2">{t("onboarding.guide.before.title")}</h2>
        <p className="t-body text-muted-foreground">{t("onboarding.guide.before.body")}</p>
      </div>
      <div className="tutorial-guide-grid grid gap-4 md:grid-cols-2">
        {tutorial.steps.map((step, index) => (
          <article key={step.id} className="tutorial-guide-card card p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="tutorial-guide-number" aria-hidden="true">{index + 1}</span>
              <h2 className="t-h3">{t(`onboarding.step.${step.id}.title`)}</h2>
            </div>
            <p className="t-body text-muted-foreground">{t(`onboarding.step.${step.id}.body`)}</p>
            <div className="tutorial-example">
              <p className="t-label text-primary">{t("onboarding.example")}</p>
              <p className="t-sm">{t(`onboarding.step.${step.id}.example`)}</p>
            </div>
            <p className="t-sm text-muted-foreground"><strong className="text-foreground">{t("onboarding.result")} </strong>
              {t(`onboarding.step.${step.id}.result`)}</p>
            <Button type="button" variant="outline" className="mt-auto self-start justify-self-start" onClick={() => navigate(step.route)}>
              {t("onboarding.guide.go")}<ArrowRight size={16} aria-hidden="true" />
            </Button>
          </article>
        ))}
      </div>
      <div className="card p-5 mt-6">
        <h2 className="t-h3 mb-2">{t("onboarding.guide.help.title")}</h2>
        <p className="t-body text-muted-foreground mb-4">{t("onboarding.guide.help.body")}</p>
        <Button type="button" variant="outline" onClick={() => navigate(ROUTES.DASHBOARD_SUPPORT)}>{t("shell.support")}</Button>
      </div>
    </div>
  );
}
