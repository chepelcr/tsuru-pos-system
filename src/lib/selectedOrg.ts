/**
 * The organization the user is currently working in.
 *
 * Persisted in `localStorage`, NOT `sessionStorage`. Session storage is scoped
 * to a single browser tab, so a second tab (or a restored window) silently fell
 * back to `orgs[0]` — the same user could have two tabs open on two different
 * organizations, and document drafts carried between them. Which tenant you are
 * billing for is not per-tab state.
 */
const SELECTED_ORG_KEY = "selectedOrgId";

export function getSelectedOrgId(): string | null {
  try {
    return localStorage.getItem(SELECTED_ORG_KEY);
  } catch {
    return null;
  }
}

export function setSelectedOrgId(orgId: string): void {
  try {
    localStorage.setItem(SELECTED_ORG_KEY, orgId);
  } catch {
    /* private mode / storage disabled — fall back to first-org resolution */
  }
}

export function clearSelectedOrgId(): void {
  try {
    localStorage.removeItem(SELECTED_ORG_KEY);
  } catch {
    /* nothing to clear */
  }
}
