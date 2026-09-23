import { describe, expect, it, vi } from "vitest";
import {
  PERMISSIONS_CHANGED_KIND,
  asControlEvent,
  emitRealtimeControlEvent,
  onRealtimeControlEvent,
} from "./realtimeBus";

describe("realtimeBus", () => {
  it("recognizes a permissions-changed payload and ignores bell notifications", () => {
    const event = { kind: PERMISSIONS_CHANGED_KIND, organization_id: "o", reason: "role_updated", at: "x" };
    expect(asControlEvent(event)).toEqual(event);
    expect(asControlEvent({ id: "n-1", title: "Documento rechazado" })).toBeNull();
    expect(asControlEvent(null)).toBeNull();
  });

  it("fans out to every listener, survives a throwing one, and unsubscribes", () => {
    const good = vi.fn();
    const off = onRealtimeControlEvent(() => { throw new Error("boom"); });
    const offGood = onRealtimeControlEvent(good);

    emitRealtimeControlEvent({ kind: "reconnected" });
    expect(good).toHaveBeenCalledWith({ kind: "reconnected" });

    off();
    offGood();
    emitRealtimeControlEvent({ kind: "reconnected" });
    expect(good).toHaveBeenCalledTimes(1);
  });
});
