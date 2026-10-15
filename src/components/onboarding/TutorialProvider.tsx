import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions, useCanOpenCreateMenu } from "@/hooks/useRbac";
import { useUpdateOnboardingTour } from "@/hooks/useProfile";
import { ROUTES } from "@/routePaths";
import { readTutorialProgress, resolveTutorialSteps, saveTutorialProgress, tutorialStorageKey,
  type TutorialProgress, type TutorialStep } from "./tutorialModel";

interface TutorialContextValue {
  ready: boolean;
  progress: TutorialProgress;
  steps: TutorialStep[];
  current: TutorialStep | undefined;
  index: number;
  replay: () => void;
  start: () => void;
  move: (direction: -1 | 1) => void;
  dismiss: () => void;
  openGuide: () => void;
}
const TutorialContext = createContext<TutorialContextValue | null>(null);

/** Mounted above Routes: navigating between dashboard layouts cannot restart a tour. */
export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user, applyProfileUpdate } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { can, isReady } = usePermissions();
  const canCreate = useCanOpenCreateMenu();
  const [location, navigate] = useLocation();
  const updateTour = useUpdateOnboardingTour();
  const currentUserId = useRef(user?.userId);
  currentUserId.current = user?.userId;
  const key = user && org ? tutorialStorageKey(user.userId, org.id) : "";
  const ready = !!key && isReady;
  const steps = useMemo(() => resolveTutorialSteps(can, canCreate), [can, canCreate]);
  const [saved, setSaved] = useState<{ key: string; progress: TutorialProgress } | null>(null);
  const progress = saved?.key === key ? saved.progress : { status: "unseen" as const, step: "" };
  const index = Math.max(0, steps.findIndex((step) => step.id === progress.step));
  const current = steps[index];

  useEffect(() => {
    if (!key) { setSaved(null); return; }
    if (user?.onboarding_tour_completed_at === undefined) return;
    setSaved((previous) => previous?.key === key ? previous : {
      key, progress: readTutorialProgress(key, !!user?.onboarding_tour_completed_at),
    });
    // Hydrate only on identity changes; a background profile update cannot reset replay.
  }, [key, user?.onboarding_tour_completed_at === undefined]);

  const persist = (next: TutorialProgress) => {
    if (!key) return;
    saveTutorialProgress(key, next);
    setSaved({ key, progress: next });
  };

  useEffect(() => {
    if (!ready || saved?.key !== key || user?.onboarding_tour_completed_at === undefined) return;
    // Never hijack an initial deep link. Welcome only appears at the overview.
    if (location === ROUTES.DASHBOARD && progress.status === "unseen") {
      persist({ status: "welcome", step: current?.id ?? "" });
    }
    if (progress.status === "active" && current && current.id !== progress.step) {
      persist({ status: "active", step: current.id });
    }
  }, [ready, key, saved?.key, location, progress.status, progress.step, current?.id, user?.onboarding_tour_completed_at]);

  const finish = (status: "dismissed" | "complete") => {
    persist({ status, step: current?.id ?? "" });
    // Keep the existing cross-device completion flag. Local dismissal is distinct
    // from completion, and replay works offline without resetting the server flag.
    if (user?.onboarding_tour_completed_at === null) {
      updateTour.mutate({ userId: user.userId, data: { onboarding_tour_completed: true } }, {
        onSuccess: (profile) => {
          if (currentUserId.current === user.userId) applyProfileUpdate(profile);
        },
      });
    }
  };
  const select = (step: TutorialStep | undefined) => {
    if (!ready || !step) return;
    persist({ status: "active", step: step.id });
    navigate(step.route);
  };
  const value: TutorialContextValue = {
    ready, progress, steps, current, index,
    replay: () => select(steps[0]),
    start: () => select(current),
    move: (direction) => {
      if (direction === 1 && index === steps.length - 1) finish("complete");
      else select(steps[index + direction]);
    },
    dismiss: () => finish("dismissed"),
    openGuide: () => { finish("dismissed"); navigate(ROUTES.DASHBOARD_GUIDE); },
  };
  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error("useTutorial must be used inside TutorialProvider");
  return context;
}
