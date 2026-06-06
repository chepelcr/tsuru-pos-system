import { IconPill } from "@/components/common/IconPill";

interface DrawerHeaderProps {
  icon: string;
  label: string;
  title: string;
  subtitle?: string;
  iconColor?: string;
  iconBackground?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function DrawerHeader({ icon, label, title, subtitle, iconColor, iconBackground, style, className }: DrawerHeaderProps) {
  return (
    <div className={`mb-5 ${className ?? ""}`} style={style}>
      <div className={`flex items-center gap-3 ${subtitle ? "mb-2" : ""}`}>
        <IconPill
          icon={icon}
          size={38}
          iconSize={16}
          color={iconColor ?? "hsl(var(--primary))"}
          background={iconBackground ?? "hsl(var(--primary) / 0.1)"}
          radius={11}
        />
        <div>
          <small className="t-label uppercase tracking-[0.06em]">{label}</small>
          <h2 className="t-h3 mt-px">{title}</h2>
        </div>
      </div>
      {subtitle && <p className="t-sm mt-1">{subtitle}</p>}
    </div>
  );
}
