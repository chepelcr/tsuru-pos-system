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
  const railRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(current);

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
    if (previousStep.current !== current) {
      previousStep.current = current;
      bodyRef.current.focus({ preventScroll: true });
      railRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
    }
  }, [current]);

  // Map the active step into the visible-rail index so welcome (hidden) shows
  // step 1 as upcoming rather than highlighting nothing.
  const visibleIndex = visibleSteps.findIndex(
    (s) => s.id === steps[current]?.id,
  );

  const handlePrimaryClick = () => {
    if (isSaving || !canAdvance) return;
    if (isLast) {
      onSave?.();
    } else {
      onNext?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.defaultPrevented && !e.nativeEvent.isComposing && !hideFooter) {
      const target = e.target as HTMLElement;
      // Forms and interactive controls own Enter. Only plain text inputs in a
      // wizard without a form use the stepper's keyboard shortcut.
      if (target.tagName !== "INPUT" || target.closest("form") ||
          ["checkbox", "radio", "file", "button", "submit"].includes((target as HTMLInputElement).type)) return;
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
    <div ref={railRef} className="flex flex-col gap-6 scroll-mt-20" onKeyDown={handleKeyDown}>
      {/* Equal columns keep each number centered above its complete label.
          Longer wizards use balanced rows without dangling connectors. */}
      {!hideRail && visibleSteps.length > 1 && (() => {
        const topCount = visibleSteps.length <= 3 ? visibleSteps.length : Math.ceil(visibleSteps.length / 2);
        const bottomCount = visibleSteps.length - topCount;
        const topSpan = Math.max(1, Math.floor(6 / topCount));
        const bottomSpan = bottomCount > 0 ? Math.max(1, Math.floor(6 / bottomCount)) : 6;

        return (
          <nav
            aria-label={t("common.steps")}
          >
            <ol className="grid grid-cols-6 gap-x-2 gap-y-4 pb-1">
            {visibleSteps.map((step, idx) => {
              const isActive = idx === visibleIndex;
              const isComplete = idx < visibleIndex;
              const isTopRow = idx < topCount;
              const span = isTopRow ? topSpan : bottomSpan;

              return (
                <li
                  key={step.id}
                  className="min-w-0 flex flex-col items-center gap-2 text-center"
                  style={{ gridColumn: `span ${span} / span ${span}` }}
                  aria-current={isActive ? "step" : undefined}
                >
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-full border t-sm font-semibold flex-shrink-0 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isComplete
                            ? "border-success bg-success text-success-foreground"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                      aria-label={`${t("common.step")} ${idx + 1}`}
                    >
                      {isComplete ? (
                        <Icon name="check" size={14} strokeWidth={3} aria-hidden="true" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`t-sm font-medium max-w-full break-words ${isActive ? "text-primary" : isComplete ? "text-success" : "text-muted-foreground"}`}
                    >
                      {t(step.titleKey)}
                    </span>
                </li>
              );
            })}
            </ol>
          </nav>
        );
      })()}

      {/* Step body */}
      <div ref={bodyRef} tabIndex={-1} className="fade-in focus:outline-none">
        {children}
      </div>

      {/* Footer */}
      {!hideFooter && (
        <div className="flex items-center justify-between gap-3 pt-5 border-t border-border">
          <button
            type="button"
            className="btn btn-outline min-h-11"
            onClick={onPrev}
            disabled={isFirst || isSaving}
          >
            <Icon name="arrowLeft" size={14} />
            {t("common.back")}
          </button>

          <button
            type="button"
            className="btn btn-primary min-h-11"
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
