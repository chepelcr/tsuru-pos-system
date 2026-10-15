import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { placeTutorialPanel, type Rect } from "./tutorialModel";

interface Props {
  anchor?: string;
  stepId: string;
  onRoute: boolean;
  onClose: () => void;
  children: (missingTarget: boolean) => ReactNode;
}
interface Geometry {
  target: Rect | null;
  width: number;
  height: number;
  left: number;
  top: number;
  panelHeight: number;
}

/** Render and measure independently of routing, translations and persistence. */
export function TutorialSpotlight({ anchor, stepId, onRoute, onClose, children }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const [geometry, setGeometry] = useState<Geometry>({ target: null,
    width: window.innerWidth, height: window.innerHeight, left: 0, top: 0, panelHeight: 360 });
  useOverlayLayer({ active: true, panelRef, dismissible: true, onClose, lockScroll: false });

  useEffect(() => {
    // The spotlight is a teaching dialog: its transparent cutout is deliberately
    // non-interactive, so Next cannot accidentally submit work underneath it.
    const app = document.getElementById("root");
    const wasInert = app?.inert ?? false;
    if (app) app.inert = true;
    return () => {
      if (app) app.inert = wasInert;
      // The original trigger may have unmounted with its dashboard route.
      queueMicrotask(() => {
        if (document.querySelector("[data-tutorial-overlay]")) return;
        if (!document.activeElement || document.activeElement === document.body) {
          document.querySelector<HTMLElement>('[data-tour="tutorial-replay"]')?.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    let animationFrame = 0;
    let followUntil = performance.now() + 500;
    let observed: HTMLElement | null = null;
    let scrolled: HTMLElement | null = null;
    const viewport = window.visualViewport;
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    if (panelRef.current) resize?.observe(panelRef.current);

    const measure = () => {
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const target = onRoute && anchor
        ? Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)).find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
        }) ?? null : null;
      if (target !== observed) {
        if (observed) resize?.unobserve(observed);
        if (target) resize?.observe(target);
        observed = target;
        if (target) {
          // A lazy page may arrive after the initial animation window ended.
          followUntil = performance.now() + 500;
          if (!animationFrame) animationFrame = requestAnimationFrame(followAnimation);
        }
      }
      if (target && scrolled !== target) {
        // Instant positioning respects reduced motion and keeps cutout/border together.
        target.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "instant" });
        scrolled = target;
      }
      const rect = target?.getBoundingClientRect();
      let highlight: Rect | null = null;
      if (rect && rect.bottom > top && rect.top < top + height && rect.right > left && rect.left < left + width) {
        const x = Math.max(0, rect.left - left - 8);
        const y = Math.max(0, rect.top - top - 8);
        highlight = { x, y,
          width: Math.min(width, rect.right - left + 8) - x,
          height: Math.min(height, rect.bottom - top + 8) - y };
      }
      const next = { target: highlight, width, height, left, top,
        panelHeight: panelRef.current?.getBoundingClientRect().height || 360 };
      setGeometry((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; measure(); });
    }
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => !(record.target instanceof Element) || !record.target.closest("[data-tutorial-overlay]"))) schedule();
    });
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "style", "hidden", "data-tour"] });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    // Follow entry transforms even when they don't trigger a ResizeObserver.
    function followAnimation() {
      animationFrame = 0;
      measure();
      if (performance.now() < followUntil && !animationFrame) animationFrame = requestAnimationFrame(followAnimation);
    }
    measure();
    if (!animationFrame) animationFrame = requestAnimationFrame(followAnimation);
    const copy = panelRef.current?.querySelector<HTMLElement>("[data-tutorial-scroll]");
    if (copy) copy.scrollTop = 0;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(animationFrame);
      mutation.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [anchor, stepId, onRoute]);

  const { target, width, height, left, top, panelHeight } = geometry;
  const placement = placeTutorialPanel(target, width, height, panelHeight);
  const cutout = target
    ? `M ${target.x} ${target.y} h ${target.width} v ${target.height} h ${-target.width} Z` : "";
  return createPortal(
    <div data-tutorial-overlay="" className="tutorial-overlay" style={{ left, top, width, height }}>
      <svg className="tutorial-backdrop" width={width} height={height} aria-hidden="true">
        <path fillRule="evenodd" d={`M 0 0 H ${width} V ${height} H 0 Z ${cutout}`} />
        {/* Capture clicks in the cutout too; no app actions run during teaching. */}
        <rect width={width} height={height} className="tutorial-click-shield" />
      </svg>
      {target && <div aria-hidden="true" className="tutorial-highlight" style={{ left: target.x,
        top: target.y, width: target.width, height: target.height }} />}
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description" tabIndex={-1} data-overlay-autofocus=""
        className="tutorial-panel" style={{ left: placement.x, top: placement.y,
          width: placement.width, maxHeight: placement.maxHeight }}>
        {children(!!anchor && onRoute && !target)}
      </section>
    </div>, document.body,
  );
}
