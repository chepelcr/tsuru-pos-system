/**
 * The organization the user is currently working in.
 *
 * Persisted in `localStorage`, NOT `sessionStorage`. Session storage is scoped
 * to a single browser tab, so a second tab (or a restored window) silently fell
 * back to `orgs[0]` — the same user could have two tabs open on two different
 * organizations, and document drafts carried between them. Which tenant you are
 * billing for is not per-tab state.
 *
 * It is also an **observable** store, not just a getter, and that part is load
 * bearing. `useDefaultOrganization` resolves the active org inside a React
 * Query `select`, which re-runs only when the query data changes or the
 * component re-renders — so a plain `localStorage` read there makes the answer
 * depend on who happened to render. `ThemeProvider` sits above the router and
 * re-renders for almost nothing, so after switching organizations it kept
 * resolving the PREVIOUS one: the sidebar said "Pacific Code Labs" while the
 * palette, and the `org-theme` request behind it, stayed on the organization
 * before it. The theme query for the new org was never issued at all.
 *
 * Subscribing fixes it at the source — every consumer re-renders on a switch,
 * so they cannot disagree about which tenant is active.
 */
const SELECTED_ORG_KEY = "selectedOrgId";

type Listener = () => void;

const listeners = new Set<Listener>();

/** Cached so `getSnapshot` is cheap and returns a stable value between writes. */
let snapshot: string | null = read();

function read(): string | null {
  try {
    return localStorage.getItem(SELECTED_ORG_KEY);
  } catch {
    return null;
  }
}

function emit(): void {
  snapshot = read();
  listeners.forEach((listener) => listener());
}

export function getSelectedOrgId(): string | null {
  return snapshot;
}

export function setSelectedOrgId(orgId: string): void {
  try {
    localStorage.setItem(SELECTED_ORG_KEY, orgId);
  } catch {
    /* private mode / storage disabled — fall back to first-org resolution */
  }
  emit();
}

export function clearSelectedOrgId(): void {
  try {
    localStorage.removeItem(SELECTED_ORG_KEY);
  } catch {
    /* nothing to clear */
  }
  emit();
}

/**
 * Subscribe to changes. Also listens for `storage` events, so switching
 * organizations in one tab moves the others too rather than leaving them
 * showing another tenant's data until they are reloaded.
 */
export function subscribeSelectedOrgId(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== SELECTED_ORG_KEY) return;
  emit();
}

/** Server snapshot — no selection during SSR/tests that render without storage. */
export function getSelectedOrgIdServerSnapshot(): string | null {
  return null;
}
