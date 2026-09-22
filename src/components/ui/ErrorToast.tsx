import { Icon } from './Icon';

interface ErrorToastProps {
  title: string;
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
}

/** Persistent so validation details remain available until corrected or dismissed. */
export function ErrorToast({ title, message, dismissLabel, onDismiss }: ErrorToastProps) {
  return (
    <div role="alert" aria-atomic="true" aria-label={title}
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-card-foreground shadow-modal">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
        <Icon name="xCircle" size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 max-h-[40dvh] overflow-y-auto whitespace-pre-line break-words text-sm text-muted-foreground">{message}</div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-icon shrink-0" aria-label={dismissLabel} onClick={onDismiss}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
