import { cn } from "@/lib/utils";

interface AnalyticsTableProps {
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 11,
  color: "var(--muted)",
  fontFamily: "'Barlow', system-ui",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function AnalyticsTable({ headers, children, emptyMessage }: AnalyticsTableProps) {
  return (
    <div className={cn("bg-surface border border-surface-border rounded-2xl overflow-hidden")}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="border-b border-surface-border">
            {headers.map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children && emptyMessage && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
