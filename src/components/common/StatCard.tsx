import { IconPill } from "./IconPill";

interface StatCardProps {
  icon: string;
  iconColor?: string;
  iconBackground?: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function StatCard({ icon, iconColor, iconBackground, label, value, sub, style, className }: StatCardProps) {
  return (
    <div className={`card card-stat ${className ?? ""}`} style={style}>
      <IconPill
        icon={icon}
        size={40}
        iconSize={18}
        color={iconColor}
        background={iconBackground ?? "hsl(var(--primary) / 0.1)"}
        radius={11}
      />
      <div className="flex-1 min-w-0">
        <div className="t-label mb-1">{label}</div>
        <div className="t-stat">{value}</div>
        {sub && <div className="t-xs mt-0.5 text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
