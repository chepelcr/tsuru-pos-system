import { Icon } from "@/components/ui";

interface DashboardToggleButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function DashboardToggleButton({ collapsed, onClick }: DashboardToggleButtonProps) {
  return (
      <button
        className={`dashboard-sidebar-toggle ${collapsed ? "left-0 hover:left-1.5" : "left-[220px] hover:left-60"}`}
        onClick={onClick}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        <Icon
          name={collapsed ? "chevronRight" : "chevronLeft"}
          size={16}
          className="text-muted-foreground"
        />
      </button>
  );
}
