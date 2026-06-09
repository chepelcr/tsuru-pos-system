/**
 * Client type extension for the B2B engagement features (plan 02 §6.3 — Notes).
 *
 * ⚠️ SCOPE NOTE: the canonical `Client` / `CreateClientDto` / `UpdateClientDto`
 * types currently live in `src/hooks/useClients.ts` (NOT under `src/types/`).
 * Plan 02 §6.3 wants `notes` added directly to those declarations. That file is
 * outside this scaffolding step's allowed edit scope, so this file provides the
 * `notes` augmentation as a reusable mixin + DTO until the later step folds it
 * into `useClients.ts` (see openIssues).
 *
 * TODO(verify-endpoint): confirm cross-app-be `ClientResponse` returns `notes`
 * and that `PATCH /clients/{id}` accepts `{ notes }`. If absent, notes needs a
 * BE change before it can persist.
 */

/** Mixin adding the free-text customer note to a client. */
export interface ClientNotesFields {
  notes?: string | null;
}

/** PATCH body for persisting a customer note via `useUpdateClient`. */
export interface UpdateClientNotesDto {
  notes?: string;
}
