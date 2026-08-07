import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface OverlayPortalProps {
  children: ReactNode;
}

/** Render viewport overlays outside animated/scrolled page containers. */
export function OverlayPortal({ children }: OverlayPortalProps) {
  return createPortal(children, document.body);
}
