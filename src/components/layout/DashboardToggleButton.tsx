import { Icon } from "@/components/ui";

interface DashboardToggleButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function DashboardToggleButton({ collapsed, onClick }: DashboardToggleButtonProps) {
  return (
    <>
      <button
        className="dashboard-sidebar-toggle"
        onClick={onClick}
        style={{ left: collapsed ? 0 : 220 }}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        <Icon
          name={collapsed ? "chevronRight" : "chevronLeft"}
          size={16}
          className="text-muted-foreground"
        />
      </button>

      <style>{`
        .dashboard-sidebar-toggle:hover {
          left: ${collapsed ? '6' : '240'}px !important;
          background: hsl(var(--accent)) !important;
        }
      `}</style>
    </>
  );
}
