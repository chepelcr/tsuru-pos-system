/**
 * One map for a document's Hacienda status (TSR-336).
 *
 * Four components used to label the same ATV code four different ways —
 * `DocumentCard` called 2 "pending", `DocumentDetailPage` called it "partial
 * accept", and so on. The code is Hacienda's:
 *
 *   0  in process (sent, no answer yet)
 *   1  accepted
 *   2  partially accepted  (aceptado parcial)
 *   3  rejected
 *
 * plus a state that is not an ATV code at all: **foreign environment** — the
 * clave is unknown to the Hacienda environment this deployment talks to (a
 * production document imported into dev, or the reverse). Nothing that talks to
 * Hacienda can be done with such a document; it can still be viewed and its
 * files downloaded.
 */

export type StatusVariant = 'info' | 'success' | 'warning' | 'destructive' | 'secondary';

export interface DocumentStatusView {
  labelKey: string;
  variant: StatusVariant;
  icon: string;
}

export const ATV_STATUS: Record<number, DocumentStatusView> = {
  0: { labelKey: 'historical.status.processing', variant: 'info', icon: 'clock' },
  1: { labelKey: 'historical.status.accepted', variant: 'success', icon: 'checkCircle' },
  2: { labelKey: 'historical.status.partial', variant: 'warning', icon: 'checkCircle' },
  3: { labelKey: 'historical.status.rejected', variant: 'destructive', icon: 'xCircle' },
};

export const FOREIGN_ENVIRONMENT_STATUS: DocumentStatusView = {
  labelKey: 'documents.status.foreignEnvironment',
  variant: 'secondary',
  icon: 'alert',
};

/** Badge classes for the compact list card, by variant (design-system tokens only). */
export const STATUS_PILL_CLASSES: Record<StatusVariant, string> = {
  info: 'bg-info/10 text-info border-info/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  secondary: 'bg-muted text-muted-foreground border-border',
};

interface StatusSource {
  foreign_environment?: boolean;
  atv_validation?: { validation_status?: number | null } | null;
}

/** The status to show, or null when the document has not been sent yet. */
export function documentStatusView(doc: StatusSource): DocumentStatusView | null {
  if (doc.foreign_environment) return FOREIGN_ENVIRONMENT_STATUS;
  const code = doc.atv_validation?.validation_status;
  if (code === undefined || code === null) return null;
  return ATV_STATUS[code] ?? null;
}

/**
 * May the user do anything that talks to Hacienda with this document
 * (validate, refresh, resend, accept, regenerate, emit a note against it)?
 * Viewing it and downloading its files is always allowed.
 */
export function hasHaciendaActions(doc: { foreign_environment?: boolean }): boolean {
  return !doc.foreign_environment;
}
