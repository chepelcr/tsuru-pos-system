import { Icon } from "@/components/ui";

interface DashboardToggleButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function DashboardToggleButton({ collapsed, onClick }: DashboardToggleButtonProps) {
  return (
      <button
        // The handle is 28px wide and deliberately sits half-tucked, so it
        // reads as a pull-tab rather than a floating chip.
        //
        // Expanded: left-220 against a w-60 (240px) sidebar leaves ~8px proud
        // of the panel edge. Collapsed there is no panel to tuck behind, so
        // left-0 showed the whole tab — the two states looked like different
        // controls. -left-5 tucks it off the viewport edge by the same 20px,
        // so the same 8px peeks in both states. Hover pulls it fully clear
        // either way.
        className={`dashboard-sidebar-toggle ${collapsed ? "-left-5 hover:left-0" : "left-[220px] hover:left-60"}`}
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
