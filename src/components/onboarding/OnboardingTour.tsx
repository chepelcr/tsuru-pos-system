import { useLocation } from "wouter";
import { BookOpen, X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui";
import { ROUTES } from "@/routePaths";
import { useTutorial } from "./TutorialProvider";
import { TutorialSpotlight } from "./TutorialSpotlight";

export function OnboardingTour() {
  const tour = useTutorial();
  const { t } = useLanguage();
  const [location, navigate] = useLocation();
  const inDashboard = location === ROUTES.DASHBOARD || location.startsWith(`${ROUTES.DASHBOARD}/`);
  if (!tour.ready || !inDashboard) return null;
  const welcome = tour.progress.status === "welcome" && location === ROUTES.DASHBOARD;
  if (!welcome && tour.progress.status !== "active") return null;
  const step = tour.current;
  if (!step) return null;
  const onRoute = location === step.route;
  const last = tour.index === tour.steps.length - 1;
  return (
    <TutorialSpotlight anchor={welcome ? undefined : step.anchor} stepId={welcome ? "welcome" : step.id}
      onRoute={onRoute} onClose={tour.dismiss}>
      {(missingTarget) => <>
      <div className="tutorial-heading">
        <span className="tutorial-eyebrow"><BookOpen size={16} aria-hidden="true" />{t("onboarding.label")}</span>
        <button type="button" className="tutorial-close" onClick={tour.dismiss} aria-label={t("onboarding.close")}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="tutorial-copy" data-tutorial-scroll="">
        <h2 id="tutorial-title" className="t-h2">{t(welcome ? "onboarding.welcome.title" : `onboarding.step.${step.id}.title`)}</h2>
        <p id="tutorial-description" className="t-body text-muted-foreground">
          {t(welcome ? "onboarding.welcome.body" : `onboarding.step.${step.id}.body`)}
        </p>
        {welcome ? (
          <p className="t-sm text-muted-foreground">{t("onboarding.welcome.count", { count: tour.steps.length })}</p>
        ) : (
          <>
            <div className="tutorial-example">
              <p className="t-label text-primary">{t("onboarding.example")}</p>
              <p className="t-sm">{t(`onboarding.step.${step.id}.example`)}</p>
            </div>
            <p className="t-sm text-muted-foreground"><strong className="text-foreground">{t("onboarding.result")} </strong>
              {t(`onboarding.step.${step.id}.result`)}</p>
            {!onRoute && (
              <div className="tutorial-route-notice" role="status">
                <p className="t-sm">{t("onboarding.away")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate(step.route)}>{t("onboarding.return")}</Button>
              </div>
            )}
            {missingTarget && <p className="t-sm text-muted-foreground" role="status">{t("onboarding.missing")}</p>}
            <p className="tutorial-progress-label" aria-live="polite">
              {t("onboarding.tour.progress", { current: tour.index + 1, total: tour.steps.length })}
            </p>
            <progress className="tutorial-progress" value={tour.index + 1} max={tour.steps.length}
              aria-label={t("onboarding.progressLabel")} />
          </>
        )}
        <button type="button" className="tutorial-guide-link" onClick={tour.openGuide}>
          <BookOpen size={14} aria-hidden="true" />{t("onboarding.guide.open")}
        </button>
      </div>
      <footer className="tutorial-footer">
        {welcome ? (
          <>
            <Button type="button" variant="ghost" onClick={tour.dismiss}>{t("onboarding.later")}</Button>
            <Button type="button" onClick={tour.start}>{t("onboarding.start")}<ArrowRight size={16} aria-hidden="true" /></Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" disabled={tour.index === 0} onClick={() => tour.move(-1)}>
              <ArrowLeft size={16} aria-hidden="true" />{t("common.back")}
            </Button>
            <Button type="button" onClick={() => tour.move(1)}>
              {t(last ? "onboarding.tour.done" : "common.next")}
              {last ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </Button>
          </>
        )}
      </footer>
      </>}
    </TutorialSpotlight>
  );
}
