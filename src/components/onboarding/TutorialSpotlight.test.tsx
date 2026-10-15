import { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { TutorialSpotlight } from "./TutorialSpotlight";

let targetRect = { x: 100, y: 120, width: 100, height: 44 };
let resizeCallbacks: ResizeObserverCallback[];
const onClose = vi.fn();
const rect = ({ x, y, width, height }: typeof targetRect) => ({ x, y, width, height, left: x, top: y,
  right: x + width, bottom: y + height, toJSON() {} });
const tick = async () => { await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(600); }); };

function Spotlight({ anchor = "target", onRoute = true, stepId = "one" }) {
  return <TutorialSpotlight anchor={anchor} onRoute={onRoute} stepId={stepId} onClose={onClose}>
    {(missing) => <>
      <div data-tutorial-scroll=""><h2 id="tutorial-title">Instructions</h2><p id="tutorial-description">{missing ? "Waiting for control" : "Control found"}</p></div>
      <button type="button" onClick={onClose}>Close</button><button type="button">Next</button>
    </>}
  </TutorialSpotlight>;
}
function NestedDialog() {
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayLayer({ active: true, panelRef, dismissible: true, onClose: () => {} });
  return <div role="dialog" ref={panelRef}><button type="button">Nested action</button></div>;
}

beforeEach(() => {
  vi.useFakeTimers(); onClose.mockReset(); resizeCallbacks = [];
  targetRect = { x: 100, y: 120, width: 100, height: 44 };
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resizeCallbacks.push(callback); }
    observe() {} unobserve() {} disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.dataset.tour === "target") return rect(targetRect);
    if (this.classList.contains("tutorial-panel")) return rect({ x: 0, y: 0, width: 380, height: 330 });
    return rect({ x: 0, y: 0, width: 0, height: 0 });
  });
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(document.body);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("live spotlight renderer", () => {
  it("portals outside transformed pages, clips the highlight and scrolls once", async () => {
    const root = document.createElement("div"); root.id = "root"; document.body.append(root);
    const target = document.createElement("button"); target.dataset.tour = "target"; root.append(target);
    const view = render(<Spotlight />, { container: root.appendChild(document.createElement("div")) });
    await tick();
    expect(document.querySelector("[data-tutorial-overlay]")?.parentElement).toBe(document.body);
    expect(root.inert).toBe(true);
    const highlight = document.querySelector<HTMLElement>(".tutorial-highlight")!;
    expect(highlight.style.left).toBe("92px");
    expect(highlight.style.top).toBe("112px");
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    targetRect.y = -10;
    fireEvent.scroll(window); await tick();
    expect(highlight.style.top).toBe("0px");
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    view.unmount(); expect(root.inert).toBe(false); root.remove();
  });
  it("keeps instructions for missing targets and picks up delayed/replaced controls", async () => {
    const view = render(<Spotlight />); await tick();
    expect(screen.getByText("Waiting for control")).toBeTruthy();
    const target = document.createElement("button"); target.dataset.tour = "target"; document.body.append(target);
    await tick(); expect(screen.getByText("Control found")).toBeTruthy();
    target.remove(); await tick(); expect(screen.getByText("Waiting for control")).toBeTruthy();
    const replacement = document.createElement("button"); replacement.dataset.tour = "target"; document.body.append(replacement);
    await tick(); expect(screen.getByText("Control found")).toBeTruthy();
    view.unmount(); replacement.remove();
  });
  it("ignores matching anchors on another route and recovers when returning", async () => {
    const target = document.createElement("button"); target.dataset.tour = "target"; document.body.append(target);
    const view = render(<Spotlight onRoute={false} />); await tick();
    expect(document.querySelector(".tutorial-highlight")).toBeNull();
    view.rerender(<Spotlight onRoute />); await tick();
    expect(document.querySelector(".tutorial-highlight")).not.toBeNull();
    view.unmount(); target.remove();
  });
  it("follows entry animations even when the target arrives after the initial 500ms", async () => {
    const view = render(<Spotlight />); await tick();
    const target = document.createElement("button"); target.dataset.tour = "target"; document.body.append(target);
    await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(32); });
    targetRect.y = 220; // A CSS transform changes position without a resize/mutation.
    act(() => vi.advanceTimersByTime(48));
    expect(document.querySelector<HTMLElement>(".tutorial-highlight")!.style.top).toBe("212px");
    view.unmount(); target.remove();
  });
  it("remeasures nested scroll and resize without repeatedly scrolling the target", async () => {
    const container = document.createElement("div");
    const target = document.createElement("button"); target.dataset.tour = "target"; container.append(target); document.body.append(container);
    const view = render(<Spotlight />); await tick();
    targetRect.x = 200; fireEvent.scroll(container); await tick();
    expect(document.querySelector<HTMLElement>(".tutorial-highlight")!.style.left).toBe("192px");
    targetRect.width = 180;
    act(() => resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver))); await tick();
    expect(document.querySelector<HTMLElement>(".tutorial-highlight")!.style.width).toBe("196px");
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    view.unmount(); container.remove();
  });
  it("focuses each step, wraps Tab and Shift+Tab, and dismisses with Escape", async () => {
    const view = render(<Spotlight />); await tick();
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    screen.getByRole("button", { name: "Next" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
    const copy = document.querySelector<HTMLElement>("[data-tutorial-scroll]")!;
    copy.scrollTop = 100;
    view.rerender(<Spotlight stepId="two" />); await tick();
    expect(copy.scrollTop).toBe(0);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    fireEvent.keyDown(document, { key: "Escape" }); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("lets a newer dialog handle Escape and cleans up scheduled work", async () => {
    const view = render(<><Spotlight /><NestedDialog /></>); await tick();
    fireEvent.keyDown(document, { key: "Escape" }); expect(onClose).not.toHaveBeenCalled();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });
});
