import { Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Terminal, BranchStatus } from "@/types";

const STATUS_VARIANT: Record<BranchStatus, "success" | "secondary" | "destructive"> = {
  1: "success", 2: "secondary", 3: "destructive",
};

interface TerminalRowProps {
  terminal: Terminal;
  isLast: boolean;
}

export function TerminalRow({ terminal, isLast }: TerminalRowProps) {
  const { t } = useLanguage();
  const STATUS_LABEL: Record<BranchStatus, string> = { 1: t("common.active"), 2: t("common.inactive"), 3: t("common.delete") };
  const isActive = terminal.status === 1;
  const lastSeen = terminal.last_seen_at
    ? new Date(terminal.last_seen_at).toLocaleString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 ${isLast ? "" : "border-b border-border/40"}`}>
      <span className={`status-dot status-dot-${isActive ? "success" : "warning"} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[7px] flex-wrap">
          <span className="text-[13px] font-bold">{terminal.name}</span>
          <span className="font-mono text-[10px] font-semibold bg-muted px-1.5 py-px rounded tracking-[0.05em]">
            {terminal.code}
          </span>
        </div>
        {lastSeen && <div className="t-xs text-muted-foreground mt-px">{lastSeen}</div>}
        {terminal.device_id && (
          <div className="t-xs text-muted-foreground mt-px font-mono">
            {terminal.device_id}
          </div>
        )}
      </div>
      <Badge variant={STATUS_VARIANT[terminal.status]}>{STATUS_LABEL[terminal.status]}</Badge>
    </div>
  );
}
