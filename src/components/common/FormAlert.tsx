import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FormAlertAction {
  label: string;
  onClick: () => void;
}

interface FormAlertProps {
  level?: "destructive" | "info";
  /** Already-translated message. */
  message: string;
  /** Optional second line (e.g. an untranslated provider detail). */
  detail?: string;
  /** Up to two ways out of the error, rendered as buttons. */
  actions?: FormAlertAction[];
  className?: string;
}

/**
 * Inline alert for a form that has no notification surface of its own.
 *
 * The auth pages render inside `AuthLayout`, which has no `NotificationsBell` —
 * so anything sent to the bell from /login, /register or /forgot-password is
 * invisible. Those pages must show their errors in the form itself; this is
 * that surface (roadmap TSR-309). Styling follows the existing inline-error
 * pattern in `clients/sections/IdentitySection.tsx`.
 */
export function FormAlert({
  level = "destructive",
  message,
  detail,
  actions,
  className,
}: FormAlertProps) {
  const tone =
    level === "destructive"
      ? "bg-destructive/10 border-destructive/30 text-destructive"
      : "bg-primary/10 border-primary/30 text-primary";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn("flex flex-col gap-2 px-3 py-2.5 rounded-lg border font-sans", tone, className)}
    >
      <div className="flex items-start gap-2 t-sm">
        <Icon
          name={level === "destructive" ? "alertTri" : "info"}
          size={14}
          className="flex-shrink-0 mt-0.5"
        />
        <span className="flex-1">{message}</span>
      </div>

      {detail && <p className="t-xs opacity-80 pl-6 break-words">{detail}</p>}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-6">
          {actions.map((action) => (
            <Button key={action.label} type="button" variant="outline" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
