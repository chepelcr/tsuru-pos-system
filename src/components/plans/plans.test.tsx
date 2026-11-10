import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { allowanceState, currentPeriod } from "./DocumentAllowanceBanner";
import { liftingPlan } from "./UpgradeSheet";
import { emitPlanLimit, isPlanLimitDetail, onPlanLimit, type PlanLimitDetail } from "@/lib/planLimitBus";
import type { PlanCatalogEntry } from "@/hooks/useEntitlements";

const catalog: PlanCatalogEntry[] = [
  { id: "semilla", display_name: "Semilla", sort_order: 1, price_monthly: 0, price_annual: 0, currency: "CRC", is_custom_price: false, is_self_serve: true,
    entitlements: { products: 50, terminals: 1, "domain.custom": false, "rbac.fine_grained": false } },
  { id: "cosecha", display_name: "Cosecha", sort_order: 2, price_monthly: 20000, price_annual: 180000, currency: "CRC", is_custom_price: false, is_self_serve: true,
    entitlements: { products: null, terminals: 3, "domain.custom": true, "rbac.fine_grained": false } },
  { id: "cooperativa", display_name: "Cooperativa", sort_order: 3, price_monthly: 35000, price_annual: 315000, currency: "CRC", is_custom_price: false, is_self_serve: true,
    entitlements: { products: null, terminals: null, "domain.custom": true, "rbac.fine_grained": true } },
  { id: "feria", display_name: "Feria", sort_order: 4, price_monthly: null, price_annual: null, currency: "CRC", is_custom_price: true, is_self_serve: false,
    entitlements: { products: null, terminals: null, "domain.custom": true, "rbac.fine_grained": true } },
];

const detail = (over: Partial<PlanLimitDetail>): PlanLimitDetail => ({
  key: "products", kind: "limit", limit: 50, current: 50, current_plan: "semilla", required_plan: null, ...over,
});

describe("document allowance (soft cap, plans spec §5.6)", () => {
  it("is quiet below 80%", () => {
    expect(allowanceState(23, 30)).toBe("none");
  });
  it("warns from 80%", () => {
    expect(allowanceState(24, 30)).toBe("warning");
    expect(allowanceState(29, 30)).toBe("warning");
  });
  it("reports the overage without ever blocking", () => {
    expect(allowanceState(30, 30)).toBe("over");
    expect(allowanceState(300, 30)).toBe("over");
  });
  it("says nothing on an unlimited plan", () => {
    expect(allowanceState(10_000, null)).toBe("none");
  });
  it("keys dismissals by calendar month", () => {
    expect(currentPeriod(new Date(2026, 10, 9))).toBe("2026-11");
  });
});

describe("the plan that lifts a limit", () => {
  it("uses the backend's answer when given", () => {
    expect(liftingPlan(detail({ required_plan: "cooperativa" }), catalog)?.id).toBe("cooperativa");
  });
  it("finds the cheapest self-serve plan with room", () => {
    expect(liftingPlan(detail({}), catalog)?.id).toBe("cosecha");
    expect(liftingPlan(detail({ key: "terminals", limit: 3, current: 3, current_plan: "cosecha" }), catalog)?.id).toBe("cooperativa");
  });
  it("handles capabilities and never offers Feria", () => {
    expect(liftingPlan(detail({ key: "rbac.fine_grained", kind: "capability", limit: null, current: null }), catalog)?.id).toBe("cooperativa");
    expect(liftingPlan(detail({ key: "fair.multi_org", kind: "capability", limit: null, current: null }), catalog)).toBeUndefined();
  });
});

describe("plan limit bus", () => {
  it("delivers to listeners until they unsubscribe", () => {
    const seen: string[] = [];
    const off = onPlanLimit((d) => seen.push(d.key));
    emitPlanLimit(detail({ key: "customers" }));
    off();
    emitPlanLimit(detail({ key: "branches" }));
    expect(seen).toEqual(["customers"]);
  });
  it("recognises a 402 plan_limit body", () => {
    expect(isPlanLimitDetail(detail({}))).toBe(true);
    expect(isPlanLimitDetail({ key: "x" })).toBe(false);
    expect(isPlanLimitDetail(null)).toBe(false);
  });
});

describe("api client on 402", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("aws-amplify/auth", () => ({ fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => "h.e30.s" } } }) }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); fetchMock.mockReset(); });

  it("opens the upgrade sheet once and rejects with the detail", async () => {
    const planLimit = detail({ required_plan: "cosecha" });
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ status: 402, message: "PLAN_LIMIT_EXCEEDED", plan_limit: planLimit }),
      { status: 402, headers: { "content-type": "application/json" } },
    ));
    const { api, ApiError } = await import("@/lib/api");
    const bus = await import("@/lib/planLimitBus");
    const seen: PlanLimitDetail[] = [];
    const off = bus.onPlanLimit((d) => seen.push(d));
    const error = await api.post("/x", {}).catch((e: unknown) => e);
    off();
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(402);
    expect((error as InstanceType<typeof ApiError>).planLimit).toEqual(planLimit);
    expect(seen).toEqual([planLimit]);
  });

  it("leaves a plain 403 alone", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 403, message: "PERMISSION_DENIED" }), { status: 403 }));
    const { api } = await import("@/lib/api");
    const bus = await import("@/lib/planLimitBus");
    const listener = vi.fn();
    const off = bus.onPlanLimit(listener);
    await api.post("/x", {}).catch(() => undefined);
    off();
    expect(listener).not.toHaveBeenCalled();
  });
});
