interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, action, style }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3" style={style}>
      <div>
        <h2 className="t-h2">{title}</h2>
        {subtitle && <p className="t-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
