import { Card, Menu } from "@/components/ui";
import type { MenuItem } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Department } from "@/types";

interface DepartmentCardProps {
  department: Department;
  onEdit: (dept: Department) => void;
  onDelete: (departmentId: string) => void;
  delay?: number;
}

export function DepartmentCard({ department, onEdit, onDelete, delay = 0 }: DepartmentCardProps) {
  const { t } = useLanguage();

  const menuItems: MenuItem[] = [
    { label: t("common.edit"), icon: "edit", action: () => onEdit(department) },
    {
      label: t("common.delete"),
      icon: "trash",
      color: "hsl(var(--destructive))",
      action: () => onDelete(department.department_id),
    },
  ];

  return (
    <Card className="card-hover px-4 py-3.5 fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="t-num text-sm font-bold text-foreground">{department.department_code}</span>
          {department.name && (
            <p className="t-sm text-foreground mt-0.5 truncate">{department.name}</p>
          )}
          {department.supplier_code && (
            <p className="t-xs text-muted-foreground mt-0.5">
              {t("departments.fields.supplierCode")}: {department.supplier_code}
            </p>
          )}
        </div>

        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Menu align="right" items={menuItems} />
        </div>
      </div>
    </Card>
  );
}
