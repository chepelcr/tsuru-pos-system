interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, action, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        ...style,
      }}
    >
      <div>
        <h2 className="t-h2">{title}</h2>
        {subtitle && <p className="t-sm" style={{ marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
