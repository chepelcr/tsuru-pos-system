import { useEffect, useRef, type RefObject } from "react";

const overlayStack: symbol[] = [];

let bodyLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.paddingRight = originalBodyPaddingRight;
  }
}

interface UseOverlayLayerOptions {
  active: boolean;
  panelRef: RefObject<HTMLElement>;
  dismissible: boolean;
  onClose: () => void;
}

/**
 * Coordinates nested overlays: body locking, topmost-only dismissal, focus
 * trapping, and focus restoration.
 */
export function useOverlayLayer({
  active,
  panelRef,
  dismissible,
  onClose,
}: UseOverlayLayerOptions) {
  const idRef = useRef(Symbol("overlay"));
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  closeRef.current = onClose;
  dismissibleRef.current = dismissible;

  const isTopLayer = () => overlayStack[overlayStack.length - 1] === idRef.current;

  useEffect(() => {
    if (!active) return;

    const id = idRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    overlayStack.push(id);
    lockBodyScroll();

    const focusFrame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || !isTopLayer()) return;
      const preferred = panel.querySelector<HTMLElement>("[data-overlay-autofocus]");
      const first = preferred ?? panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopLayer()) return;

      if (event.key === "Escape" && dismissibleRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !panel.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      const index = overlayStack.lastIndexOf(id);
      if (index >= 0) overlayStack.splice(index, 1);
      unlockBodyScroll();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, panelRef]);

  return { isTopLayer };
}
