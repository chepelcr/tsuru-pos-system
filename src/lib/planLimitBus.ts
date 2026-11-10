/**
 * A plan limit was hit (a 402 from any backend, or a create button that already
 * knows the plan is full). One listener — `PlanLimitHost` in the dashboard
 * layout — opens the upgrade sheet, so no page handles 402s itself.
 *
 * Spec: docs/roadmap/tsuru_plans_implementation.md §6.2 (monorepo).
 */

export type PlanLimitKind = "limit" | "capability";

/** `plan_limit` from a 402 PLAN_LIMIT_EXCEEDED body (every backend sends the same shape). */
export interface PlanLimitDetail {
  key: string;
  kind: PlanLimitKind;
  limit: number | null;
  current: number | null;
  current_plan: string;
  required_plan: string | null;
}

type Listener = (detail: PlanLimitDetail) => void;
const listeners = new Set<Listener>();

export function emitPlanLimit(detail: PlanLimitDetail): void {
  listeners.forEach((listener) => listener(detail));
}

export function onPlanLimit(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isPlanLimitDetail(value: unknown): value is PlanLimitDetail {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.key === "string" && (v.kind === "limit" || v.kind === "capability") && typeof v.current_plan === "string";
}
