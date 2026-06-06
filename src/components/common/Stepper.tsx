import { useEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon, Spinner } from "@/components/ui";

export interface StepperStep {
  id: string;
  /** Translation key for the step label (rendered via `t()`). */
  titleKey: string;
  /** Optional: hide this step from the rail (used for the welcome step). */
  hideFromRail?: boolean;
}

interface StepperProps {
  steps: StepperStep[];
  current: number;
  /** When true and on the first step, the primary button says "Comenzar" instead of "Siguiente". */
  welcomeMode?: boolean;
  /** Hide the entire footer (parent renders its own controls). */
  hideFooter?: boolean;
  /** Hide the step rail (used on the welcome step so the rail doesn't compete with the hero). */
  hideRail?: boolean;
  /** Disables the Next/Save button (parent indicates validation state). */
  canAdvance?: boolean;
  isSaving?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  children: ReactNode;
}

/**
 * Generic stepper: numbered rail at the top, fading body slot, footer with
 * Atrás / Siguiente / Guardar. The parent owns step state and renders only the
 * active step inside `children`. The Stepper is purely presentational beyond
 * the keyboard shortcuts (Enter advances when valid).
 */
export function Stepper({
  steps,
  current,
  welcomeMode = false,
  hideFooter = false,
  hideRail = false,
  canAdvance = true,
  isSaving = false,
  onPrev,
  onNext,
  onSave,
  children,
}: StepperProps) {
  const { t } = useLanguage();
  const bodyRef = useRef<HTMLDivElement>(null);

  const visibleSteps = steps.filter((s) => !s.hideFromRail);
  const isLast = current === steps.length - 1;
  const isFirst = current === 0;

  // Re-trigger the fade-in animation on step change.
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.classList.remove("fade-in");
    // Force reflow so the animation restarts.
    void bodyRef.current.offsetWidth;
    bodyRef.current.classList.add("fade-in");
  }, [current]);

  // Map the active step into the visible-rail index so welcome (hidden) shows
  // step 1 as upcoming rather than highlighting nothing.
  const visibleIndex = visibleSteps.findIndex(
    (s) => s.id === steps[current]?.id,
  );

  const handlePrimaryClick = () => {
    if (isSaving) return;
    if (isLast) {
      onSave?.();
    } else {
      onNext?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      // Don't intercept Enter when the user is in a textarea/select; let the
      // native behaviour win there.
      if (target.tagName === "TEXTAREA") return;
      if (canAdvance && !isSaving) {
        e.preventDefault();
        handlePrimaryClick();
      }
    }
  };

  const primaryLabel = isLast
    ? t("common.save")
    : welcomeMode && isFirst
      ? t("orgSettings.fiscalInfo.welcome.cta")
      : t("common.next");

  return (
    <div className="flex flex-col gap-6" onKeyDown={handleKeyDown}>
      {/* Step rail
       *
       * Mobile (default): 6-column CSS grid that splits the steps into two
       * tidy rows. `topCount = ceil(N/2)` chips share the top row and
       * `N - topCount` chips share the bottom row, each chip spanning
       * `6 / rowCount` columns so the rows are evenly divided. For our 5-step
       * fiscal flow that lands 3 chips on top + 2 chips on the bottom (each
       * top chip span 2, each bottom chip span 3). No horizontal scroll, no
       * dangling connectors.
       *
       * ≥640px: the outer container switches to `flex flex-wrap` and the
       * `gridColumn` inline style on each chip becomes a no-op, so the chips
       * revert to the inline single-row layout with connector segments.
       */}
      {!hideRail && visibleSteps.length > 1 && (() => {
        const topCount = Math.ceil(visibleSteps.length / 2);
        const bottomCount = visibleSteps.length - topCount;
        const topSpan = Math.max(1, Math.floor(6 / topCount));
        const bottomSpan = bottomCount > 0 ? Math.max(1, Math.floor(6 / bottomCount)) : 6;

        return (
          <nav
            aria-label={t("common.steps")}
            className="grid grid-cols-6 gap-2 pb-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2"
          >
            {visibleSteps.map((step, idx) => {
              const isActive = idx === visibleIndex;
              const isComplete = idx < visibleIndex;
              const isUpcoming = idx > visibleIndex;
              const isTopRow = idx < topCount;
              const span = isTopRow ? topSpan : bottomSpan;

              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2 min-w-0 sm:flex-shrink-0"
                  style={{ gridColumn: `span ${span} / span ${span}` }}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors w-full justify-center sm:w-auto sm:justify-start ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : isComplete
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isComplete
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                      aria-label={`${t("common.step")} ${idx + 1}`}
                    >
                      {isComplete ? (
                        <Icon name="check" size={12} strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span className="t-sm font-medium truncate sm:whitespace-nowrap">
                      {t(step.titleKey)}
                    </span>
                  </div>

                  {idx < visibleSteps.length - 1 && (
                    <div
                      className={`hidden sm:block h-px w-6 flex-shrink-0 ${
                        isUpcoming ? "bg-border" : "bg-success/40"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </nav>
        );
      })()}

      {/* Step body */}
      <div ref={bodyRef} className="fade-in">
        {children}
      </div>

      {/* Footer */}
      {!hideFooter && (
        <div className="flex items-center justify-between gap-3 pt-5 border-t border-border">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onPrev}
            disabled={isFirst || isSaving}
          >
            <Icon name="arrowLeft" size={14} />
            {t("common.back")}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrimaryClick}
            disabled={!canAdvance || isSaving}
          >
            {isSaving ? (
              <>
                <Spinner size={14} />
                {t("common.saving")}
              </>
            ) : (
              <>
                {primaryLabel}
                {!isLast && <Icon name="arrowRight" size={14} />}
                {isLast && <Icon name="check" size={14} />}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
