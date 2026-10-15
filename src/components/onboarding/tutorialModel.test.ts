import { beforeEach, describe, expect, it, vi } from "vitest";
import { translations } from "@/locales";
import { placeTutorialPanel, readTutorialProgress, resolveTutorialSteps, saveTutorialProgress, tutorialStorageKey } from "./tutorialModel";

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("tutorial workflow and persistence", () => {
  it("omits inaccessible workflows and substitutes read-only catalog guidance", () => {
    const grants = new Set(["commercial:read:products", "commercial:read:clients"]);
    const steps = resolveTutorialSteps((m, a, s) => grants.has(`${m}:${a}:${s}`), false);
    expect(steps.map((s) => s.id)).toEqual(["products", "clients", "profile"]);
    expect(steps.some((s) => s.id.startsWith("create-"))).toBe(false);
  });
  it("requires read and create access before highlighting a product creation control", () => {
    expect(resolveTutorialSteps((m, a) => m === "commercial" && a === "create", false).map((s) => s.id)).toEqual(["profile"]);
  });
  it("has complete translated tasks and outcomes for every workflow variant", () => {
    const steps = [...resolveTutorialSteps(() => true, true), ...resolveTutorialSteps((_m, a) => a === "read", false)];
    for (const step of steps) {
      for (const locale of Object.values(translations)) {
        for (const field of ["title", "body", "example", "result"]) expect(locale[`onboarding.step.${step.id}.${field}`]).toBeTruthy();
      }
    }
  });
  it("persists a step ID and keeps users and organizations isolated", () => {
    const key = tutorialStorageKey("alice", "store-a");
    saveTutorialProgress(key, { status: "active", step: "orders" });
    expect(readTutorialProgress(key, false)).toEqual({ status: "active", step: "orders" });
    expect(readTutorialProgress(tutorialStorageKey("bob", "store-a"), false).status).toBe("unseen");
    expect(readTutorialProgress(tutorialStorageKey("alice", "store-b"), false).status).toBe("unseen");
  });
  it.each(["{bad", "null", '[]', '{"status":"active","step":4}', '{"status":"invalid","step":"orders"}'])("recovers from malformed storage: %s", (raw) => {
    localStorage.setItem("tour", raw);
    expect(readTutorialProgress("tour", false)).toEqual({ status: "unseen", step: "" });
  });
  it("respects legacy server completion and keeps replay independent of it", () => {
    expect(readTutorialProgress("tour", true).status).toBe("complete");
    saveTutorialProgress("tour", { status: "active", step: "products" });
    expect(readTutorialProgress("tour", true).status).toBe("active");
  });
  it("does not throw when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readTutorialProgress("tour", false).status).toBe("unseen");
    expect(() => saveTutorialProgress("tour", { status: "dismissed", step: "orders" })).not.toThrow();
  });
});

describe("responsive spotlight geometry", () => {
  it("prefers right, then left, with a 16px gap", () => {
    expect(placeTutorialPanel({ x: 50, y: 50, width: 120, height: 40 }, 1200, 800, 300).x).toBe(186);
    expect(placeTutorialPanel({ x: 1000, y: 50, width: 120, height: 40 }, 1200, 800, 300).x).toBe(604);
  });
  it.each([320, 375, 390, 768, 1440])("keeps instructions in a %ipx viewport", (width) => {
    const placed = placeTutorialPanel({ x: width / 2 - 50, y: 270, width: 100, height: 40 }, width, 667, 420);
    expect(placed.x).toBeGreaterThanOrEqual(16);
    expect(placed.x + placed.width).toBeLessThanOrEqual(width - 16);
    expect(placed.y).toBeGreaterThanOrEqual(16);
    expect(placed.y + Math.min(420, placed.maxHeight)).toBeLessThanOrEqual(651);
  });
  it("uses scrollable space below a mobile target without covering it", () => {
    const target = { x: 20, y: 100, width: 335, height: 44 };
    const placed = placeTutorialPanel(target, 375, 667, 500);
    expect(placed.y).toBe(160);
    expect(placed.maxHeight).toBe(491);
  });
  it("keeps navigation available when no control exists or in landscape", () => {
    const placed = placeTutorialPanel(null, 667, 375, 600);
    expect(placed.y).toBe(16);
    expect(placed.maxHeight).toBe(343);
  });
});
