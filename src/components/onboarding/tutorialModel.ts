import { ROUTES } from "@/routePaths";

export type TutorialStatus = "unseen" | "welcome" | "active" | "dismissed" | "complete";
export interface TutorialProgress { status: TutorialStatus; step: string }
export interface TutorialStep { id: string; route: string; anchor: string }
type Can = (module: string, action: string, submodule?: string) => boolean;

/** Keep IDs stable across translations, role changes, and content updates. */
export function resolveTutorialSteps(can: Can, canCreateDocument: boolean): TutorialStep[] {
  const steps: TutorialStep[] = [];
  const add = (id: string, route: string, anchor = id) => steps.push({ id, route, anchor });
  if (can("panel", "read", "overview")) add("overview", ROUTES.DASHBOARD);
  if (can("organization", "read", "general")) add("organization", ROUTES.DASHBOARD_ORG_GENERAL);
  if (can("commercial", "read", "products")) {
    if (can("commercial", "create", "products")) add("create-product", ROUTES.DASHBOARD_PRODUCTS, "new-product");
    else add("products", ROUTES.DASHBOARD_PRODUCTS);
  }
  if (can("commercial", "read", "clients")) {
    if (can("commercial", "create", "clients")) add("create-client", ROUTES.DASHBOARD_CLIENTS, "new-client");
    else add("clients", ROUTES.DASHBOARD_CLIENTS);
  }
  if (can("admin", "read", "sessions")) add("sessions", ROUTES.DASHBOARD_SESSIONS);
  if (canCreateDocument) add("create-document", ROUTES.DASHBOARD_DOCUMENTS);
  if (can("documents", "read", "emitted") || can("documents", "read", "received")) {
    add("documents", ROUTES.DASHBOARD_DOCUMENTS);
  }
  if (can("commercial", "read", "orders")) add("orders", ROUTES.DASHBOARD_ORDERS);
  if (can("reports", "read", "general")) add("reports", ROUTES.DASHBOARD_REPORTS);
  if (can("storefront", "read", "content")) add("content", ROUTES.DASHBOARD_CONTENT, "content-page");
  if (can("panel", "read", "overview")) add("share-store", ROUTES.DASHBOARD, "view-store");
  add("profile", ROUTES.PROFILE);
  return steps;
}

// v2 replaces the old three-step tour. Existing server completions are respected;
// replay explicitly opts into this version. Organization scope prevents tenant drift.
export const tutorialStorageKey = (userId: string, orgId: string) => `tsuru:tutorial:v2:${userId}:${orgId}`;
const statuses: TutorialStatus[] = ["unseen", "welcome", "active", "dismissed", "complete"];

export function readTutorialProgress(key: string, serverCompleted: boolean): TutorialProgress {
  const fallback: TutorialProgress = { status: serverCompleted ? "complete" : "unseen", step: "" };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (raw && typeof raw === "object" && "status" in raw && "step" in raw &&
      statuses.includes(raw.status as TutorialStatus) && typeof raw.step === "string") {
      return { status: raw.status as TutorialStatus, step: raw.step };
    }
  } catch { /* Storage can be blocked or malformed; memory remains usable. */ }
  return fallback;
}

export function saveTutorialProgress(key: string, progress: TutorialProgress) {
  try { localStorage.setItem(key, JSON.stringify(progress)); } catch { /* In-memory fallback. */ }
}

export interface Rect { x: number; y: number; width: number; height: number }
export const TOUR_GAP = 16;

/** All coordinates are relative to the visible viewport, including mobile zoom. */
export function placeTutorialPanel(target: Rect | null, width: number, height: number, measuredHeight: number) {
  const panelWidth = Math.max(0, Math.min(380, width - TOUR_GAP * 2));
  const fullHeight = Math.max(0, height - TOUR_GAP * 2);
  let maxHeight = fullHeight;
  let x = (width - panelWidth) / 2;
  let y = (height - Math.min(measuredHeight, maxHeight)) / 2;
  if (target) {
    const right = width - target.x - target.width - TOUR_GAP * 2;
    const left = target.x - TOUR_GAP * 2;
    if (right >= panelWidth || left >= panelWidth) {
      x = right >= panelWidth ? target.x + target.width + TOUR_GAP : target.x - panelWidth - TOUR_GAP;
      y = target.y;
    } else {
      const above = target.y - TOUR_GAP * 2;
      const below = height - target.y - target.height - TOUR_GAP * 2;
      const useBelow = below >= above;
      const available = useBelow ? below : above;
      if (available >= 140) {
        maxHeight = Math.min(fullHeight, available);
        y = useBelow ? target.y + target.height + TOUR_GAP : target.y - Math.min(measuredHeight, maxHeight) - TOUR_GAP;
      }
    }
  }
  y = Math.max(TOUR_GAP, Math.min(y, height - Math.min(measuredHeight, maxHeight) - TOUR_GAP));
  return { x, y, width: panelWidth, maxHeight };
}
