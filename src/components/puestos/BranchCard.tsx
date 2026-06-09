import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { Icon, Card, Badge, Menu } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchTypeOptions } from "@/hooks/useBranchTypes";
import { TerminalRow } from "./TerminalRow";
import type { Branch, TerminalListResponse, BranchStatus } from "@/types";

const STATUS_VARIANT: Record<BranchStatus, "success" | "secondary" | "destructive"> = {
  1: "success", 2: "secondary", 3: "destructive",
};

interface BranchCardProps {
  branch: Branch;
  orgId: string;
  onEdit: (b: Branch) => void;
  onStatusChange: (b: Branch, status: BranchStatus) => void;
  onAddTerminal: (b: Branch) => void;
  delay?: number;
}

export function BranchCard({ branch, orgId, onEdit, onStatusChange, onAddTerminal, delay = 0 }: BranchCardProps) {
  const { t } = useLanguage();
  const typeOptions = useBranchTypeOptions();
  const typeOpt = typeOptions.find((o) => o.code === branch.type);
  const typeLabel = typeOpt?.name ?? branch.type;
  const typeIcon = (typeOpt?.icon || "store") as never;
  const STATUS_LABEL: Record<BranchStatus, string> = { 1: t("common.active"), 2: t("common.inactive"), 3: t("common.delete") };
  const [expanded, setExpanded] = useState(false);
  const isActive = branch.status === 1;
  const typeColorClass = typeOpt?.color === "info" ? "text-info" : "text-primary";
  const typeBorderColor = `hsl(var(--${typeOpt?.color === "info" ? "info" : "primary"}))`;

  const { data: terminalsData } = useQuery({
    queryKey: ["terminals", orgId, branch.code],
    enabled: expanded,
    queryFn: () => crossAppApi.get<TerminalListResponse>(crossAppOrgPath(orgId, `/branches/${branch.code}/terminals?page_size=100`)),
  });
  const terminals = terminalsData?.data ?? [];

  const menuItems = [
    { label: t("common.edit"),        icon: "edit",        action: () => onEdit(branch),            hidden: branch.status === 3 },
    { label: t("common.activate"),    icon: "checkCircle", action: () => onStatusChange(branch, 1), hidden: branch.status !== 2, color: "hsl(var(--success))" },
    { label: t("common.deactivate"),  icon: "xCircle",     action: () => onStatusChange(branch, 2), hidden: branch.status !== 1 },
    { label: t("common.delete"),      icon: "trash",       action: () => onStatusChange(branch, 3), hidden: branch.status === 3, color: "hsl(var(--destructive))" },
  ];

  return (
    <FadeIn delay={delay} duration={0.4}>
      <Card
        className={`fade-up !p-0 overflow-hidden border-l-[3px] ${branch.status === 3 ? "opacity-55" : "opacity-100"}`}
        style={{ borderLeftColor: isActive ? typeBorderColor : "hsl(var(--border))" }}
      >
        {/* Header */}
        <div className="px-5 pt-[18px] pb-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`icon-pill w-[38px] h-[38px] flex-shrink-0 ${
                  isActive ? `${typeColorClass} bg-primary/10` : "text-muted-foreground bg-muted"
                }`}
              >
                <Icon name={typeIcon} size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-[7px] flex-wrap">
                  <span className="font-mono text-[11px] font-bold bg-muted px-[7px] py-0.5 rounded tracking-[0.05em]">
                    {branch.code}
                  </span>
                  <Badge variant={STATUS_VARIANT[branch.status]}>{STATUS_LABEL[branch.status]}</Badge>
                </div>
                <div className="text-[15px] font-bold font-display mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {branch.name}
                </div>
              </div>
            </div>
            <Menu items={menuItems} />
          </div>

          <div className="flex items-center gap-3.5 mt-3 flex-wrap">
            <div className="t-xs flex items-center gap-[5px] text-muted-foreground">
              <Icon name={typeIcon} size={12} />
              {typeLabel}
            </div>
            {branch.phone && (
              <div className="t-xs flex items-center gap-[5px] text-muted-foreground">
                <Icon name="smartphone" size={12} />
                {branch.phone}
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Terminals accordion */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 bg-transparent border-0 cursor-pointer font-sans text-foreground"
        >
          <div className="flex items-center gap-2">
            <Icon name="sliders" size={13} className="text-muted-foreground" />
            <span className="t-xs font-semibold">
              Terminales
              {branch.terminals?.length != null && (
                <span className="ml-1.5 bg-muted rounded-full px-[7px] py-px text-[11px] font-bold">
                  {branch.terminals.length}
                </span>
              )}
            </span>
          </div>
          <Icon name={expanded ? "chevronUp" : "chevronDown"} size={14} className="text-muted-foreground" />
        </button>

        {expanded && (
          <div className="fade-up border-t border-border/50 bg-muted/25">
            {terminals.length === 0 ? (
              <div className="px-5 py-4">
                <span className="t-xs text-muted-foreground">{t("puestos.terminals")} — 0</span>
              </div>
            ) : (
              terminals.map((term, i) => <TerminalRow key={term.terminal_id} terminal={term} isLast={i === terminals.length - 1} />)
            )}
            {isActive && (
              <div className="px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => onAddTerminal(branch)}
                  className="btn btn-outline btn-sm w-full !border-dashed"
                >
                  <Icon name="plus" size={13} />
                  {t("puestos.addTerminal")}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </FadeIn>
  );
}
