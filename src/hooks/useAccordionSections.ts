import { useState } from 'react';

/** Section expansion with accordion semantics on MANUAL toggle:
 *  - clicking a collapsed section opens it and collapses all siblings
 *  - clicking the open section just closes it
 *  `setExpanded` is exposed so data-driven effects can still open multiple sections. */
export function useAccordionSections<K extends string>(initial: Record<K, boolean>) {
  const [expanded, setExpanded] = useState<Record<K, boolean>>(initial);
  const toggle = (key: K) =>
    setExpanded((prev) => {
      if (prev[key]) return { ...prev, [key]: false };
      const next = { ...prev };
      (Object.keys(next) as K[]).forEach((k) => { next[k] = k === key; });
      return next;
    });
  return { expanded, setExpanded, toggle };
}
