import { cn } from "@/lib/utils";

interface AnalyticsTableProps {
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
}

export function AnalyticsTable({ headers, children, emptyMessage }: AnalyticsTableProps) {
  return (
    <div className={cn("bg-surface border border-surface-border rounded-2xl overflow-hidden")}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-border">
            {headers.map((h) => (
              <th key={h} className="pp-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!children && emptyMessage && (
        <div className="px-8 py-8 text-center text-[13px] text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
