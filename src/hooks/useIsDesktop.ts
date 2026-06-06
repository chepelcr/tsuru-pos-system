import { useState, useEffect } from "react";

export function useIsDesktop(breakpoint = 1024): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isDesktop;
}
