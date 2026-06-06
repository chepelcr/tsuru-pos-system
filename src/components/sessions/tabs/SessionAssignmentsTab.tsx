import { Card, Icon, Badge } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Assignment } from "@/types";

interface SessionAssignmentsTabProps {
  assignments: Assignment[];
  isLoading: boolean;
}

function getUserDisplayName(a: Assignment): string {
  if (a.user?.first_name || a.user?.last_name) {
    return `${a.user.first_name ?? ""} ${a.user.last_name ?? ""}`.trim();
  }
  return a.user?.email ?? a.user_id.slice(0, 8);
}

export function SessionAssignmentsTab({ assignments, isLoading }: SessionAssignmentsTabProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return <div className="t-sm text-muted-foreground text-center p-8">{t("common.loading")}</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center p-10">
        <div className="icon-pill icon-pill-lg mx-auto mb-3 bg-muted/30 text-muted-foreground w-14 h-14">
          <Icon name="users" size={24} />
        </div>
        <div className="t-sm text-muted-foreground">Sin asignaciones</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid gap-2.5">
        {assignments.map((a) => (
          <Card key={a.assignment_id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="icon-pill w-10 h-10 bg-primary/10 text-primary flex-shrink-0">
                <Icon name="user" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{getUserDisplayName(a)}</div>
                <div className="t-xs text-muted-foreground">{a.branch_id?.slice(0, 8)}…</div>
              </div>
              <div className="flex gap-1.5 items-center flex-shrink-0">
                <Badge variant={a.role === "supervisor" ? "warning" : "secondary"}>
                  {a.role === "supervisor" ? "Supervisor" : "Cajero"}
                </Badge>
                <Badge variant={a.status === 1 ? "success" : "secondary"}>
                  {a.status === 1 ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
