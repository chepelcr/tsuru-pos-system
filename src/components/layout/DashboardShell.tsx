import { useState, useEffect, useRef } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardMobileDrawer } from "./DashboardMobileDrawer";
import { DocumentsMobileDrawer } from "./DocumentsMobileDrawer";
import { DashboardToggleButton } from "./DashboardToggleButton";
import { useUIStore } from "@/store/uiStore";

type NavId = "dashboard" | "config" | "puestos" | "productos" | "categories" | "reporte" | "documents" | "clients" | "orders" | "confirmations" | "members" | "roles" | "organization" | "content" | "gallery" | "templates" | "deployments" | "profile";

interface DashboardShellProps {
  children: React.ReactNode;
  active?: NavId;
  onNav?: (id: NavId) => void;
  sessionName?: string;
  sessionLocation?: string;
}

function useDrawerState() {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  return { open, isClosing, shouldRender, setOpen };
}

export default function DashboardShell({
  children,
  active = "dashboard",
  onNav,
  sessionName,
  sessionLocation,
}: DashboardShellProps) {
  const left = useDrawerState();
  const right = useDrawerState();

  // Sidebar collapsed lives in a shared store so DocumentsToolbar can adjust
  // the visible-tabs cap (2 vs 3) based on the available horizontal space.
  const sidebarCollapsed = useUIStore((s) => s.sidebar_collapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const pendingNavRef = useRef<NavId | null>(null);

  useEffect(() => {
    if (!left.open && !left.shouldRender && pendingNavRef.current) {
      onNav?.(pendingNavRef.current);
      pendingNavRef.current = null;
    }
  }, [left.open, left.shouldRender, onNav]);

  const handleNav = (id: NavId) => {
    if (left.open && !left.isClosing) {
      pendingNavRef.current = id;
      left.setOpen(false);
    } else {
      onNav?.(id);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="dashboard-sidebar-full sticky top-0 h-screen flex-shrink-0 overflow-hidden z-50 bg-card transition-[width] duration-[250ms] ease-out"
        style={{ width: sidebarCollapsed ? 0 : 240, display: "none" }}
      >
        <DashboardSidebar active={active} onNav={handleNav} />
      </div>

      <DashboardToggleButton
        collapsed={sidebarCollapsed}
        onClick={toggleSidebar}
      />

      <DashboardMobileDrawer
        open={left.open}
        isClosing={left.isClosing}
        shouldRender={left.shouldRender}
        active={active}
        onNav={handleNav}
        onClose={() => left.setOpen(false)}
      />

      <DocumentsMobileDrawer
        open={right.open}
        isClosing={right.isClosing}
        shouldRender={right.shouldRender}
        onClose={() => right.setOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          onMenuClick={() => left.setOpen(true)}
          onDocsClick={() => right.setOpen(!right.open)}
          docsOpen={right.open}
          sessionName={sessionName}
          sessionLocation={sessionLocation}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
