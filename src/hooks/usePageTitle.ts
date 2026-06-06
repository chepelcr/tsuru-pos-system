import { useEffect } from "react";

const BRAND = "JMarkets POS";

/**
 * Set `document.title` from a list of breadcrumb-style segments.
 * Falsy segments are dropped, so callers can pass `mode === 'edit' && entity.name`
 * inline. The hook restores the previous title on unmount so navigations between
 * pages that don't all call it stay consistent.
 */
export function usePageTitle(
  parts: ReadonlyArray<string | false | null | undefined>,
  enabled: boolean = true,
): void {
  const segments = parts.filter((p): p is string => typeof p === "string" && p.length > 0);
  const title = [BRAND, ...segments].join(" - ");

  useEffect(() => {
    if (!enabled) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title, enabled]);
}
