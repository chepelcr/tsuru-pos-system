import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateOnboardingTour } from "@/hooks/useProfile";
import { ROUTES } from "@/routePaths";

/**
 * First-login guided tour. The store's name, logo and phone are captured in
 * onboarding, so the tour covers what is left to make the storefront real: its
 * page content, a first product, and where to see and share it.
 *
 * Each step lives on its own route, so the tour navigates, waits for the step's
 * `data-tour` anchor to mount, and spotlights it (driver.js dims everything
 * else). Finishing or skipping stores `onboarding_tour_completed_at` on the
 * profile; the Profile page's "replay" clears it.
 */
interface TourStep {
  route: string;
  anchor: string;
  titleKey: string;
  bodyKey: string;
}

export const ONBOARDING_TOUR_STEPS: readonly TourStep[] = [
  {
    route: ROUTES.DASHBOARD_CONTENT,
    anchor: "content-pages",
    titleKey: "onboarding.tour.content.title",
    bodyKey: "onboarding.tour.content.body",
  },
  {
    route: ROUTES.DASHBOARD_PRODUCTS,
    anchor: "new-product",
    titleKey: "onboarding.tour.product.title",
    bodyKey: "onboarding.tour.product.body",
  },
  {
    route: ROUTES.DASHBOARD,
    anchor: "view-store",
    titleKey: "onboarding.tour.store.title",
    bodyKey: "onboarding.tour.store.body",
  },
];

/** How long a step waits for its page to render the anchor before skipping it. */
const ANCHOR_TIMEOUT_MS = 8000;

function waitForAnchor(anchor: string, signal: AbortSignal): Promise<Element | null> {
  const selector = `[data-tour="${anchor}"]`;
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) finish(el);
    });
    const timer = window.setTimeout(() => finish(null), ANCHOR_TIMEOUT_MS);
    function finish(el: Element | null) {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve(el);
    }
    signal.addEventListener("abort", () => finish(null), { once: true });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function OnboardingTour() {
  const { user, applyProfileUpdate } = useAuthContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const updateTour = useUpdateOnboardingTour();
  const running = useRef(false);

  // Only an explicit null starts it: undefined means the profile is not loaded.
  const pending = !!user && user.onboarding_tour_completed_at === null;

  const complete = useCallback(() => {
    if (!user) return;
    applyProfileUpdate({ onboarding_tour_completed_at: new Date().toISOString() });
    updateTour.mutate({ userId: user.userId, data: { onboarding_tour_completed: true } });
  }, [user, applyProfileUpdate, updateTour]);

  useEffect(() => {
    if (!pending || running.current) return;
    running.current = true;
    const abort = new AbortController();
    let active: Driver | null = null;

    const show = async (index: number) => {
      if (abort.signal.aborted) return;
      if (index >= ONBOARDING_TOUR_STEPS.length) {
        complete();
        return;
      }
      const step = ONBOARDING_TOUR_STEPS[index];
      navigate(step.route);
      const element = await waitForAnchor(step.anchor, abort.signal);
      if (abort.signal.aborted) return;
      // A page without its anchor (e.g. no permission) skips to the next step.
      if (!element) return show(index + 1);

      const isLast = index === ONBOARDING_TOUR_STEPS.length - 1;
      let advancing = false;
      active = driver({
        overlayOpacity: 0.7,
        stagePadding: 8,
        stageRadius: 10,
        allowClose: true,
        // A stray click on the dimmed page must not throw the whole tour away;
        // skipping is the popover's X or Esc.
        overlayClickBehavior: () => {},
        popoverClass: "tsuru-tour",
        showButtons: index > 0 ? ["previous", "next", "close"] : ["next", "close"],
        nextBtnText: isLast ? t("onboarding.tour.done") : t("onboarding.tour.next"),
        prevBtnText: t("onboarding.tour.prev"),
        onNextClick: () => {
          advancing = true;
          active?.destroy();
          void show(index + 1);
        },
        onPrevClick: () => {
          advancing = true;
          active?.destroy();
          void show(index - 1);
        },
        // Close (X, Esc) = skip: the tour never comes back on
        // its own, and it can be replayed from the profile.
        onDestroyed: () => {
          if (!advancing && !abort.signal.aborted) complete();
        },
      });
      active.highlight({
        element,
        popover: {
          title: t(step.titleKey),
          description:
            `<p>${t(step.bodyKey)}</p>` +
            `<p class="tsuru-tour-progress">${t("onboarding.tour.progress", {
              current: index + 1,
              total: ONBOARDING_TOUR_STEPS.length,
            })}</p>`,
        },
      });
    };

    void show(0);
    return () => {
      abort.abort();
      active?.destroy();
      running.current = false;
    };
    // Starts once per pending state; navigation inside the tour must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return null;
}
