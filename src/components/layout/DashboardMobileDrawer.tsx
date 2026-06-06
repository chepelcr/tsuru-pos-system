import { useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";

type NavId = "dashboard" | "config" | "puestos" | "productos" | "reporte" | "pos" | "documents" | "clients" | "organization";

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
  useEffect(() => {
    if (open && shouldRender) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-tooltip flex">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-foreground/50 backdrop-blur-[1px] ${
          isClosing ? "drawer-overlay-exit" : "drawer-overlay-enter"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`relative w-[260px] h-[100dvh] z-[101] bg-card shadow-modal flex flex-col overflow-hidden ${
          isClosing ? "drawer-panel-left-exit" : "drawer-panel-left-enter"
        }`}
      >
        <DashboardSidebar active={active} onNav={onNav} onClose={onClose} />
      </div>
    </div>
  );
}
