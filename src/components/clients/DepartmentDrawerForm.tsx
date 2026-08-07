import { useState, useEffect } from "react";
import { Drawer, Button } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Department, DepartmentRequestDto } from "@/types";

interface DepartmentDrawerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: DepartmentRequestDto) => Promise<void>;
  department?: Department | null;
  saving?: boolean;
}

function buildForm(dept?: Department | null): DepartmentRequestDto {
  return {
    department_code: dept?.department_code ?? "",
    name: dept?.name ?? "",
    supplier_code: dept?.supplier_code ?? "",
  };
}

export function DepartmentDrawerForm({
  open,
  onClose,
  onSubmit,
  department,
  saving,
}: DepartmentDrawerFormProps) {
  const { t } = useLanguage();
  const isEdit = !!department;
  const [form, setForm] = useState<DepartmentRequestDto>(() => buildForm(department));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildForm(department));
      setError(null);
    }
  }, [open, department]);

  const patch = (next: Partial<DepartmentRequestDto>) => setForm((prev) => ({ ...prev, ...next }));

  async function handleSave() {
    if (!form.department_code?.trim()) {
      setError(t("departments.validation.departmentCodeRequired"));
      return;
    }
    setError(null);
    const dto: DepartmentRequestDto = {
      department_code: form.department_code.trim(),
      ...(form.name?.trim() && { name: form.name.trim() }),
      ...(form.supplier_code?.trim() && { supplier_code: form.supplier_code.trim() }),
    };
    try {
      await onSubmit(dto);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={isEdit ? t("departments.editDepartment") : t("departments.addDepartment")}
      subtitle={isEdit ? department?.department_code : undefined}
      icon="layers"
      width={460}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="p-5 flex flex-col gap-4">
        <FormField label={t("departments.fields.departmentCode")} required>
          <input
            className="pp-input w-full"
            value={form.department_code ?? ""}
            onChange={(e) => patch({ department_code: e.target.value })}
            placeholder={t("departments.fields.departmentCodePlaceholder")}
          />
        </FormField>

        <FormField label={t("common.name")}>
          <input
            className="pp-input w-full"
            value={form.name ?? ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t("departments.fields.namePlaceholder")}
          />
        </FormField>

        <FormField label={t("departments.fields.supplierCode")}>
          <input
            className="pp-input w-full"
            value={form.supplier_code ?? ""}
            onChange={(e) => patch({ supplier_code: e.target.value })}
            placeholder={t("departments.fields.supplierCodePlaceholder")}
          />
        </FormField>

        {error && (
          <div className="px-3 py-2.5 bg-destructive/[0.08] rounded-lg text-xs text-destructive border border-destructive/20">
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}
