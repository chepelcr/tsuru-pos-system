import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchTypeOptions } from "@/hooks/useBranchTypes";
import { FiltersModal } from "@/components/common/FiltersModal";
import { Select, SelectField } from "@/components/ui";

/**
 * Advanced filters for the puestos (branches) list — type + sort.
 * Search, status are kept on the main toolbar (most-used filters).
 */

export interface BranchAdvancedFilters {
  /** Hacienda branch type code. Empty string means "all". */
  type?: string;
  /** Backend orderBy syntax: `>field` (asc) or `<field` (desc). */
  sort?: string;
}

interface Props {
  open: boolean;
  filters: BranchAdvancedFilters;
  onApply: (next: BranchAdvancedFilters) => void;
  onClose: () => void;
}

export function BranchAdvancedFiltersModal({ open, filters, onApply, onClose }: Props) {
  const { t } = useLanguage();
  const typeOptions = useBranchTypeOptions();
  const [local, setLocal] = useState<BranchAdvancedFilters>({ ...filters });
  const patch = (p: Partial<BranchAdvancedFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title={t("common.filters")}
      onClear={() => setLocal({})}
      onApply={() => { onApply(local); onClose(); }}
      applyLabel={t("common.applyFilters")}
    >
      <div className="space-y-1">
        <label htmlFor="filter-branch-type" className="t-label">{t("branchTypes.label")}</label>
        <SelectField
          id="filter-branch-type"
          value={local.type ?? ""}
          onChange={(value) => patch({ type: value || undefined })}
          baseClass="pp-input"
          options={[{ value: "", label: t("common.all"), icon: "layers" },
            ...typeOptions.map((opt) => ({ value: opt.code, label: opt.name, icon: opt.icon || "store" }))]}
        />
      </div>

      <div className="space-y-1">
        <label className="t-label">{t("common.sortBy")}</label>
        <Select
          value={local.sort ?? ""}
          onChange={(e) => patch({ sort: e.target.value || undefined })}
          className="pp-input"
        >
          <option value="">{t("puestos.sortDefault")}</option>
          <option value=">name">{t("puestos.sortNameAsc")}</option>
          <option value="<name">{t("puestos.sortNameDesc")}</option>
          <option value="<created_on">{t("puestos.sortNewest")}</option>
        </Select>
      </div>
    </FiltersModal>
  );
}
