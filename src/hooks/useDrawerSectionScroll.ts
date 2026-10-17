import { useEffect, type RefObject } from "react";

/** Keep manually opened cards in view after the accordion's layout settles. */
export function useDrawerSectionScroll(bodyRef: RefObject<HTMLDivElement>, active: boolean) {
  useEffect(() => {
    const body = bodyRef.current;
    if (!active || !body) return;

    let request = 0;
    let frame = 0;
    const cancel = () => {
      request += 1;
      window.cancelAnimationFrame(frame);
    };

    const handleClick = (event: MouseEvent) => {
      cancel();
      const header = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("[data-section-toggle]")
        : null;
      // This listener runs before React commits the toggle. Initial hydration,
      // automatic unlocks and closing a card must not move the user's viewport.
      if (!header || header.disabled || header.getAttribute("aria-expanded") !== "false") return;
      const currentRequest = request;

      frame = window.requestAnimationFrame(async () => {
        if (currentRequest !== request || header.getAttribute("aria-expanded") !== "true") return;

        // Flush layout so CSS transitions exist, then wait for both the opening
        // card and collapsing siblings. A fixed delay races CSS/reduced motion.
        header.getBoundingClientRect();
        const animations = Array.from(body.querySelectorAll<HTMLElement>(".section-collapse"))
          .flatMap((section) => section.getAnimations?.() ?? []);
        await Promise.allSettled(animations.map((animation) => animation.finished));

        if (currentRequest !== request || !header.isConnected || header.getAttribute("aria-expanded") !== "true") return;
        const section = header.parentElement!;
        const inset = Number.parseFloat(window.getComputedStyle(body).scrollPaddingTop) || 0;
        const top = Math.max(0, body.scrollTop + section.getBoundingClientRect().top
          - body.getBoundingClientRect().top - body.clientTop - inset);
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        // Scroll only this drawer, preserving the background and parent drawers.
        body.scrollTo({ top, behavior: reduceMotion ? "instant" : "smooth" });
      });
    };

    const interruptions = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    body.addEventListener("click", handleClick);
    interruptions.forEach((type) => body.addEventListener(type, cancel, { passive: true }));
    return () => {
      cancel();
      body.removeEventListener("click", handleClick);
      interruptions.forEach((type) => body.removeEventListener(type, cancel));
    };
  }, [active, bodyRef]);
}
