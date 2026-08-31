import { useRef } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { DashboardSidebar } from "./DashboardSidebar";

import type { NavId } from "./navIds";

interface DashboardMobileDrawerProps {
  open: boolean;
  isClosing: boolean;
  shouldRender: boolean;
  active: NavId;
  onNav: (id: NavId) => void;
  onClose: () => void;
}

export function DashboardMobileDrawer({
  open,
  isClosing,
  shouldRender,
  active,
  onNav,
  onClose,
}: DashboardMobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { isTopLayer } = useOverlayLayer({
    active: shouldRender,
    panelRef,
    dismissible: open && !isClosing,
    onClose,
  });

  if (!shouldRender) return null;

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-drawer flex">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-foreground/50 backdrop-blur-[1px] ${
          isClosing ? "drawer-overlay-exit" : "drawer-overlay-enter"
        }`}
        onClick={() => { if (isTopLayer()) onClose(); }}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative w-[260px] h-[100dvh] z-drawer bg-card shadow-modal flex flex-col overflow-hidden ${
          isClosing ? "drawer-panel-left-exit" : "drawer-panel-left-enter"
        }`}
      >
        <DashboardSidebar active={active} onNav={onNav} onClose={onClose} />
      </div>
    </div>
    </OverlayPortal>
  );
}
